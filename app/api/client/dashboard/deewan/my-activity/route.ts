// app/api/client/dashboard/deewan/my-activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
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
type ActivityMode = "likes" | "comments" | "both";

const TYPE_LABELS_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

interface UserComment {
  _id: string;
  content: string;
  createdAt: string;
}

interface ActivityHit {
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
  commentsCount: number;
  views: number;
  createdAt: string;
  userActivity: {
    hasLiked: boolean;
    userCommentCount: number;
    userComments: UserComment[];
    lastActivityAt: string;
  };
}

interface ActivityPayload {
  filters: { activity: ActivityMode; type: KalamType | null };
  stats: {
    totalKalamWithActivity: number;
    totalLikes: number;
    totalComments: number;
    byType: Record<KalamType, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
  results: ActivityHit[];
}

/* =========================================================
   INLINE AUTH — no @/lib/auth needed
========================================================= */

function getUserIdFromRequest(request: NextRequest): string | null {
  const userCookie = request.cookies.get("UserCookie")?.value;
  if (!userCookie) return null;

  try {
    const decoded = jwt.verify(
      userCookie,
      EnvSecrets.jwtSecret as string
    ) as { sub?: string; _id?: string };

    const id = decoded?.sub || decoded?._id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/* =========================================================
   IN-MEMORY LRU CACHE
========================================================= */

interface LRUEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
  userId: string;
}

class LRUCache<T extends { userId?: string }> {
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
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { value: entry.value, isStale: now > entry.staleAt };
  }

  peek(key: string): LRUEntry<T> | undefined {
    return this.cache.get(key);
  }

  set(
    key: string,
    value: T,
    softTtlMs: number,
    hardTtlMs: number,
    userId: string
  ) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    const now = Date.now();
    this.cache.set(key, {
      value,
      staleAt: now + softTtlMs,
      expiresAt: now + hardTtlMs,
      userId,
    });
  }

  invalidateUser(userId: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.userId === userId) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  clear() {
    this.cache.clear();
  }
}

const memoryCache = new LRUCache<ActivityPayload & { userId: string }>(1000);

/* =========================================================
   PRECOMPILED PIPELINE CACHE
========================================================= */

const pipelineCache = new Map<string, Record<string, unknown>[]>();
const PIPELINE_CACHE_MAX = 200;

function pipelineCacheKey(userId: string, activity: ActivityMode): string {
  return `${userId}|${activity}`;
}

function buildPipeline(
  userId: Types.ObjectId,
  activity: ActivityMode
): Record<string, unknown>[] {
  const key = pipelineCacheKey(String(userId), activity);
  const cached = pipelineCache.get(key);
  if (cached) return cached;

  const matchConditions: Record<string, unknown>[] = [];

  if (activity === "likes" || activity === "both") {
    matchConditions.push({ likes: userId });
  }
  if (activity === "comments" || activity === "both") {
    matchConditions.push({ "comments.user": userId });
  }

  const match: Record<string, unknown> =
    matchConditions.length === 0
      ? { _id: null }
      : matchConditions.length === 1
      ? matchConditions[0]
      : { $or: matchConditions };

  const pipeline = [
    { $match: match },
    {
      $project: {
        slug: 1,
        unwan: 1,
        takhallus: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,
        views: 1,
        content: 1,
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
        hasLiked: { $in: [userId, { $ifNull: ["$likes", []] }] },
        userComments: {
          $filter: {
            input: { $ifNull: ["$comments", []] },
            as: "c",
            cond: { $eq: ["$$c.user", userId] },
          },
        },
      },
    },
  ];

  if (pipelineCache.size >= PIPELINE_CACHE_MAX) {
    const firstKey = pipelineCache.keys().next().value;
    if (firstKey !== undefined) pipelineCache.delete(firstKey);
  }
  pipelineCache.set(key, pipeline);

  return pipeline;
}

/* =========================================================
   DB CONNECT
========================================================= */

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

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
   FETCH ONE COLLECTION
========================================================= */

