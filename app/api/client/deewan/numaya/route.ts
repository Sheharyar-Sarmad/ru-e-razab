import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";

import NazmModel from "@/models/kalam/nazm.model";
import GhazalModel from "@/models/kalam/ghazals.model";
import QataModel from "@/models/kalam/qata.model";
import ShairModel from "@/models/kalam/shair.model";

/* -------------------------------------------------------------------------- */
/* Next.js configuration                                                      */
/* -------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type KalamType = "nazm" | "ghazal" | "qata" | "shair";

interface FeaturedItem {
  _id: string;
  type: KalamType;
  typeDisplay: string;
  title: string;
  slug: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

interface NumayaData {
  featured: FeaturedItem[];
  count: number;
}

interface CacheEntry {
  data: NumayaData;
  isStaleAfter: number;
  expiresAt: number;
}

interface AggregateItem {
  _id?: unknown;
  slug?: unknown;
  unwan?: unknown;
  category?: unknown;
  coverImage?: unknown;
  createdAt?: unknown;
  firstLine?: unknown;
  likesCount?: unknown;
  commentsCount?: unknown;
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

const numayaCacheStore = new Map<number, CacheEntry>();

/**
 * Prevents multiple requests with the same limit from
 * hitting MongoDB simultaneously.
 */
const activeLoads = new Map<number, Promise<NumayaData>>();

/* -------------------------------------------------------------------------- */
/* Cache configuration                                                        */
/* -------------------------------------------------------------------------- */

const DEFAULT_LIMIT = 6;
const MIN_LIMIT = 1;
const MAX_LIMIT = 12;

const FRESH_CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_LIFETIME_MS = 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Safe utility functions                                                     */
/* -------------------------------------------------------------------------- */

function safeString(
  value: unknown,
  fallback = ""
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return fallback;
}

function safeNumber(
  value: unknown,
  fallback = 0
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return fallback;
}

function safeCategory(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string"
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return [value.trim()];
  }

  return [];
}

function safeDate(
  value: unknown
): Date {
  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date(0);
}

function safeId(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  try {
    return String(value);
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/* Limit parser                                                               */
/* -------------------------------------------------------------------------- */

function parseLimit(
  value: string | null
): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed)
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    Math.max(parsed, MIN_LIMIT),
    MAX_LIMIT
  );
}

/* -------------------------------------------------------------------------- */
/* Nazm aggregation                                                           */
/* -------------------------------------------------------------------------- */

