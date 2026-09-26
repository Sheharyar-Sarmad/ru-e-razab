// app/api/client/deewan/search-kulliyat/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import NazmModel from "@/models/kalam/nazm.model";
import QataModel from "@/models/kalam/qata.model";
import ShairModel from "@/models/kalam/shair.model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_LABELS_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

interface SearchHit {
  _id: string;
  type: KalamType;
  typeDisplayUrdu: string;
  title: string;
  slug: string;
  href: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  views: number;
  createdAt: Date;
}

interface CachedPayload {
  query: string;
  filters: {
    type: string | null;
    category: string | undefined;
    takhallus: string | undefined;
    featured: boolean | undefined;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
  results: SearchHit[];
}

/* =========================================================
   IN-MEMORY LRU CACHE (single-process, ultra-fast)
========================================================= */

interface LRUEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
}

class LRUCache<T> {
  private cache = new Map<string, LRUEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): { value: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { value: entry.value, isStale: now > entry.staleAt };
  }

  peek(key: string): LRUEntry<T> | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: T, softTtlMs: number, hardTtlMs: number) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    const now = Date.now();
    this.cache.set(key, {
      value,
      staleAt: now + softTtlMs,
      expiresAt: now + hardTtlMs,
    });
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const memoryCache = new LRUCache<CachedPayload>(1000);

/* =========================================================
   PRECOMPILED REGEX CACHE
   Regex compilation is one of the biggest CPU costs in
   a search endpoint. Cache them by raw query string.
========================================================= */

const regexCache = new Map<string, RegExp>();
const REGEX_CACHE_MAX = 500;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCachedRegex(query: string): RegExp {
  let rx = regexCache.get(query);
  if (!rx) {
    if (regexCache.size >= REGEX_CACHE_MAX) {
      // Drop oldest
      const firstKey = regexCache.keys().next().value;
      if (firstKey !== undefined) regexCache.delete(firstKey);
    }
    rx = new RegExp(escapeRegex(query), "i");
    regexCache.set(query, rx);
  }
  return rx;
}

/* =========================================================
   PRECOMPILED FILTER CACHE
   The Mongo filter tree is a deep object. Rebuilding it for
   every request is wasteful. Cache by (q, category, etc).
========================================================= */

type ExtraFilters = {
  category?: string;
  featured?: boolean;
  takhallus?: string;
};

const filterCache = new Map<string, Record<string, unknown>>();
const FILTER_CACHE_MAX = 500;

function filterCacheKey(q: string, extra: ExtraFilters, type: string): string {
  return `${type}|${q}|${extra.category || ""}|${extra.takhallus || ""}|${
    extra.featured === undefined ? "" : extra.featured
  }`;
}

function cacheFilter(
  key: string,
  buildFn: () => Record<string, unknown>
): Record<string, unknown> {
  let cached = filterCache.get(key);
  if (!cached) {
    if (filterCache.size >= FILTER_CACHE_MAX) {
      const firstKey = filterCache.keys().next().value;
      if (firstKey !== undefined) filterCache.delete(firstKey);
    }
    cached = buildFn();
    filterCache.set(key, cached);
  }
  return cached;
}

/* =========================================================
   FILTER BUILDERS (invoked only on cache miss)
========================================================= */

function buildGhazalFilterRaw(q: string | undefined, extra: ExtraFilters) {
  const parts: Record<string, unknown>[] = [];
  if (q) {
    const rx = getCachedRegex(q);
    parts.push({
      $or: [
        { slug: rx },
        { takhallus: rx },
        { category: rx },
        { "content.lines": rx },
      ],
    });
  }
  if (extra.category) parts.push({ category: extra.category });
  if (extra.takhallus) parts.push({ takhallus: extra.takhallus });
  if (extra.featured !== undefined) parts.push({ featured: extra.featured });
  return parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts };
}

