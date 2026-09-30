// app/api/client/deewan/stats/route.ts

import { NextResponse } from "next/server";
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

/* =========================================================
   TYPES
========================================================= */

interface CollectionStats {
  count: number;
  comments: number;
  likes: number;
  views: number;
}

interface StatsPayload {
  totalKalam: number;

  byType: {
    ghazal: number;
    nazm: number;
    qata: number;
    shair: number;
  };

  totalComments: number;

  commentsByType: {
    ghazal: number;
    nazm: number;
    qata: number;
    shair: number;
  };

  totalLikes: number;

  likesByType: {
    ghazal: number;
    nazm: number;
    qata: number;
    shair: number;
  };

  totalViews: number;

  viewsByType: {
    ghazal: number;
    nazm: number;
    qata: number;
    shair: number;
  };

  generatedAt: string;
}

interface CacheEntry {
  value: StatsPayload;
  staleAt: number;
  expiresAt: number;
}

/*
 * Deliberately use a minimal structural type here.
 *
 * Different Mongoose models can have different document types,
 * but this route only needs aggregate().
 */
interface StatsModel {
  aggregate: (pipeline: unknown[]) => {
    exec: () => Promise<unknown>;
  };
}

/* =========================================================
   CACHE CONFIGURATION
========================================================= */

const TTL = {
  SOFT_MS: 5 * 60 * 1000,
  HARD_MS: 30 * 60 * 1000,
};

/*
 * Single in-process cache.
 *
 * null = no cache
 */
let cache: CacheEntry | null = null;

/*
 * IMPORTANT:
 *
 * This is Promise<StatsPayload>, NOT Promise<void>.
 *
 * Any request waiting for an active database operation receives
 * the actual StatsPayload.
 */
let inflightRequest: Promise<StatsPayload> | null = null;

/* =========================================================
   SAFE NUMBER
========================================================= */

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

/* =========================================================
   COLLECTION STATS
========================================================= */

async function getCollectionStats(
  model: StatsModel
): Promise<CollectionStats> {
  const pipeline: unknown[] = [
    {
      $group: {
        _id: null,

        count: {
          $sum: 1,
        },

        comments: {
          $sum: {
            $size: {
              $ifNull: ["$comments", []],
            },
          },
        },

        likes: {
          $sum: {
            $size: {
              $ifNull: ["$likes", []],
            },
          },
        },

        views: {
          $sum: {
            $ifNull: ["$views", 0],
          },
        },
      },
    },
  ];

  const rawResult = await model.aggregate(pipeline).exec();

  /*
   * Mongoose normally returns an array here.
   * Validate it defensively so malformed data never crashes
   * the stats endpoint.
   */
  if (!Array.isArray(rawResult) || rawResult.length === 0) {
    return {
      count: 0,
      comments: 0,
      likes: 0,
      views: 0,
    };
  }

  const firstResult = rawResult[0];

  if (
    firstResult === null ||
    typeof firstResult !== "object"
  ) {
    return {
      count: 0,
      comments: 0,
      likes: 0,
      views: 0,
    };
  }

  const stats = firstResult as Record<string, unknown>;

  return {
    count: safeNumber(stats.count),
    comments: safeNumber(stats.comments),
    likes: safeNumber(stats.likes),
    views: safeNumber(stats.views),
  };
}

/* =========================================================
   FETCH ALL STATS
========================================================= */