async function fetchActivityForCollection(
  model: any,
  type: KalamType,
  userId: Types.ObjectId,
  activity: ActivityMode,
  perCollectionLimit: number
): Promise<ActivityHit[]> {
  const pipeline = buildPipeline(userId, activity);

  const docs = await model
    .aggregate([...pipeline, { $limit: perCollectionLimit }])
    .allowDiskUse(false);

  return docs.map((doc: any) => {
    const userComments: UserComment[] = (doc.userComments || []).map(
      (c: any) => ({
        _id: String(c._id),
        content: c.content,
        createdAt: new Date(c.createdAt).toISOString(),
      })
    );

    const lastCommentAt = userComments.length
      ? Math.max(...userComments.map((c) => new Date(c.createdAt).getTime()))
      : 0;
    const kalamCreatedAt = new Date(doc.createdAt).getTime();
    const lastActivityAt = Math.max(lastCommentAt, kalamCreatedAt);

    return {
      _id: String(doc._id),
      type,
      typeDisplayUrdu: TYPE_LABELS_URDU[type],
      title: doc.unwan || TYPE_LABELS_URDU[type],
      slug: doc.slug,
      href: `/${type}/${doc.slug}`,
      firstLine: extractFirstLine(doc, type),
      category: doc.category || [],
      coverImage: doc.coverImage || "",
      likesCount: doc.likesCount || 0,
      commentsCount: doc.commentsCount || 0,
      views: doc.views || 0,
      createdAt: new Date(doc.createdAt).toISOString(),
      userActivity: {
        hasLiked: !!doc.hasLiked,
        userCommentCount: userComments.length,
        userComments,
        lastActivityAt: new Date(lastActivityAt).toISOString(),
      },
    } as ActivityHit;
  });
}

/* =========================================================
   CORE FETCH
========================================================= */