function buildNazmFilterRaw(q: string | undefined, extra: ExtraFilters) {
  const parts: Record<string, unknown>[] = [];
  if (q) {
    const rx = getCachedRegex(q);
    parts.push({
      $or: [
        { unwan: rx },
        { slug: rx },
        { takhallus: rx },
        { category: rx },
        { "content.shairs.lines": rx },
      ],
    });
  }
  if (extra.category) parts.push({ category: extra.category });
  if (extra.takhallus) parts.push({ takhallus: extra.takhallus });
  if (extra.featured !== undefined) parts.push({ featured: extra.featured });
  return parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts };
}

function buildQataFilterRaw(q: string | undefined, extra: ExtraFilters) {
  const parts: Record<string, unknown>[] = [];
  if (q) {
    const rx = getCachedRegex(q);
    parts.push({
      $or: [
        { slug: rx },
        { takhallus: rx },
        { category: rx },
        { "content.lines": rx },
      ],
    });
  }
  if (extra.category) parts.push({ category: extra.category });
  if (extra.takhallus) parts.push({ takhallus: extra.takhallus });
  if (extra.featured !== undefined) parts.push({ featured: extra.featured });
  return parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts };
}

function buildShairFilterRaw(q: string | undefined, extra: ExtraFilters) {
  const parts: Record<string, unknown>[] = [];
  if (q) {
    const rx = getCachedRegex(q);
    parts.push({
      $or: [
        { slug: rx },
        { takhallus: rx },
        { category: rx },
        { content: rx },
      ],
    });
  }
  if (extra.category) parts.push({ category: extra.category });
  if (extra.takhallus) parts.push({ takhallus: extra.takhallus });
  if (extra.featured !== undefined) parts.push({ featured: extra.featured });
  return parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts };
}

function getGhazalFilter(q: string | undefined, extra: ExtraFilters) {
  return cacheFilter(filterCacheKey(q || "", extra, "ghazal"), () =>
    buildGhazalFilterRaw(q, extra)
  );
}
function getNazmFilter(q: string | undefined, extra: ExtraFilters) {
  return cacheFilter(filterCacheKey(q || "", extra, "nazm"), () =>
    buildNazmFilterRaw(q, extra)
  );
}
function getQataFilter(q: string | undefined, extra: ExtraFilters) {
  return cacheFilter(filterCacheKey(q || "", extra, "qata"), () =>
    buildQataFilterRaw(q, extra)
  );
}
function getShairFilter(q: string | undefined, extra: ExtraFilters) {
  return cacheFilter(filterCacheKey(q || "", extra, "shair"), () =>
    buildShairFilterRaw(q, extra)
  );
}

/* =========================================================
   QUERY NORMALIZATION
========================================================= */

function normalizeQuery(input: string): string {
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildCacheKey(params: Record<string, string | undefined>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `sk:${sorted}`;
}

/* =========================================================
   PROJECTION (only fields the UI actually renders)
========================================================= */

const PROJECTION = {
  slug: 1,
  unwan: 1,
  takhallus: 1,
  category: 1,
  coverImage: 1,
  createdAt: 1,
  views: 1,
  likes: 1,
  content: 1,
};

/* =========================================================
   FIRST-LINE EXTRACTION
========================================================= */

function extractFirstLine(doc: any, type: KalamType): string {
  try {
    if (type === "nazm")
      return doc?.content?.[0]?.shairs?.[0]?.lines?.[0] ?? "";
    if (type === "shair")
      return Array.isArray(doc?.content) ? doc.content[0] ?? "" : "";
    return doc?.content?.[0]?.lines?.[0] ?? "";
  } catch {
    return "";
  }
}

/* =========================================================
   SEARCH ONE COLLECTION
========================================================= */

async function searchCollection(
  model: any,
  type: KalamType,
  filter: Record<string, unknown>,
  limit: number
): Promise<SearchHit[]> {
  if (!filter || Object.keys(filter).length === 0) return [];

  // .lean() + .select() is fastest path; no hydration, minimal fields
  const docs = await model
    .find(filter)
    .select(PROJECTION)
    .limit(limit)
    .lean();

  const out: SearchHit[] = new Array(docs.length);
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    out[i] = {
      _id: String(doc._id),
      type,
      typeDisplayUrdu: TYPE_LABELS_URDU[type],
      title: doc.unwan || TYPE_LABELS_URDU[type],
      slug: doc.slug,
      href: `/${type}/${doc.slug}`,
      firstLine: extractFirstLine(doc, type),
      category: doc.category || [],
      coverImage: doc.coverImage || "",
      likesCount: Array.isArray(doc.likes) ? doc.likes.length : 0,
      views: doc.views || 0,
      createdAt: doc.createdAt,
    };
  }
  return out;
}