async function fetchStats(): Promise<StatsPayload> {
  /*
   * Cast only at the boundary.
   *
   * This prevents TypeScript from trying to compare the
   * completely different Mongoose model document types.
   *
   * All four database aggregations still execute in parallel.
   */
  const models: StatsModel[] = [
    GhazalModel as unknown as StatsModel,
    NazmModel as unknown as StatsModel,
    QataModel as unknown as StatsModel,
    ShairModel as unknown as StatsModel,
  ];

  const results = await Promise.all(
    models.map((model) => getCollectionStats(model))
  );

  const ghazal: CollectionStats = results[0] ?? {
    count: 0,
    comments: 0,
    likes: 0,
    views: 0,
  };

  const nazm: CollectionStats = results[1] ?? {
    count: 0,
    comments: 0,
    likes: 0,
    views: 0,
  };

  const qata: CollectionStats = results[2] ?? {
    count: 0,
    comments: 0,
    likes: 0,
    views: 0,
  };

  const shair: CollectionStats = results[3] ?? {
    count: 0,
    comments: 0,
    likes: 0,
    views: 0,
  };

  const totalKalam =
    ghazal.count +
    nazm.count +
    qata.count +
    shair.count;

  const totalComments =
    ghazal.comments +
    nazm.comments +
    qata.comments +
    shair.comments;

  const totalLikes =
    ghazal.likes +
    nazm.likes +
    qata.likes +
    shair.likes;

  const totalViews =
    ghazal.views +
    nazm.views +
    qata.views +
    shair.views;

  return {
    totalKalam,

    byType: {
      ghazal: ghazal.count,
      nazm: nazm.count,
      qata: qata.count,
      shair: shair.count,
    },

    totalComments,

    commentsByType: {
      ghazal: ghazal.comments,
      nazm: nazm.comments,
      qata: qata.comments,
      shair: shair.comments,
    },

    totalLikes,

    likesByType: {
      ghazal: ghazal.likes,
      nazm: nazm.likes,
      qata: qata.likes,
      shair: shair.likes,
    },

    totalViews,

    viewsByType: {
      ghazal: ghazal.views,
      nazm: nazm.views,
      qata: qata.views,
      shair: shair.views,
    },

    generatedAt: new Date().toISOString(),
  };
}

/* =========================================================
   DATABASE CONNECTION
========================================================= */

async function ensureDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = EnvSecrets.mongoUri;

  if (
    typeof mongoUri !== "string" ||
    mongoUri.trim().length === 0
  ) {
    throw new Error("MongoDB connection string is missing.");
  }

  await ConnectDB(mongoUri);
}

/* =========================================================
   UPDATE CACHE
========================================================= */

function updateCache(value: StatsPayload): void {
  const now = Date.now();

  cache = {
    value,
    staleAt: now + TTL.SOFT_MS,
    expiresAt: now + TTL.HARD_MS,
  };
}

/* =========================================================
   START / DEDUPLICATE DATABASE REQUEST
========================================================= */

function startInflightRequest(): Promise<StatsPayload> {
  /*
   * If a database request is already running, reuse it.
   */
  if (inflightRequest !== null) {
    return inflightRequest;
  }

  /*
   * Explicitly type the promise as Promise<StatsPayload>.
   */
  const request: Promise<StatsPayload> = (async () => {
    try {
      const fresh = await fetchStats();

      updateCache(fresh);

      return fresh;
    } finally {
      /*
       * Only clear if this exact request is still registered.
       */
      inflightRequest = null;
    }
  })();

  inflightRequest = request;

  return request;
}

/* =========================================================
   BACKGROUND REVALIDATION
========================================================= */

function revalidateInBackground(): void {
  /*
   * Never start two background database refreshes.
   */
  if (inflightRequest !== null) {
    return;
  }

  /*
   * startInflightRequest() returns Promise<StatsPayload>.
   *
   * We intentionally discard the result here because this is
   * background work.
   *
   * void prevents the returned promise from being treated as
   * an awaited value while .catch() still handles failures.
   */
  void startInflightRequest().catch(
    (error: unknown): void => {
      console.warn(
        "[stats] Background revalidation failed:",
        error
      );
    }
  );
}

/* =========================================================
   RESPONSE HEADERS
========================================================= */

function getCacheHeaders(
  cacheState: string
): Record<string, string> {
  const cacheControl =
    "public, s-maxage=300, stale-while-revalidate=900";

  return {
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cacheControl,
    "Vercel-CDN-Cache-Control": cacheControl,
    "x-cache": cacheState,
  };
}

