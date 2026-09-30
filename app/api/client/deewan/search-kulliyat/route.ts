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

interface LRUEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
}

type ExtraFilters = {
  category?: string;
  featured?: boolean;
  takhallus?: string;
};

/* =========================================================
   LRU CACHE
========================================================= */

class LRUCache<T> {
  private cache = new Map<string, LRUEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): { value: T; isStale: boolean } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      value: entry.value,
      isStale: now > entry.staleAt,
    };
  }

  peek(key: string): LRUEntry<T> | undefined {
    return this.cache.get(key);
  }

  set(
    key: string,
    value: T,
    softTtlMs: number,
    hardTtlMs: number
  ): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;

      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const now = Date.now();

    this.cache.set(key, {
      value,
      staleAt: now + softTtlMs,
      expiresAt: now + hardTtlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const memoryCache = new LRUCache<CachedPayload>(1000);

/* =========================================================
   REGEX CACHE
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
      const firstKey = regexCache.keys().next().value;

      if (firstKey !== undefined) {
        regexCache.delete(firstKey);
      }
    }

    rx = new RegExp(escapeRegex(query), "i");
    regexCache.set(query, rx);
  }

  return rx;
}

/* =========================================================
   FILTER CACHE
========================================================= */

const filterCache = new Map<string, Record<string, unknown>>();
const FILTER_CACHE_MAX = 500;

function filterCacheKey(
  q: string,
  extra: ExtraFilters,
  type: string
): string {
  return `${type}|${q}|${extra.category || ""}|${
    extra.takhallus || ""
  }|${
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

      if (firstKey !== undefined) {
        filterCache.delete(firstKey);
      }
    }

    cached = buildFn();
    filterCache.set(key, cached);
  }

  return cached;
}

/* =========================================================
   FILTER BUILDERS
========================================================= */

function buildGhazalFilterRaw(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
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

  if (extra.category) {
    parts.push({ category: extra.category });
  }

  if (extra.takhallus) {
    parts.push({ takhallus: extra.takhallus });
  }

  if (extra.featured !== undefined) {
    parts.push({ featured: extra.featured });
  }

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return {
    $and: parts,
  };
}

function buildNazmFilterRaw(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
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

  if (extra.category) {
    parts.push({ category: extra.category });
  }

  if (extra.takhallus) {
    parts.push({ takhallus: extra.takhallus });
  }

  if (extra.featured !== undefined) {
    parts.push({ featured: extra.featured });
  }

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return {
    $and: parts,
  };
}

function buildQataFilterRaw(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
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

  if (extra.category) {
    parts.push({ category: extra.category });
  }

  if (extra.takhallus) {
    parts.push({ takhallus: extra.takhallus });
  }

  if (extra.featured !== undefined) {
    parts.push({ featured: extra.featured });
  }

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return {
    $and: parts,
  };
}

function buildShairFilterRaw(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
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

  if (extra.category) {
    parts.push({ category: extra.category });
  }

  if (extra.takhallus) {
    parts.push({ takhallus: extra.takhallus });
  }

  if (extra.featured !== undefined) {
    parts.push({ featured: extra.featured });
  }

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return {
    $and: parts,
  };
}

/* =========================================================
   CACHED FILTER ACCESSORS
========================================================= */

function getGhazalFilter(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
  return cacheFilter(
    filterCacheKey(q || "", extra, "ghazal"),
    () => buildGhazalFilterRaw(q, extra)
  );
}

function getNazmFilter(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
  return cacheFilter(
    filterCacheKey(q || "", extra, "nazm"),
    () => buildNazmFilterRaw(q, extra)
  );
}

function getQataFilter(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
  return cacheFilter(
    filterCacheKey(q || "", extra, "qata"),
    () => buildQataFilterRaw(q, extra)
  );
}

function getShairFilter(
  q: string | undefined,
  extra: ExtraFilters
): Record<string, unknown> {
  return cacheFilter(
    filterCacheKey(q || "", extra, "shair"),
    () => buildShairFilterRaw(q, extra)
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

function buildCacheKey(
  params: Record<string, string | undefined>
): string {
  const sorted = Object.keys(params)
    .sort()
    .filter(
      (key) =>
        params[key] !== undefined &&
        params[key] !== ""
    )
    .map(
      (key) =>
        `${key}=${encodeURIComponent(params[key] as string)}`
    )
    .join("&");

  return `sk:${sorted}`;
}

/* =========================================================
   PROJECTION
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
   FIRST LINE EXTRACTION
========================================================= */

function extractFirstLine(
  doc: any,
  type: KalamType
): string {
  try {
    if (type === "nazm") {
      return (
        doc?.content?.[0]?.shairs?.[0]?.lines?.[0] ??
        ""
      );
    }

    if (type === "shair") {
      return Array.isArray(doc?.content)
        ? String(doc.content[0] ?? "")
        : "";
    }

    return (
      doc?.content?.[0]?.lines?.[0] ??
      ""
    );
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
  if (
    !filter ||
    Object.keys(filter).length === 0
  ) {
    return [];
  }

  const safeLimit = Math.max(
    1,
    Math.min(limit, 200)
  );

  const docs = await model
    .find(filter)
    .select(PROJECTION)
    .limit(safeLimit)
    .lean();

  if (!Array.isArray(docs)) {
    return [];
  }

  const out: SearchHit[] = new Array(
    docs.length
  );

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];

    const category = Array.isArray(doc?.category)
      ? doc.category.map((value: unknown) =>
          String(value)
        )
      : [];

    const likesCount = Array.isArray(doc?.likes)
      ? doc.likes.length
      : 0;

    const views =
      typeof doc?.views === "number"
        ? doc.views
        : Number(doc?.views) || 0;

    out[i] = {
      _id: String(doc?._id ?? ""),
      type,
      typeDisplayUrdu:
        TYPE_LABELS_URDU[type],
      title:
        String(
          doc?.unwan ||
            TYPE_LABELS_URDU[type]
        ),
      slug: String(doc?.slug ?? ""),
      href: `/${type}/${String(
        doc?.slug ?? ""
      )}`,
      firstLine:
        extractFirstLine(doc, type),
      category,
      coverImage:
        String(doc?.coverImage ?? ""),
      likesCount,
      views,
      createdAt:
        doc?.createdAt instanceof Date
          ? doc.createdAt
          : new Date(
              doc?.createdAt ||
                Date.now()
            ),
    };
  }

  return out;
}

/* =========================================================
   CORE SEARCH
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
  const extra: ExtraFilters = {
    category,
    featured,
    takhallus,
  };

  const allTargets = [
    {
      model: GhazalModel,
      type: "ghazal" as const,
      filter: getGhazalFilter(
        query || undefined,
        extra
      ),
    },
    {
      model: NazmModel,
      type: "nazm" as const,
      filter: getNazmFilter(
        query || undefined,
        extra
      ),
    },
    {
      model: QataModel,
      type: "qata" as const,
      filter: getQataFilter(
        query || undefined,
        extra
      ),
    },
    {
      model: ShairModel,
      type: "shair" as const,
      filter: getShairFilter(
        query || undefined,
        extra
      ),
    },
  ];

  const targets = typeParam
    ? allTargets.filter(
        (target) =>
          target.type === typeParam
      )
    : allTargets;

  const perCollectionLimit = Math.min(
    200,
    Math.max(
      limit,
      page * limit
    )
  );

  const results = await Promise.all(
    targets.map((target) =>
      searchCollection(
        target.model,
        target.type,
        target.filter,
        perCollectionLimit
      )
    )
  );

  const merged: SearchHit[] = [];

  for (
    let i = 0;
    i < results.length;
    i++
  ) {
    const arr = results[i];

    for (
      let j = 0;
      j < arr.length;
      j++
    ) {
      merged.push(arr[j]);
    }
  }

  merged.sort(
    (a, b) =>
      new Date(
        b.createdAt
      ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
  );

  const total = merged.length;

  const startIdx =
    (page - 1) * limit;

  const paginated =
    merged.slice(
      startIdx,
      startIdx + limit
    );

  const hasMore =
    startIdx + limit < total;

  return {
    query,

    filters: {
      type: typeParam,
      category,
      takhallus,
      featured,
    },

    pagination: {
      page,
      limit,
      total,
      hasMore,
      totalPages:
        Math.ceil(total / limit),
    },

    results: paginated,
  };
}

/* =========================================================
   IN-FLIGHT REQUEST CACHE
========================================================= */

const inflightRequests =
  new Map<
    string,
    Promise<CachedPayload>
  >();

const TTL = {
  SOFT_MS: 3 * 60 * 1000,
  HARD_MS: 15 * 60 * 1000,
};

/* =========================================================
   BACKGROUND REVALIDATION
   IMPORTANT:
   Promise MUST return CachedPayload
========================================================= */

function revalidateInBackground(
  cacheKey: string,
  fetcher: () => Promise<CachedPayload>
): void {
  if (
    inflightRequests.has(cacheKey)
  ) {
    return;
  }

  const promise: Promise<CachedPayload> =
    (async (): Promise<CachedPayload> => {
      try {
        const fresh =
          await fetcher();

        memoryCache.set(
          cacheKey,
          fresh,
          TTL.SOFT_MS,
          TTL.HARD_MS
        );

        return fresh;
      } catch (error) {
        console.error(
          `Background search revalidation failed for ${cacheKey}:`,
          error
        );

        /*
         * CRITICAL:
         * We re-throw so the Promise remains
         * Promise<CachedPayload>, not Promise<void>.
         */
        throw error;
      } finally {
        inflightRequests.delete(
          cacheKey
        );
      }
    })();

  inflightRequests.set(
    cacheKey,
    promise
  );

  /*
   * Prevent unhandled rejection because
   * this promise is intentionally running
   * in the background.
   */
  void promise.catch(() => {});
}

/* =========================================================
   GET OR FETCH
========================================================= */

async function getOrFetch(
  cacheKey: string,
  fetcher: () => Promise<CachedPayload>
): Promise<{
  payload: CachedPayload;
  source:
    | "lru-fresh"
    | "lru-stale"
    | "inflight"
    | "db";
  hit: boolean;
}> {
  const lruHit =
    memoryCache.get(cacheKey);

  /* Fresh cache */
  if (
    lruHit &&
    !lruHit.isStale
  ) {
    return {
      payload: lruHit.value,
      source: "lru-fresh",
      hit: true,
    };
  }

  /* Stale cache */
  if (
    lruHit &&
    lruHit.isStale
  ) {
    revalidateInBackground(
      cacheKey,
      fetcher
    );

    return {
      payload: lruHit.value,
      source: "lru-stale",
      hit: true,
    };
  }

  /* Existing request */
  const inflight =
    inflightRequests.get(
      cacheKey
    );

  if (inflight) {
    const payload =
      await inflight;

    return {
      payload,
      source: "inflight",
      hit: true,
    };
  }

  /* Cold database request */
  const promise: Promise<CachedPayload> =
    (async (): Promise<CachedPayload> => {
      try {
        const fresh =
          await fetcher();

        memoryCache.set(
          cacheKey,
          fresh,
          TTL.SOFT_MS,
          TTL.HARD_MS
        );

        return fresh;
      } finally {
        inflightRequests.delete(
          cacheKey
        );
      }
    })();

  inflightRequests.set(
    cacheKey,
    promise
  );

  const payload =
    await promise;

  return {
    payload,
    source: "db",
    hit: false,
  };
}

/* =========================================================
   DATABASE CONNECTION
========================================================= */

async function ensureDb(): Promise<void> {
  if (
    mongoose.connection.readyState ===
    1
  ) {
    return;
  }

  await ConnectDB(
    EnvSecrets.mongoUri as string
  );
}

/* =========================================================
   RESPONSE HEADERS
========================================================= */

function buildResponseHeaders(
  source: string,
  hit: boolean,
  elapsed: number
): HeadersInit {
  return {
    "Cache-Control":
      "public, s-maxage=120, stale-while-revalidate=600",

    "CDN-Cache-Control":
      "public, s-maxage=120, stale-while-revalidate=600",

    "Vercel-CDN-Cache-Control":
      "public, s-maxage=120, stale-while-revalidate=600",

    "x-cache-source":
      source,

    "x-cache-hit":
      hit ? "1" : "0",

    "x-response-time":
      `${elapsed}ms`,

    Vary: "Accept-Encoding",
  };
}

/* =========================================================
   GET HANDLER
========================================================= */

export async function GET(
  req: NextRequest
) {
  const startTime =
    Date.now();

  try {
    const { searchParams } =
      new URL(req.url);

    const rawQuery =
      (
        searchParams.get("q") ||
        ""
      ).trim();

    const query =
      normalizeQuery(
        rawQuery
      );

    const rawType =
      searchParams.get(
        "type"
      );

    const typeParam: KalamType | null =
      rawType === "ghazal" ||
      rawType === "nazm" ||
      rawType === "qata" ||
      rawType === "shair"
        ? rawType
        : null;

    const category =
      searchParams.get(
        "category"
      ) || undefined;

    const takhallus =
      searchParams.get(
        "takhallus"
      ) || undefined;

    const featuredParam =
      searchParams.get(
        "featured"
      );

    const featured =
      featuredParam ===
      "true"
        ? true
        : featuredParam ===
          "false"
        ? false
        : undefined;

    const rawPage =
      parseInt(
        searchParams.get(
          "page"
        ) || "1",
        10
      );

    const page =
      Number.isFinite(
        rawPage
      )
        ? Math.max(
            1,
            rawPage
          )
        : 1;

    const rawLimit =
      parseInt(
        searchParams.get(
          "limit"
        ) || "10",
        10
      );

    const limit =
      Number.isFinite(
        rawLimit
      )
        ? Math.min(
            50,
            Math.max(
              1,
              rawLimit
            )
          )
        : 10;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !query &&
      !category &&
      !takhallus &&
      featured === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Provide at least one search parameter (q, category, takhallus, featured).",
          data: null,
          err: "MISSING_QUERY",
          status:
            HTTP_STATUS.BAD_REQUEST,
        },
        {
          status:
            HTTP_STATUS.BAD_REQUEST,
        }
      );
    }

    if (
      query &&
      query.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Search query must be at least 2 characters.",
          data: null,
          err: "QUERY_TOO_SHORT",
          status:
            HTTP_STATUS.BAD_REQUEST,
        },
        {
          status:
            HTTP_STATUS.BAD_REQUEST,
        }
      );
    }

    const cacheKey =
      buildCacheKey({
        q:
          query ||
          undefined,

        type:
          typeParam ||
          undefined,

        category,

        takhallus,

        featured:
          featured ===
          undefined
            ? undefined
            : String(
                featured
              ),

        page:
          String(page),

        limit:
          String(limit),
      });

    /* =====================================================
       FAST CACHE PATH
    ===================================================== */

    const peek =
      memoryCache.peek(
        cacheKey
      );

    if (
      peek &&
      Date.now() <
        peek.expiresAt
    ) {
      const isStale =
        Date.now() >
        peek.staleAt;

      if (!isStale) {
        const elapsed =
          Date.now() -
          startTime;

        return NextResponse.json(
          {
            success: true,
            message: `Found ${peek.value.pagination.total} results (${peek.value.pagination.total} نتائج ملے)`,
            data:
              peek.value,
            err: null,
            status:
              HTTP_STATUS.OK,
            meta: {
              cached: true,
              source:
                "lru-fresh",
              responseTimeMs:
                elapsed,
            },
          },
          {
            status:
              HTTP_STATUS.OK,

            headers:
              buildResponseHeaders(
                "lru-fresh",
                true,
                elapsed
              ),
          }
        );
      }
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    await ensureDb();

    const fetcher =
      () =>
        performSearch(
          query,
          typeParam,
          category,
          takhallus,
          featured,
          page,
          limit
        );

    const {
      payload,
      source,
      hit,
    } =
      await getOrFetch(
        cacheKey,
        fetcher
      );

    const elapsed =
      Date.now() -
      startTime;

    return NextResponse.json(
      {
        success: true,
        message: `Found ${payload.pagination.total} results (${payload.pagination.total} نتائج ملے)`,

        data: payload,

        err: null,

        status:
          HTTP_STATUS.OK,

        meta: {
          cached: hit,
          source,
          responseTimeMs:
            elapsed,
        },
      },
      {
        status:
          HTTP_STATUS.OK,

        headers: buildResponseHeaders(
            source,
            hit,
            elapsed
          ),
      }
    );
  } catch (error) {
    console.error(
      "Search Kulliyat Error:",
      error
    );

    const elapsed =
      Date.now() -
      startTime;

    return NextResponse.json(
      {
        success: false,
        message:
          "Search failed (تلاش ناکام رہی)",
        data: null,
        err:
          error instanceof Error
            ? error.message
            : "SEARCH_ERROR",
        status:
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        meta: {
          responseTimeMs:
            elapsed,
        },
      },
      {
        status:
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
      }
    );
  }
}

/* =========================================================
   PURGE CACHE
   POST /api/client/deewan/search-kulliyat?action=purge
========================================================= */

export async function POST(
  req: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      req.url
    );

    const action =
      searchParams.get(
        "action"
      );

    if (
      action !== "purge"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unknown action",
          data: null,
          err: "BAD_ACTION",
          status:
            HTTP_STATUS.BAD_REQUEST,
        },
        {
          status:
            HTTP_STATUS.BAD_REQUEST,
        }
      );
    }

    memoryCache.clear();
    regexCache.clear();
    filterCache.clear();

    /*
     * Do not blindly clear inflightRequests.
     * Existing requests are still running and their
     * finally blocks need to clean themselves up.
     */

    return NextResponse.json(
      {
        success: true,
        message:
          "Search cache purged (کیش صاف کر دیا گیا)",
        data: {
          cleared: true,
        },
        err: null,
        status:
          HTTP_STATUS.OK,
      },
      {
        status:
          HTTP_STATUS.OK,
      }
    );
  } catch (error) {
    console.error(
      "Search cache purge error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Cache purge failed",
        data: null,
        err:
          error instanceof Error
            ? error.message
            : "PURGE_ERROR",
        status:
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      {
        status:
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
      }
    );
  }
}