/* =========================================================
   CORE SEARCH WORK
========================================================= */

async function performSearch(
  query: string,
  typeParam: KalamType | null,
  category: string | undefined,
  takhallus: string | undefined,
  featured: boolean | undefined,
  page: number,
  limit: number
): Promise<CachedPayload> {
  const extra: ExtraFilters = { category, featured, takhallus };

  const allTargets = [
    { model: GhazalModel, type: "ghazal" as const, filter: getGhazalFilter(query || undefined, extra) },
    { model: NazmModel, type: "nazm" as const, filter: getNazmFilter(query || undefined, extra) },
    { model: QataModel, type: "qata" as const, filter: getQataFilter(query || undefined, extra) },
    { model: ShairModel, type: "shair" as const, filter: getShairFilter(query || undefined, extra) },
  ];

  const targets = typeParam
    ? allTargets.filter((t) => t.type === typeParam)
    : allTargets;

  const perCollectionLimit = page * limit;

  const results = await Promise.all(
    targets.map((t) => searchCollection(t.model, t.type, t.filter, perCollectionLimit))
  );

  // Merge + sort once (fast in-memory)
  const merged: SearchHit[] = [];
  for (let i = 0; i < results.length; i++) {
    const arr = results[i];
    for (let j = 0; j < arr.length; j++) merged.push(arr[j]);
  }
  merged.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = merged.length;
  const startIdx = (page - 1) * limit;
  const paginated = merged.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < total;

  return {
    query,
    filters: { type: typeParam, category, takhallus, featured },
    pagination: {
      page,
      limit,
      total,
      hasMore,
      totalPages: Math.ceil(total / limit),
    },
    results: paginated,
  };
}

/* =========================================================
   CACHE ORCHESTRATION
========================================================= */

const inflightRequests = new Map<string, Promise<CachedPayload>>();

const TTL = {
  SOFT_MS: 3 * 60 * 1000,   // 3 min → serve stale + revalidate
  HARD_MS: 15 * 60 * 1000,  // 15 min → hard expiry
};

/**
 * Fast path:
 *   1. LRU fresh → return immediately (<1ms)
 *   2. LRU stale → return immediately AND revalidate in background
 *   3. Inflight → await (dedupe)
 *   4. Cold miss → fetch from Mongo, cache, return
 */