function buildNazmPipeline(
  limit: number
): any[] {
  return [
    {
      $match: {
        coverImage: {
          $exists: true,
          $nin: [null, ""],
        },
      },
    },

    {
      $project: {
        slug: 1,
        unwan: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,

        likesCount: {
          $cond: [
            {
              $isArray: "$likes",
            },
            {
              $size: "$likes",
            },
            0,
          ],
        },

        commentsCount: {
          $cond: [
            {
              $isArray: "$comments",
            },
            {
              $size: "$comments",
            },
            0,
          ],
        },

        firstLine: {
          $ifNull: [
            "$content.0.shairs.0.lines.0",
            "",
          ],
        },
      },
    },

    {
      $sort: {
        likesCount: -1,
        commentsCount: -1,
        createdAt: -1,
      },
    },

    {
      $limit: limit,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Ghazal aggregation                                                         */
/* -------------------------------------------------------------------------- */

function buildGhazalPipeline(
  limit: number
): any[] {
  return [
    {
      $match: {
        coverImage: {
          $exists: true,
          $nin: [null, ""],
        },
      },
    },

    {
      $project: {
        slug: 1,
        unwan: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,

        likesCount: {
          $cond: [
            {
              $isArray: "$likes",
            },
            {
              $size: "$likes",
            },
            0,
          ],
        },

        commentsCount: {
          $cond: [
            {
              $isArray: "$comments",
            },
            {
              $size: "$comments",
            },
            0,
          ],
        },

        firstLine: {
          $ifNull: [
            "$content.0.lines.0",
            "",
          ],
        },
      },
    },

    {
      $sort: {
        likesCount: -1,
        commentsCount: -1,
        createdAt: -1,
      },
    },

    {
      $limit: limit,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Qata aggregation                                                           */
/* -------------------------------------------------------------------------- */

function buildQataPipeline(
  limit: number
): any[] {
  return [
    {
      $match: {
        coverImage: {
          $exists: true,
          $nin: [null, ""],
        },
      },
    },

    {
      $project: {
        slug: 1,
        unwan: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,

        likesCount: {
          $cond: [
            {
              $isArray: "$likes",
            },
            {
              $size: "$likes",
            },
            0,
          ],
        },

        commentsCount: {
          $cond: [
            {
              $isArray: "$comments",
            },
            {
              $size: "$comments",
            },
            0,
          ],
        },

        firstLine: {
          $ifNull: [
            "$content.0.lines.0",
            "",
          ],
        },
      },
    },

    {
      $sort: {
        likesCount: -1,
        commentsCount: -1,
        createdAt: -1,
      },
    },

    {
      $limit: limit,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Shair aggregation                                                          */
/* -------------------------------------------------------------------------- */

function buildShairPipeline(
  limit: number
): any[] {
  return [
    {
      $match: {
        coverImage: {
          $exists: true,
          $nin: [null, ""],
        },
      },
    },

    {
      $project: {
        slug: 1,
        unwan: 1,
        category: 1,
        coverImage: 1,
        createdAt: 1,

        likesCount: {
          $cond: [
            {
              $isArray: "$likes",
            },
            {
              $size: "$likes",
            },
            0,
          ],
        },

        commentsCount: {
          $cond: [
            {
              $isArray: "$comments",
            },
            {
              $size: "$comments",
            },
            0,
          ],
        },

        firstLine: {
          $ifNull: [
            "$lines.0",
            "",
          ],
        },
      },
    },

    {
      $sort: {
        likesCount: -1,
        commentsCount: -1,
        createdAt: -1,
      },
    },

    {
      $limit: limit,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Safe aggregation                                                           */
/* -------------------------------------------------------------------------- */

async function runAggregation(
  model: any,
  pipeline: any[]
): Promise<AggregateItem[]> {
  try {
    const result = await model
      .aggregate(pipeline)
      .allowDiskUse(false);

    if (!Array.isArray(result)) {
      return [];
    }

    return result as AggregateItem[];
  } catch (error: unknown) {
    console.error(
      "Numaya aggregation error:",
      error
    );

    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Format item                                                                */
/* -------------------------------------------------------------------------- */

function formatItem(
  item: AggregateItem,
  type: KalamType,
  typeDisplay: string,
  defaultTitle: string
): FeaturedItem {
  return {
    _id: safeId(item._id),

    type,

    typeDisplay,

    title:
      type === "nazm"
        ? safeString(
            item.unwan,
            "Untitled"
          )
        : defaultTitle,

    slug: safeString(item.slug),

    firstLine: safeString(
      item.firstLine
    ),

    category: safeCategory(
      item.category
    ),

    coverImage: safeString(
      item.coverImage
    ),

    likesCount: safeNumber(
      item.likesCount
    ),

    commentsCount: safeNumber(
      item.commentsCount
    ),

    createdAt: safeDate(
      item.createdAt
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Load fresh data                                                            */
/* -------------------------------------------------------------------------- */

async function loadFreshNumayaData(
  limit: number
): Promise<NumayaData> {
  const mongoUri = safeString(
    EnvSecrets.mongoUri
  );

  if (!mongoUri) {
    throw new Error(
      "MongoDB connection string is missing"
    );
  }

  await ConnectDB(mongoUri);

  /*
   * Every collection is queried independently.
   *
   * If one aggregation has bad data, runAggregation()
   * returns [] instead of destroying the whole request.
   */
  const [
    nazms,
    ghazals,
    qatas,
    shairs,
  ] = await Promise.all([
    runAggregation(
      NazmModel,
      buildNazmPipeline(limit)
    ),

    runAggregation(
      GhazalModel,
      buildGhazalPipeline(limit)
    ),

    runAggregation(
      QataModel,
      buildQataPipeline(limit)
    ),

    runAggregation(
      ShairModel,
      buildShairPipeline(limit)
    ),
  ]);

  /* ------------------------------------------------------------------------ */
  /* Format results                                                           */
  /* ------------------------------------------------------------------------ */

  const formattedNazms: FeaturedItem[] =
    nazms.map((item) =>
      formatItem(
        item,
        "nazm",
        "Nazm",
        "Nazm"
      )
    );

  const formattedGhazals: FeaturedItem[] =
    ghazals.map((item) =>
      formatItem(
        item,
        "ghazal",
        "Ghazal",
        "Ghazal"
      )
    );

  const formattedQatas: FeaturedItem[] =
    qatas.map((item) =>
      formatItem(
        item,
        "qata",
        "Qata",
        "Qata"
      )
    );

  const formattedShairs: FeaturedItem[] =
    shairs.map((item) =>
      formatItem(
        item,
        "shair",
        "Shair",
        "Shair"
      )
    );

  /* ------------------------------------------------------------------------ */
  /* Combine all content                                                     */
  /* ------------------------------------------------------------------------ */

  const allFeatured: FeaturedItem[] = [
    ...formattedNazms,
    ...formattedGhazals,
    ...formattedQatas,
    ...formattedShairs,
  ];

  /* ------------------------------------------------------------------------ */
  /* Sort                                                                     */
  /* ------------------------------------------------------------------------ */

  allFeatured.sort(
    (a, b) => {
      const likesDifference =
        b.likesCount -
        a.likesCount;

      if (likesDifference !== 0) {
        return likesDifference;
      }

      const commentsDifference =
        b.commentsCount -
        a.commentsCount;

      if (commentsDifference !== 0) {
        return commentsDifference;
      }

      return (
        b.createdAt.getTime() -
        a.createdAt.getTime()
      );
    }
  );

  /* ------------------------------------------------------------------------ */
  /* Final limit                                                              */
  /* ------------------------------------------------------------------------ */

  const featured =
    allFeatured.slice(0, limit);

  return {
    featured,
    count: featured.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Deduplicated database loader                                               */
/* -------------------------------------------------------------------------- */

function getFreshNumayaData(
  limit: number
): Promise<NumayaData> {
  const existingRequest =
    activeLoads.get(limit);

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    loadFreshNumayaData(limit);

  activeLoads.set(
    limit,
    request
  );

  request.finally(() => {
    if (
      activeLoads.get(limit) ===
      request
    ) {
      activeLoads.delete(limit);
    }
  }).catch(() => {
    // Prevent unhandled rejection from finally().
  });

  return request;
}

/* -------------------------------------------------------------------------- */
/* Cache setter                                                               */
/* -------------------------------------------------------------------------- */

function setCache(
  limit: number,
  data: NumayaData
): void {
  const now = Date.now();

  numayaCacheStore.set(
    limit,
    {
      data,

      isStaleAfter:
        now + FRESH_CACHE_MS,

      expiresAt:
        now + MAX_CACHE_LIFETIME_MS,
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Background revalidation                                                   */
/* -------------------------------------------------------------------------- */

function triggerAsyncRevalidation(
  limit: number
): void {
  void getFreshNumayaData(limit)
    .then((freshData) => {
      setCache(
        limit,
        freshData
      );
    })
    .catch((error: unknown) => {
      console.error(
        `Numaya background refresh failed for limit ${limit}:`,
        error
      );
    });
}

/* -------------------------------------------------------------------------- */
/* Success response                                                           */
/* -------------------------------------------------------------------------- */

function createSuccessResponse(
  data: NumayaData,
  cacheStatus: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,

      message:
        "Numaya Kalam fetched successfully (نمایاں کلام حاصل ہوگیا)",

      data,

      err: null,

      status: HTTP_STATUS.OK,
    },

    {
      status: HTTP_STATUS.OK,

      headers: {
        "X-Cache": cacheStatus,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Error response                                                             */
/* -------------------------------------------------------------------------- */

function createErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,

      message:
        "Failed to fetch Numaya Kalam (نمایاں کلام حاصل نہیں ہو سکا)",

      data: null,

      err: "FETCH_ERROR",

      status:
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
    },

    {
      status:
        HTTP_STATUS.INTERNAL_SERVER_ERROR,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    /* ---------------------------------------------------------------------- */
    /* Parse query                                                           */
    /* ---------------------------------------------------------------------- */

    const limit =
      parseLimit(
        request.nextUrl.searchParams.get(
          "limit"
        )
      );

    const now = Date.now();

    /* ---------------------------------------------------------------------- */
    /* Check cache                                                           */
    /* ---------------------------------------------------------------------- */

    const cachedEntry =
      numayaCacheStore.get(limit);

    /* ---------------------------------------------------------------------- */
    /* Fresh cache                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      cachedEntry &&
      now <
        cachedEntry.isStaleAfter
    ) {
      return createSuccessResponse(
        cachedEntry.data,
        "HIT-FRESH"
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Stale cache                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      cachedEntry &&
      now <
        cachedEntry.expiresAt
    ) {
      triggerAsyncRevalidation(
        limit
      );

      return createSuccessResponse(
        cachedEntry.data,
        "HIT-STALE"
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Cache miss / expired cache                                            */
    /* ---------------------------------------------------------------------- */

    const freshData =
      await getFreshNumayaData(
        limit
      );

    setCache(
      limit,
      freshData
    );

    return createSuccessResponse(
      freshData,
      "MISS"
    );
  } catch (error: unknown) {
    console.error(
      "Numaya Kalam API Error:",
      error
    );

    return createErrorResponse();
  }
}