async function performActivityFetch(
  userId: Types.ObjectId,
  activity: ActivityMode,
  typeParam: KalamType | null,
  page: number,
  limit: number
): Promise<ActivityPayload> {
  const allTargets = [
    { model: GhazalModel, type: "ghazal" as const },
    { model: NazmModel, type: "nazm" as const },
    { model: QataModel, type: "qata" as const },
    { model: ShairModel, type: "shair" as const },
  ];

  const targets = typeParam
    ? allTargets.filter((t) => t.type === typeParam)
    : allTargets;

  const perCollectionLimit = page * limit;

  const results = await Promise.all(
    targets.map((t) =>
      fetchActivityForCollection(
        t.model,
        t.type,
        userId,
        activity,
        perCollectionLimit
      )
    )
  );

  const merged: ActivityHit[] = results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.userActivity.lastActivityAt).getTime() -
        new Date(a.userActivity.lastActivityAt).getTime()
    );

  const byTypeCounts: Record<KalamType, number> = {
    ghazal: 0,
    nazm: 0,
    qata: 0,
    shair: 0,
  };

  let totalLikes = 0;
  let totalComments = 0;

  for (const hit of merged) {
    byTypeCounts[hit.type] += 1;
    if (hit.userActivity.hasLiked) totalLikes += 1;
    totalComments += hit.userActivity.userCommentCount;
  }

  const total = merged.length;
  const startIdx = (page - 1) * limit;
  const paginated = merged.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < total;

  return {
    filters: { activity, type: typeParam },
    stats: {
      totalKalamWithActivity: total,
      totalLikes,
      totalComments,
      byType: byTypeCounts,
    },
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
   CACHE KEY + TTL + STAMPEDE
========================================================= */

function buildCacheKey(
  userId: string,
  activity: ActivityMode,
  typeParam: KalamType | null,
  page: number,
  limit: number
): string {
  const type = typeParam || "all";
  return `act:${userId}:${activity}:${type}:p${page}:l${limit}`;
}

const TTL = {
  SOFT_MS: 30 * 1000,
  HARD_MS: 3 * 60 * 1000,
};

const inflight = new Map<string, Promise<ActivityPayload>>();

async function getOrFetch(
  cacheKey: string,
  userId: string,
  fetcher: () => Promise<ActivityPayload>
): Promise<{
  payload: ActivityPayload;
  source: "lru-fresh" | "lru-stale" | "inflight" | "db";
  hit: boolean;
}> {
  const lruHit = memoryCache.get(cacheKey);
  if (lruHit && !lruHit.isStale) {
    return { payload: lruHit.value, source: "lru-fresh", hit: true };
  }

  if (lruHit && lruHit.isStale) {
    revalidateInBackground(cacheKey, userId, fetcher);
    return { payload: lruHit.value, source: "lru-stale", hit: true };
  }

  const existing = inflight.get(cacheKey);
  if (existing) {
    const payload = await existing;
    return { payload, source: "inflight", hit: true };
  }

  const promise = (async () => {
    try {
      const fresh = await fetcher();
      memoryCache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS, userId);
      return fresh;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  const payload = await promise;
  return { payload, source: "db", hit: false };
}

function revalidateInBackground(
  cacheKey: string,
  userId: string,
  fetcher: () => Promise<ActivityPayload>
) {
  if (inflight.has(cacheKey)) return;
  const promise = (async () => {
    try {
      const fresh = await fetcher();
      memoryCache.set(cacheKey, fresh, TTL.SOFT_MS, TTL.HARD_MS, userId);
    } catch {
      /* silent */
    } finally {
      inflight.delete(cacheKey);
    }
  })();
  inflight.set(cacheKey, promise);
}

/* =========================================================
   PUBLIC INVALIDATION HELPER
========================================================= */

export function invalidateUserActivityCache(userId: string): number {
  const removed = memoryCache.invalidateUser(userId);
  const prefix = `${userId}|`;
  for (const key of pipelineCache.keys()) {
    if (key.startsWith(prefix)) pipelineCache.delete(key);
  }
  return removed;
}

/* =========================================================
   GET HANDLER
========================================================= */

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    /* ---------- AUTH ---------- */
    const userIdStr = getUserIdFromRequest(req);

    if (!userIdStr) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. User authentication required.",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    /* ---------- PARSE QUERY ---------- */
    const { searchParams } = new URL(req.url);

    const activityParam =
      (searchParams.get("activity") as ActivityMode | null) || "both";
    const activity: ActivityMode = ["likes", "comments", "both"].includes(
      activityParam
    )
      ? activityParam
      : "both";

    const typeParam = searchParams.get("type") as KalamType | null;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );

    const cacheKey = buildCacheKey(
      userIdStr,
      activity,
      typeParam,
      page,
      limit
    );

    /* ---------- FAST PATH ---------- */
    const peek = memoryCache.peek(cacheKey);
    if (peek && Date.now() < peek.expiresAt) {
      const isStale = Date.now() > peek.staleAt;

      if (!isStale) {
        const elapsed = Date.now() - startTime;
        return NextResponse.json(
          {
            success: true,
            message: `Found ${peek.value.pagination.total} kalam with activity`,
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
              "Cache-Control":
                "private, max-age=30, stale-while-revalidate=120",
              Vary: "Cookie, Authorization",
              "x-cache-source": "lru-fresh",
              "x-cache-hit": "1",
              "x-response-time": `${elapsed}ms`,
            },
          }
        );
      }

      revalidateInBackground(cacheKey, userIdStr, () =>
        performActivityFetch(
          new Types.ObjectId(userIdStr),
          activity,
          typeParam,
          page,
          limit
        )
      );

      const elapsed = Date.now() - startTime;
      return NextResponse.json(
        {
          success: true,
          message: `Found ${peek.value.pagination.total} kalam with activity`,
          data: peek.value,
          err: null,
          status: HTTP_STATUS.OK,
          meta: {
            cached: true,
            source: "lru-stale",
            responseTimeMs: elapsed,
          },
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control":
              "private, max-age=30, stale-while-revalidate=120",
            Vary: "Cookie, Authorization",
            "x-cache-source": "lru-stale",
            "x-cache-hit": "1",
            "x-response-time": `${elapsed}ms`,
          },
        }
      );
    }

    /* ---------- SLOW PATH ---------- */
    await ensureDb();

    const userId = new Types.ObjectId(userIdStr);

    const fetcher = () =>
      performActivityFetch(userId, activity, typeParam, page, limit);

    const { payload, source, hit } = await getOrFetch(
      cacheKey,
      userIdStr,
      fetcher
    );

    const elapsed = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: `Found ${payload.pagination.total} kalam with activity`,
        data: payload,
        err: null,
        status: HTTP_STATUS.OK,
        meta: {
          cached: hit,
          source,
          responseTimeMs: elapsed,
          userId: userIdStr,
        },
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          Vary: "Cookie, Authorization",
          "x-cache-source": source,
          "x-cache-hit": hit ? "1" : "0",
          "x-response-time": `${elapsed}ms`,
        },
      }
    );
  } catch (error) {
    console.error("My Activity Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch activity",
        data: null,
        err: "ACTIVITY_FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/* =========================================================
   PURGE ENDPOINT
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

  try {
    const purgeAll = searchParams.get("all") === "true";

    if (purgeAll) {
      memoryCache.clear();
      pipelineCache.clear();
      inflight.clear();
      return NextResponse.json(
        {
          success: true,
          message: "All activity caches purged",
          data: { clearedAll: true },
          err: null,
          status: HTTP_STATUS.OK,
        },
        { status: HTTP_STATUS.OK }
      );
    }

    const userIdStr = getUserIdFromRequest(req);
    if (!userIdStr) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const removed = invalidateUserActivityCache(userIdStr);

    return NextResponse.json(
      {
        success: true,
        message: "Your activity cache purged",
        data: { removedKeys: removed, userId: userIdStr },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Purge failed",
        data: null,
        err: "PURGE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}