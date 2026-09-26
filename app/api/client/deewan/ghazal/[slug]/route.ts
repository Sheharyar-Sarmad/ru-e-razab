// app/api/client/deewan/ghazal/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   LRU CACHE — per Node process
   ---------------------------------------------------------
   - maxSize 500: evicts oldest when full
   - soft TTL: 5 min  → serve stale + revalidate in background
   - hard TTL: 30 min → force fresh fetch
========================================================= */
interface CacheEntry<T> {
  value: T;
  staleAt: number;
  expiresAt: number;
}

class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(private maxSize = 500) {}

  get(key: string): { value: T; isStale: boolean } | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Refresh LRU order
    this.map.delete(key);
    this.map.set(key, entry);
    return { value: entry.value, isStale: now > entry.staleAt };
  }

  set(key: string, value: T, softTtlMs: number, hardTtlMs: number) {
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    const now = Date.now();
    this.map.set(key, {
      value,
      staleAt: now + softTtlMs,
      expiresAt: now + hardTtlMs,
    });
  }

  clear() {
    this.map.clear();
  }
}

const cache = new LRUCache<any>(500);

const TTL = {
  SOFT_MS: 5 * 60 * 1000, // 5 min
  HARD_MS: 30 * 60 * 1000, // 30 min
};

/* =========================================================
   IN-FLIGHT DEDUPE
   ---------------------------------------------------------
   100 concurrent requests for the same slug → 1 DB query
   (all others await the same Promise)
========================================================= */
const inflight = new Map<string, Promise<any>>();

/* =========================================================
   PRECOMPILED PROJECTION
   Only fields the client actually renders.
   Note: `content` is intentionally limited — the client
   only ever needs the first couplet for metadata.
========================================================= */
const PROJECTION = {
  takhallus: 1,
  slug: 1,
  content: 1,
  category: 1,
  coverImage: 1,
  coverImageMetadata: 1,
  media: 1,
  metaTitle: 1,
  metaDescription: 1,
  links: 1,
  likes: 1,
  dislikes: 1,
  comments: 1,
  views: 1,
  featured: 1,
  publishedAt: 1,
  createdAt: 1,
  updatedAt: 1,
};

/* =========================================================
   DB CONNECTION — skip await if already connected
========================================================= */
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

/* =========================================================
   CORE FETCH (uncached)
========================================================= */
async function fetchGhazal(slug: string) {
  await ensureDb();

  const doc = await GhazalModel.findOne({ slug })
    .select(PROJECTION)
    .lean()
    .maxTimeMS(5000)
    .exec();

  if (!doc) return null;

  return {
    ghazal: doc,
    responseTime: "fresh",
  };
}

