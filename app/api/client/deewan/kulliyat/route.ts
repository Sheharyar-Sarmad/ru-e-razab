// app/api/client/deewan/kulliyat/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import GhazalModel from "@/models/kalam/ghazals.model";
import QataModel from "@/models/kalam/qata.model";
import ShairModel from "@/models/kalam/shair.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

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

const TTL = {
  SOFT_MS: 2 * 60 * 1000,   // 2 min
  HARD_MS: 15 * 60 * 1000,  // 15 min
};

/* =========================================================
   HELPERS
========================================================= */
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function extractFirstLine(content: any, type: KalamType): string {
  try {
    if (type === "nazm") return content?.[0]?.shairs?.[0]?.lines?.[0] ?? "";
    if (type === "shair") return Array.isArray(content) ? content[0] ?? "" : "";
    return content?.[0]?.lines?.[0] ?? "";
  } catch {
    return "";
  }
}

/* Only fetch the minimum needed for a card */
const PROJECTION = {
  slug: 1,
  unwan: 1,
  takhallus: 1,
  category: 1,
  coverImage: 1,
  createdAt: 1,
  "content.lines": { $slice: 1 },
  "content.shairs.lines": { $slice: 1 },
};

/* =========================================================
   FETCH ONE COLLECTION — always limited, never full scan
========================================================= */
async function fetchCollection(
  model: any,
  type: KalamType,
  search: string,
  limit: number
) {
  const filter: Record<string, any> = {};
  if (search && search.length >= 2) {
    const rx = new RegExp(escapeRegex(search), "i");
    if (type === "nazm") {
      filter.$or = [{ unwan: rx }, { "content.shairs.lines": rx }, { category: rx }];
    } else if (type === "shair") {
      filter.$or = [{ content: rx }, { category: rx }];
    } else {
      filter.$or = [{ "content.lines": rx }, { category: rx }];
    }
  }

  const docs = await model
    .find(filter)
    .select(PROJECTION)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .maxTimeMS(6000);

  return docs.map((doc: any) => ({
    _id: String(doc._id),
    type,
    typeDisplayUrdu: TYPE_URDU[type],
    title: type === "nazm" ? doc.unwan || "Untitled" : TYPE_URDU[type],
    slug: doc.slug,
    firstLine: extractFirstLine(doc.content, type),
    category: doc.category || [],
    coverImage: doc.coverImage || "",
    likesCount: Array.isArray(doc.likes) ? doc.likes.length : 0,
    commentsCount: Array.isArray(doc.comments) ? doc.comments.length : 0,
    createdAt: doc.createdAt,
  }));
}

/* =========================================================
   CORE FETCH
========================================================= */
async function fetchKulliyat(page: number, limit: number, type: string, search: string) {
  await ensureDb();

  const wantAll = !type || type === "all";
  const perType = Math.min(page * limit + 4, 60);

  const tasks: Promise<any[]>[] = [];
  if (wantAll || type === "ghazal")
    tasks.push(fetchCollection(GhazalModel, "ghazal", search, perType));
  else tasks.push(Promise.resolve([]));

  if (wantAll || type === "nazm")
    tasks.push(fetchCollection(NazmModel, "nazm", search, perType));
  else tasks.push(Promise.resolve([]));

  if (wantAll || type === "qata")
    tasks.push(fetchCollection(QataModel, "qata", search, perType));
  else tasks.push(Promise.resolve([]));

  if (wantAll || type === "shair")
    tasks.push(fetchCollection(ShairModel, "shair", search, perType));
  else tasks.push(Promise.resolve([]));

  const [ghazals, nazms, qatas, shairs] = await Promise.all(tasks);

  const merged = [...ghazals, ...nazms, ...qatas, ...shairs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = merged.length;
  const start = (page - 1) * limit;
  const paginated = merged.slice(start, start + limit);

  return {
    poetry: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: start + limit < total,
      hasPrev: page > 1,
      showing: total === 0 ? "0 of 0" : `${start + 1}–${Math.min(start + limit, total)} of ${total}`,
    },
    stats: {
      total,
      byType: {
        ghazal: ghazals.length,
        nazm: nazms.length,
        qata: qatas.length,
        shair: shairs.length,
      },
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
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "9", 10)));
    const type = (searchParams.get("type") || "").trim();
    const search = (searchParams.get("search") || "").trim();

    const key = `kulliyat:${page}:${limit}:${type}:${search}`;

    // Fresh
    const hit = cache.get(key);
    if (hit && !hit.isStale) {
      return NextResponse.json(
        { success: true, message: "Kulliyat (cached)", data: hit.value, err: null, status: HTTP_STATUS.OK },
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

    // Stale → serve + refresh in background
    if (hit && hit.isStale) {
      if (!inflight.has(key)) {
        const p = fetchKulliyat(page, limit, type, search)
          .then((fresh) => cache.set(key, fresh, TTL.SOFT_MS, TTL.HARD_MS))
          .catch(() => {})
          .finally(() => inflight.delete(key));
        inflight.set(key, p);
      }
      return NextResponse.json(
        { success: true, message: "Kulliyat (stale)", data: hit.value, err: null, status: HTTP_STATUS.OK },
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
      return NextResponse.json({ success: true, message: "Kulliyat", data: fresh, err: null, status: HTTP_STATUS.OK });
    }

    // Cold
    const p = fetchKulliyat(page, limit, type, search);
    inflight.set(key, p);
    let data;
    try {
      data = await p;
      cache.set(key, data, TTL.SOFT_MS, TTL.HARD_MS);
    } finally {
      inflight.delete(key);
    }

    return NextResponse.json(
      { success: true, message: "Kulliyat", data, err: null, status: HTTP_STATUS.OK },
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
    console.error("Kulliyat:", error?.message);
    const isConn =
      error?.name?.includes("Mongo") || error?.name === "MongooseServerSelectionError";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch kulliyat",
        data: null,
        err: isConn ? "DB_UNAVAILABLE" : "FETCH_ERROR",
        status: isConn ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: isConn ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "purge") {
    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  }
  cache.clear();
  inflight.clear();
  return NextResponse.json({ success: true, message: "Purged" });
}