/* =========================================================
   GET HANDLER
========================================================= */

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    /* =====================================================
       CACHE CHECK
    ===================================================== */

    if (cache !== null) {
      const now = Date.now();

      /*
       * -----------------------------------------------------
       * 1. FRESH CACHE
       * -----------------------------------------------------
       */

      if (now < cache.staleAt) {
        const elapsed =
          Date.now() - startTime;

        return NextResponse.json(
          {
            success: true,
            message: "Stats fetched from cache",
            data: cache.value,
            err: null,
            status: HTTP_STATUS.OK,

            meta: {
              cached: true,
              stale: false,
              source: "memory-cache",
              responseTimeMs: elapsed,
            },
          },
          {
            status: HTTP_STATUS.OK,
            headers: getCacheHeaders("HIT"),
          }
        );
      }

      /*
       * -----------------------------------------------------
       * 2. STALE BUT NOT EXPIRED
       * -----------------------------------------------------
       */

      if (now < cache.expiresAt) {
        const staleValue = cache.value;

        /*
         * Return stale data immediately.
         * Refresh happens in background.
         */
        revalidateInBackground();

        const elapsed =
          Date.now() - startTime;

        return NextResponse.json(
          {
            success: true,
            message: "Stats fetched from stale cache",
            data: staleValue,
            err: null,
            status: HTTP_STATUS.OK,

            meta: {
              cached: true,
              stale: true,
              source: "stale-memory-cache",
              responseTimeMs: elapsed,
            },
          },
          {
            status: HTTP_STATUS.OK,
            headers: getCacheHeaders("STALE"),
          }
        );
      }

      /*
       * -----------------------------------------------------
       * 3. HARD EXPIRATION
       * -----------------------------------------------------
       *
       * Do not serve expired data.
       */
      cache = null;
    }

    /* =====================================================
       DATABASE CONNECTION
    ===================================================== */

    await ensureDb();

    /* =====================================================
       REQUEST DEDUPLICATION
    ===================================================== */

    const wasAlreadyInflight =
      inflightRequest !== null;

    const fresh =
      await startInflightRequest();

    const elapsed =
      Date.now() - startTime;

    /* =====================================================
       DATABASE RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message: wasAlreadyInflight
          ? "Stats fetched (deduped)"
          : "Stats fetched successfully",

        data: fresh,

        err: null,

        status: HTTP_STATUS.OK,

        meta: {
          cached: false,
          deduped: wasAlreadyInflight,
          source: wasAlreadyInflight
            ? "inflight"
            : "database",
          responseTimeMs: elapsed,
        },
      },
      {
        status: HTTP_STATUS.OK,

        headers: getCacheHeaders(
          wasAlreadyInflight
            ? "DEDUPED"
            : "MISS"
        ),
      }
    );
  } catch (error: unknown) {
    console.error(
      "Stats Error:",
      error
    );

    const elapsed =
      Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,

        message: "Failed to fetch stats",

        data: null,

        err: "STATS_ERROR",

        status:
          HTTP_STATUS.INTERNAL_SERVER_ERROR,

        meta: {
          cached: false,
          responseTimeMs: elapsed,
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
   PURGE ENDPOINT
   POST /api/client/deewan/stats?action=purge
========================================================= */

export async function POST(
  req: Request
): Promise<NextResponse> {
  try {
    const { searchParams } =
      new URL(req.url);

    const action =
      searchParams.get("action");

    if (action !== "purge") {
      return NextResponse.json(
        {
          success: false,
          message: "Unknown action",
          data: null,
          err: "BAD_ACTION",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        {
          status: HTTP_STATUS.BAD_REQUEST,
        }
      );
    }

    /*
     * Clear only the cache.
     *
     * We do NOT cancel an active database request.
     * If one is already running, it is allowed to finish.
     */
    cache = null;

    return NextResponse.json(
      {
        success: true,
        message: "Stats cache purged",
        data: {
          cleared: true,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Stats Purge Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to purge stats cache",
        data: null,
        err: "PURGE_ERROR",
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