async function getOrFetch(
  cacheKey: string,
  fetcher: () => Promise<CachedPayload>
): Promise<{ payload: CachedPayload; source: "lru-fresh" | "lru-stale" | "inflight" | "db"; hit: boolean }> {
  // 1) Fresh LRU hit
  const lruHit = memoryCache.get(cacheKey);
  if (lruHit && !lruHit.isStale) {
    return { payload: lruHit.value, source: "lru-fresh", hit: true };
  }

  // 2) Stale LRU hit → serve stale, kick off background refresh
  if (lruHit && lruHit.isStale) {
    revalidateInBackground(cacheKey, fetcher);
    return { payload: lruHit.value, source: "lru-stale", hit: true };
  }

  // 3) In-flight dedupe
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    const payload = await inflight;
    return { payload, source: "inflight", hit: true };
  }

  // 4) Cold miss → fetch + cache
  const promise = (async () => {
    try {
      const fresh = await fetcher();
      memoryCache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS);
      return fresh;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
  const payload = await promise;
  return { payload, source: "db", hit: false };
}

function revalidateInBackground(
  cacheKey: string,
  fetcher: () => Promise<CachedPayload>
) {
  if (inflightRequests.has(cacheKey)) return;
  const promise = (async () => {
    try {
      const fresh = await fetcher();
      memoryCache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS);
    } catch {
      /* silent */
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();
  inflightRequests.set(cacheKey, promise);
}

/* =========================================================
   DB CONNECTION (skip await if already connected)
========================================================= */

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

/* =========================================================
   GET HANDLER
========================================================= */

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);

    const rawQuery = (searchParams.get("q") || "").trim();
    const query = normalizeQuery(rawQuery);
    const typeParam = searchParams.get("type") as KalamType | null;
    const category = searchParams.get("category") || undefined;
    const takhallus = searchParams.get("takhallus") || undefined;
    const featuredParam = searchParams.get("featured");
    const featured =
      featuredParam === "true"
        ? true
        : featuredParam === "false"
        ? false
        : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );

    // Guards
    if (!query && !category && !takhallus && featured === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Provide at least one search parameter (q, category, takhallus, featured).",
          data: null,
          err: "MISSING_QUERY",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (query && query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Search query must be at least 2 characters.",
          data: null,
          err: "QUERY_TOO_SHORT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const cacheKey = buildCacheKey({
      q: query || undefined,
      type: typeParam || undefined,
      category,
      takhallus,
      featured: featured === undefined ? undefined : String(featured),
      page: String(page),
      limit: String(limit),
    });

    // FAST PATH — if cache already has a fresh entry, skip DB connect entirely
    const peek = memoryCache.peek(cacheKey);
    if (peek && Date.now() < peek.expiresAt) {
      const isStale = Date.now() > peek.staleAt;
      if (!isStale) {
        const elapsed = Date.now() - startTime;
        return NextResponse.json(
          {
            success: true,
            message: `Found ${peek.value.pagination.total} results (${peek.value.pagination.total} نتائج ملے)`,
            data: peek.value,
            err: null,
            status: HTTP_STATUS.OK,
            meta: {
              cached: true,
              source: "lru-fresh",
              responseTimeMs: elapsed,
            },
          },
          {
            status: HTTP_STATUS.OK,
            headers: {
              "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
              "CDN-Cache-Control":
                "public, s-maxage=120, stale-while-revalidate=600",
              "Vercel-CDN-Cache-Control":
                "public, s-maxage=120, stale-while-revalidate=600",
              "x-cache-source": "lru-fresh",
              "x-cache-hit": "1",
              "x-response-time": `${elapsed}ms`,
              Vary: "Accept-Encoding",
            },
          }
        );
      }
    }

    // SLOW PATH — need DB
    await ensureDb();

    const fetcher = () =>
      performSearch(query, typeParam, category, takhallus, featured, page, limit);

    const { payload, source, hit } = await getOrFetch(cacheKey, fetcher);

    const elapsed = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: `Found ${payload.pagination.total} results (${payload.pagination.total} نتائج ملے)`,
        data: payload,
        err: null,
        status: HTTP_STATUS.OK,
        meta: {
          cached: hit,
          source,
          responseTimeMs: elapsed,
        },
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
          "CDN-Cache-Control":
            "public, s-maxage=120, stale-while-revalidate=600",
          "Vercel-CDN-Cache-Control":
            "public, s-maxage=120, stale-while-revalidate=600",
          "x-cache-source": source,
          "x-cache-hit": hit ? "1" : "0",
          "x-response-time": `${elapsed}ms`,
          Vary: "Accept-Encoding",
        },
      }
    );
  } catch (error) {
    console.error("Search Kulliyat Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Search failed (تلاش ناکام رہی)",
        data: null,
        err: "SEARCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/* =========================================================
   PURGE ENDPOINT (still useful — clears all in-process caches)
   POST /api/client/deewan/search-kulliyat?action=purge
========================================================= */

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action !== "purge") {
    return NextResponse.json(
      { success: false, message: "Unknown action", err: "BAD_ACTION" },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  memoryCache.clear();
  regexCache.clear();
  filterCache.clear();
  inflightRequests.clear();

  return NextResponse.json(
    {
      success: true,
      message: "Search cache purged (کیش صاف کر دیا گیا)",
      data: { cleared: true },
      err: null,
      status: HTTP_STATUS.OK,
    },
    { status: HTTP_STATUS.OK }
  );
}