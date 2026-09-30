// app/api/client/deewan/kalam-of-the-day/route.ts
import { NextResponse } from "next/server";
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

interface KalamOfTheDay {
  _id: string;
  type: KalamType;
  typeDisplay: string;
  typeDisplayUrdu: string;
  title: string;
  slug: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

// EXTREAM-LEVEL IN-MEMORY CACHE STORAGE
interface CacheStore {
  data: KalamOfTheDay | null | "empty";
  expiresAt: number;
  isStaleAfter: number;
}

let globalCache: CacheStore | null = null;
let isRevalidating = false;

// Time thresholds (5-minute fresh buffer, hard fallback limits up to 1 hour)
const FRESH_CACHE_MS = 5 * 60 * 1000; 
const MAX_CACHE_LIFETIME_MS = 60 * 60 * 1000; 

const TYPE_LABELS_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

/**
 * Cleaned Pipeline Builder: Free from text escaping corruption characters
 */
function buildLatestPipeline(
  sinceDate: Date,
  firstLineExpr: Record<string, unknown>
): any[] {
  return [
    { $match: { createdAt: { $gte: sinceDate } } },
    {
      $project: {
        slug: 1,
        unwan: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
        firstLine: firstLineExpr,
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 1 }
  ];
}

const NAZM_FIRST_LINE_SAFE = {
  $let: {
    vars: {
      firstBand: { $arrayElemAt: ["$content", 0] },
    },
    in: {
      $ifNull: [
        {
          $arrayElemAt: [
            { $arrayElemAt: ["$$firstBand.shairs.lines", 0] },
            0,
          ],
        },
        "",
      ],
    },
  },
};

const GHAZAL_QATA_FIRST_LINE = {
  $let: {
    vars: {
      firstShair: { $arrayElemAt: ["$content", 0] },
    },
    in: { $ifNull: [{ $arrayElemAt: ["$$firstShair.lines", 0] }, ""] },
  },
};

const SHAIR_FIRST_LINE = {
  $ifNull: [{ $arrayElemAt: ["$lines", 0] }, ""],
};

function formatCandidate(
  item: any,
  type: KalamType,
  typeDisplay: string,
  fallbackTitle: string
): KalamOfTheDay {
  return {
    _id: String(item._id),
    type,
    typeDisplay,
    typeDisplayUrdu: TYPE_LABELS_URDU[type],
    title: item.unwan || fallbackTitle,
    slug: item.slug,
    firstLine: item.firstLine || "",
    category: item.category || [],
    coverImage: item.coverImage || "",
    likesCount: item.likesCount || 0,
    commentsCount: item.commentsCount || 0,
    createdAt: new Date(item.createdAt),
  };
}

/**
 * Isolated core database operations runner
 */
async function fetchFreshKalamData(): Promise<KalamOfTheDay | null> {
  await ConnectDB(EnvSecrets.mongoUri as string);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [nazmResult, ghazalResult, qataResult, shairResult] =
    await Promise.all([
      NazmModel.aggregate(buildLatestPipeline(twentyFourHoursAgo, NAZM_FIRST_LINE_SAFE) as any[]).allowDiskUse(false),
      GhazalModel.aggregate(buildLatestPipeline(twentyFourHoursAgo, GHAZAL_QATA_FIRST_LINE) as any[]).allowDiskUse(false),
      QataModel.aggregate(buildLatestPipeline(twentyFourHoursAgo, GHAZAL_QATA_FIRST_LINE) as any[]).allowDiskUse(false),
      ShairModel.aggregate(buildLatestPipeline(twentyFourHoursAgo, SHAIR_FIRST_LINE) as any[]).allowDiskUse(false),
    ]);

  const candidates: KalamOfTheDay[] = [];

  if (nazmResult?.[0]) candidates.push(formatCandidate(nazmResult[0], "nazm", "Nazm", "Untitled"));
  if (ghazalResult?.[0]) candidates.push(formatCandidate(ghazalResult[0], "ghazal", "Ghazal", "Ghazal"));
  if (qataResult?.[0]) candidates.push(formatCandidate(qataResult[0], "qata", "Qata", "Qata"));
  if (shairResult?.[0]) candidates.push(formatCandidate(shairResult[0], "shair", "Shair", "Shair"));

  if (candidates.length === 0) return null;

  return candidates.reduce((newest, current) =>
    new Date(current.createdAt).getTime() > new Date(newest.createdAt).getTime() ? current : newest
  );
}

/**
 * Silent Background Cache Revalidation (Stale-While-Revalidate Engine)
 */
async function triggerBackgroundRefresh() {
  if (isRevalidating) return;
  isRevalidating = true;
  try {
    const freshData = await fetchFreshKalamData();
    const now = Date.now();
    globalCache = {
      data: freshData || "empty",
      isStaleAfter: now + FRESH_CACHE_MS,
      expiresAt: now + MAX_CACHE_LIFETIME_MS,
    };
  } catch (err) {
    console.error("Background Cache Revalidation Fail:", err);
  } finally {
    isRevalidating = false;
  }
}

// MAIN GET HANDLER WITH EXTREME HIGH-SPEED INTERCEPT PATTERNS
export async function GET() {
  try {
    const now = Date.now();

    // Layer 1 Check: Instant hit on fresh memory cache
    if (globalCache && now < globalCache.isStaleAfter) {
      if (globalCache.data === "empty" || !globalCache.data) {
        return NextResponse.json(
          { success: true, message: "No Kalam published in the last 24 hours.", data: null, err: null, status: HTTP_STATUS.OK },
          { status: HTTP_STATUS.OK, headers: { "X-Cache": "HIT-FRESH-EMPTY" } }
        );
      }
      return NextResponse.json(
        { success: true, message: "Kalam of the Day fetched successfully (کلامِ روز حاصل ہوگیا)", data: globalCache.data, err: null, status: HTTP_STATUS.OK },
        { status: HTTP_STATUS.OK, headers: { "X-Cache": "HIT-FRESH" } }
      );
    }

    // Layer 2 Check: Stale cache hit (Return instant data, refresh database asynchronously in background)
    if (globalCache && now < globalCache.expiresAt) {
      triggerBackgroundRefresh(); // Fire & Forget async action block

      if (globalCache.data === "empty" || !globalCache.data) {
        return NextResponse.json(
          { success: true, message: "No Kalam published in the last 24 hours.", data: null, err: null, status: HTTP_STATUS.OK },
          { status: HTTP_STATUS.OK, headers: { "X-Cache": "HIT-STALE-EMPTY" } }
        );
      }
      return NextResponse.json(
        { success: true, message: "Kalam of the Day fetched successfully (کلامِ روز حاصل ہوگیا)", data: globalCache.data, err: null, status: HTTP_STATUS.OK },
        { status: HTTP_STATUS.OK, headers: { "X-Cache": "HIT-STALE" } }
      );
    }

    // Layer 3 Fallback: Cache completely empty or expired -> Strict blocking load synchronous process
    const resultKalam = await fetchFreshKalamData();
    
    globalCache = {
      data: resultKalam || "empty",
      isStaleAfter: now + FRESH_CACHE_MS,
      expiresAt: now + MAX_CACHE_LIFETIME_MS,
    };

    if (!resultKalam) {
      return NextResponse.json(
        { success: true, message: "No Kalam published in the last 24 hours.", data: null, err: null, status: HTTP_STATUS.OK },
        { status: HTTP_STATUS.OK, headers: { "X-Cache": "MISS-EMPTY" } }
      );
    }

    return NextResponse.json(
      { success: true, message: "Kalam of the Day fetched successfully (کلامِ روز حاصل ہوگیا)", data: resultKalam, err: null, status: HTTP_STATUS.OK },
      { status: HTTP_STATUS.OK, headers: { "X-Cache": "MISS" } }
    );

  } catch (error: any) {
    console.error("Kalam of the Day Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Kalam of the Day (کلامِ روز حاصل نہیں ہو سکا)", data: null, err: error?.message || "FETCH_ERROR", status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