/* =========================================================
   BACKGROUND REVALIDATION
   Fires when serving a stale entry.
========================================================= */
function revalidateInBackground(cacheKey: string, slug: string) {
  if (inflight.has(cacheKey)) return;

  const p = (async () => {
    try {
      const fresh = await fetchGhazal(slug);
      if (fresh) {
        cache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS);
      }
    } catch (err) {
      console.warn("[ghazal] bg revalidate failed:", err);
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, p);
}

/* =========================================================
   GET — the fast path
   ---------------------------------------------------------
   1. Fresh LRU → sub-ms return
   2. Stale LRU → sub-ms return + background refresh
   3. In-flight → await (dedupe)
   4. Cold → hit Mongo
========================================================= */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t0 = Date.now();

  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug is required",
          data: null,
          err: "SLUG_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const cacheKey = `ghazal:v1:${slug}`;

    /* ---------- 1. FRESH LRU HIT ---------- */
    const hit = cache.get(cacheKey);
    if (hit && !hit.isStale) {
      const elapsed = Date.now() - t0;
      return NextResponse.json(
        {
          success: true,
          message: "Ghazal fetched successfully",
          data: hit.value,
          err: null,
          status: HTTP_STATUS.OK,
          meta: {
            source: "cache-fresh",
            responseTimeMs: elapsed,
          },
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=86400",
            "X-Cache": "HIT-FRESH",
            "X-Response-Time": `${elapsed}ms`,
          },
        }
      );
    }

    /* ---------- 2. STALE LRU HIT ---------- */
    if (hit && hit.isStale) {
      revalidateInBackground(cacheKey, slug);
      const elapsed = Date.now() - t0;
      return NextResponse.json(
        {
          success: true,
          message: "Ghazal fetched successfully (stale)",
          data: hit.value,
          err: null,
          status: HTTP_STATUS.OK,
          meta: {
            source: "cache-stale",
            responseTimeMs: elapsed,
          },
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=86400",
            "X-Cache": "HIT-STALE",
            "X-Response-Time": `${elapsed}ms`,
          },
        }
      );
    }

    /* ---------- 3. IN-FLIGHT DEDUPE ---------- */
    const existing = inflight.get(cacheKey);
    if (existing) {
      const data = await existing;
      const elapsed = Date.now() - t0;

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            message: "Ghazal not found",
            data: null,
            err: "GHAZAL_NOT_FOUND",
            status: HTTP_STATUS.NOT_FOUND,
          },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Ghazal fetched successfully (deduped)",
          data,
          err: null,
          status: HTTP_STATUS.OK,
          meta: { source: "inflight", responseTimeMs: elapsed },
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=86400",
            "X-Cache": "INFLIGHT",
            "X-Response-Time": `${elapsed}ms`,
          },
        }
      );
    }

    /* ---------- 4. COLD MISS ---------- */
    const p = (async () => {
      try {
        const fresh = await fetchGhazal(slug);
        if (fresh) {
          cache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS);
        }
        return fresh;
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, p);
    const data = await p;

    /* ---------- NOT FOUND — cache negative result too ---------- */
    if (!data) {
      const elapsed = Date.now() - t0;
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        {
          status: HTTP_STATUS.NOT_FOUND,
          headers: {
            "Cache-Control": "public, s-maxage=300",
            "X-Cache": "MISS-404",
            "X-Response-Time": `${elapsed}ms`,
          },
        }
      );
    }

    const elapsed = Date.now() - t0;
    return NextResponse.json(
      {
        success: true,
        message: "Ghazal fetched successfully",
        data,
        err: null,
        status: HTTP_STATUS.OK,
        meta: { source: "db", responseTimeMs: elapsed },
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Cache": "MISS",
          "X-Response-Time": `${elapsed}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error("Public Ghazal Error:", error);

    const isConn =
      error?.name === "MongoServerSelectionError" ||
      error?.name === "MongoNetworkError" ||
      error?.name === "MongooseServerSelectionError";

    return NextResponse.json(
      {
        success: false,
        message: isConn
          ? "Database temporarily unavailable — please retry"
          : "Failed to fetch ghazal",
        data: null,
        err: isConn ? "DB_UNAVAILABLE" : "FETCH_ERROR",
        status: isConn
          ? HTTP_STATUS.SERVICE_UNAVAILABLE
          : HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      {
        status: isConn
          ? HTTP_STATUS.SERVICE_UNAVAILABLE
          : HTTP_STATUS.INTERNAL_SERVER_ERROR,
        headers: { "Retry-After": "5" },
      }
    );
  }
}

/* =========================================================
   PURGE — call this after admin updates a ghazal
   ---------------------------------------------------------
   POST /api/client/deewan/ghazal/[slug]?action=purge
========================================================= */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "purge") {
    return NextResponse.json(
      { success: false, message: "Unknown action", err: "BAD_ACTION" },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const { slug } = await params;
  const cacheKey = `ghazal:v1:${slug}`;
  cache.clear();
  inflight.delete(cacheKey);

  return NextResponse.json({
    success: true,
    message: "Cache purged",
    data: { cleared: cacheKey },
    err: null,
    status: HTTP_STATUS.OK,
  });
}