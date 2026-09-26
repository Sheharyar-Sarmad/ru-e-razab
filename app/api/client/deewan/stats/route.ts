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
   IN-MEMORY CACHE (single-process, ultra-fast)
========================================================= */

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
  expiresAt: number;
  staleAt: number;
}

let cache: CacheEntry | null = null;

const TTL = {
  SOFT_MS: 5 * 60 * 1000,   // 5 min → serve stale + revalidate
  HARD_MS: 30 * 60 * 1000,  // 30 min → hard expiry
};

/* =========================================================
   AGGREGATION PER COLLECTION
========================================================= */

async function getCollectionStats(model: any) {
  const result = await model.aggregate([
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        views: { $sum: { $ifNull: ["$views", 0] } },
      },
    },
  ]);

  const stats = result[0] || {};
  return {
    count: stats.count || 0,
    comments: stats.comments || 0,
    likes: stats.likes || 0,
    views: stats.views || 0,
  };
}

/* =========================================================
   FETCH ALL STATS IN PARALLEL
========================================================= */

async function fetchStats(): Promise<StatsPayload> {
  const [ghazal, nazm, qata, shair] = await Promise.all([
    getCollectionStats(GhazalModel),
    getCollectionStats(NazmModel),
    getCollectionStats(QataModel),
    getCollectionStats(ShairModel),
  ]);

  const totalKalam = ghazal.count + nazm.count + qata.count + shair.count;
  const totalComments =
    ghazal.comments + nazm.comments + qata.comments + shair.comments;
  const totalLikes = ghazal.likes + nazm.likes + qata.likes + shair.likes;
  const totalViews = ghazal.views + nazm.views + qata.views + shair.views;

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
   DB CONNECTION
========================================================= */

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  await ConnectDB(EnvSecrets.mongoUri as string);
}

/* =========================================================
   REVALIDATE IN BACKGROUND
========================================================= */

let inflight: Promise<StatsPayload> | null = null;

function revalidateInBackground() {
  if (inflight) return;
  inflight = (async () => {
    try {
      const fresh = await fetchStats();
      const now = Date.now();
      cache = {
        value: fresh,
        staleAt: now + TTL.SOFT_MS,
        expiresAt: now + TTL.HARD_MS,
      };
    } catch (err) {
      console.warn("[stats] Background revalidate failed:", err);
    } finally {
      inflight = null;
    }
  })();
}

/* =========================================================
   GET HANDLER
========================================================= */

export async function GET() {
  const startTime = Date.now();

  try {
    // FAST PATH — fresh cache hit
    if (cache && Date.now() < cache.expiresAt) {
      const isStale = Date.now() > cache.staleAt;
      if (!isStale) {
        return NextResponse.json(
          {
            success: true,
            message: "Stats fetched from cache",
            data: cache.value,
            err: null,
            status: HTTP_STATUS.OK,
            meta: { cached: true, responseTimeMs: Date.now() - startTime },
          },
          {
            status: HTTP_STATUS.OK,
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
              "x-cache": "HIT",
            },
          }
        );
      }
      // Stale — serve old, refresh in background
      revalidateInBackground();
      return NextResponse.json(
        {
          success: true,
          message: "Stats fetched from stale cache",
          data: cache.value,
          err: null,
          status: HTTP_STATUS.OK,
          meta: { cached: true, stale: true, responseTimeMs: Date.now() - startTime },
        },
        {
          status: HTTP_STATUS.OK,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
            "x-cache": "STALE",
          },
        }
      );
    }

    // SLOW PATH — fetch from DB
    await ensureDb();

    if (inflight) {
      const fresh = await inflight;
      return NextResponse.json(
        {
          success: true,
          message: "Stats fetched (deduped)",
          data: fresh,
          err: null,
          status: HTTP_STATUS.OK,
          meta: { cached: false, responseTimeMs: Date.now() - startTime },
        },
        { status: HTTP_STATUS.OK }
      );
    }

    inflight = (async () => {
      try {
        const fresh = await fetchStats();
        const now = Date.now();
        cache = {
          value: fresh,
          staleAt: now + TTL.SOFT_MS,
          expiresAt: now + TTL.HARD_MS,
        };
        return fresh;
      } finally {
        inflight = null;
      }
    })();

    const fresh = await inflight;

    return NextResponse.json(
      {
        success: true,
        message: "Stats fetched successfully",
        data: fresh,
        err: null,
        status: HTTP_STATUS.OK,
        meta: { cached: false, responseTimeMs: Date.now() - startTime },
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
          "x-cache": "MISS",
        },
      }
    );
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch stats",
        data: null,
        err: "STATS_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/* =========================================================
   PURGE ENDPOINT
   POST /api/client/deewan/stats?action=purge
========================================================= */

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") !== "purge") {
    return NextResponse.json(
      { success: false, message: "Unknown action", err: "BAD_ACTION" },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  cache = null;
  return NextResponse.json(
    {
      success: true,
      message: "Stats cache purged",
      data: { cleared: true },
      err: null,
      status: HTTP_STATUS.OK,
    },
    { status: HTTP_STATUS.OK }
  );
}