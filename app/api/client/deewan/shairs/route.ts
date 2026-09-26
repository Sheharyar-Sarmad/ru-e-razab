// app/api/client/deewan/shairs/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import ShairModel from "@/models/kalam/shair.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   LRU CACHE
========================================================= */
interface Entry {
  value: any;
  expiresAt: number;
  staleAt: number;
}
class LRU {
  private map = new Map<string, Entry>();
  constructor(private max = 300) {}
  get(k: string) {
    const e = this.map.get(k);
    if (!e) return null;
    const now = Date.now();
    if (now > e.expiresAt) {
      this.map.delete(k);
      return null;
    }
    this.map.delete(k);
    this.map.set(k, e);
    return { value: e.value, isStale: now > e.staleAt };
  }
  set(k: string, v: any, softMs: number, hardMs: number) {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    const now = Date.now();
    this.map.set(k, { value: v, staleAt: now + softMs, expiresAt: now + hardMs });
  }
  clear() {
    this.map.clear();
  }
}

const cache = new LRU(300);
const inflight = new Map<string, Promise<any>>();
const TTL = { SOFT_MS: 2 * 60 * 1000, HARD_MS: 15 * 60 * 1000 };

/* =========================================================
   HELPERS
========================================================= */
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Shair.content is a flat [String, String] array */
const PROJECTION = {
  takhallus: 1,
  slug: 1,
  category: 1,
  coverImage: 1,
  createdAt: 1,
  likes: 1,
  comments: 1,
  content: 1,
};

function extractFirstLine(content: any): string {
  try {
    return Array.isArray(content) ? content[0] ?? "" : "";
  } catch {
    return "";
  }
}

/* =========================================================
   CORE FETCH
========================================================= */
async function fetchShairs(page: number, limit: number, search: string) {
  await ensureDb();

  const filter: Record<string, any> = {};
  if (search && search.length >= 2) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ content: rx }, { category: rx }, { takhallus: rx }];
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ShairModel.find(filter)
      .select(PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(6000),
    ShairModel.countDocuments(filter).maxTimeMS(6000),
  ]);

  const poetry = docs.map((doc: any) => ({
    _id: String(doc._id),
    type: "shair" as const,
    typeDisplayUrdu: "شعر",
    title: "شعر",
    slug: doc.slug,
    firstLine: extractFirstLine(doc.content),
    category: doc.category || [],
    coverImage: doc.coverImage || "",
    likesCount: Array.isArray(doc.likes) ? doc.likes.length : 0,
    commentsCount: Array.isArray(doc.comments) ? doc.comments.length : 0,
    createdAt: doc.createdAt,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    poetry,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      showing:
        total === 0
          ? "0 of 0"
          : `${skip + 1}–${Math.min(skip + limit, total)} of ${total}`,
    },
    stats: {
      total,
      byType: { ghazal: 0, nazm: 0, qata: 0, shair: total },
    },
  };
}

/* =========================================================
   GET
========================================================= */
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      30,
      Math.max(1, parseInt(searchParams.get("limit") || "6", 10))
    );
    const search = (searchParams.get("search") || "").trim();

    const key = `shairs:v2:${page}:${limit}:${search}`;

    // Fresh
    const hit = cache.get(key);
    if (hit && !hit.isStale) {
      return NextResponse.json(
        {
          success: true,
          message: "Shairs (cached)",
          data: hit.value,
          err: null,
          status: HTTP_STATUS.OK,
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
            "x-cache": "HIT",
            "x-time": `${Date.now() - t0}ms`,
          },
        }
      );
    }

    // Stale → serve + refresh
    if (hit && hit.isStale) {
      if (!inflight.has(key)) {
        const p = fetchShairs(page, limit, search)
          .then((fresh) => cache.set(key, fresh, TTL.SOFT_MS, TTL.HARD_MS))
          .catch(() => {})
          .finally(() => inflight.delete(key));
        inflight.set(key, p);
      }
      return NextResponse.json(
        {
          success: true,
          message: "Shairs (stale)",
          data: hit.value,
          err: null,
          status: HTTP_STATUS.OK,
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
            "x-cache": "STALE",
            "x-time": `${Date.now() - t0}ms`,
          },
        }
      );
    }

    // Dedupe
    if (inflight.has(key)) {
      const fresh = await inflight.get(key);
      return NextResponse.json({
        success: true,
        message: "Shairs",
        data: fresh,
        err: null,
        status: HTTP_STATUS.OK,
      });
    }

    // Cold
    const p = fetchShairs(page, limit, search);
    inflight.set(key, p);
    let data;
    try {
      data = await p;
      cache.set(key, data, TTL.SOFT_MS, TTL.HARD_MS);
    } finally {
      inflight.delete(key);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Shairs fetched successfully (اشعار حاصل ہوگئے)",
        data,
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
          "x-cache": "MISS",
          "x-time": `${Date.now() - t0}ms`,
        },
      }
    );
  } catch (error: any) {
    console.error("Shairs:", error?.message);
    const isConn =
      error?.name?.includes("Mongo") ||
      error?.name === "MongooseServerSelectionError";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch shairs",
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
      }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "purge") {
    return NextResponse.json(
      { success: false, message: "Unknown action" },
      { status: 400 }
    );
  }
  cache.clear();
  inflight.clear();
  return NextResponse.json({ success: true, message: "Purged" });
}