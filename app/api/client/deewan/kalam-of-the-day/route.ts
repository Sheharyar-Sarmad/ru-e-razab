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

const TYPE_LABELS_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

/**
 * Same idea as the numaya/kalam pipeline builder, but tuned for
 * "Kalam of the Day":
 *  - $match filters to the last 24 hours on `createdAt` only (no
 *    coverImage requirement — a Kalam without a cover image can still be
 *    the newest one).
 *  - $sort + $limit: 1 means MongoDB only ever hands back the single
 *    newest candidate per collection, so at most 4 tiny documents ever
 *    cross the wire before the in-memory comparison below.
 */
function buildLatestPipeline(
  sinceDate: Date,
  firstLineExpr: Record<string, unknown>
) {
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
    { $limit: 1 },
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

// Shair documents are a single couplet — lines[] sits directly on the
// document rather than nested under a content/shairs structure.
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
    createdAt: item.createdAt,
  };
}

export async function GET() {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [nazmResult, ghazalResult, qataResult, shairResult] =
      await Promise.all([
        NazmModel.aggregate(
          buildLatestPipeline(twentyFourHoursAgo, NAZM_FIRST_LINE_SAFE)
        ).allowDiskUse(false),
        GhazalModel.aggregate(
          buildLatestPipeline(twentyFourHoursAgo, GHAZAL_QATA_FIRST_LINE)
        ).allowDiskUse(false),
        QataModel.aggregate(
          buildLatestPipeline(twentyFourHoursAgo, GHAZAL_QATA_FIRST_LINE)
        ).allowDiskUse(false),
        ShairModel.aggregate(
          buildLatestPipeline(twentyFourHoursAgo, SHAIR_FIRST_LINE)
        ).allowDiskUse(false),
      ]);

    const candidates: KalamOfTheDay[] = [];

    if (nazmResult[0]) {
      candidates.push(formatCandidate(nazmResult[0], "nazm", "Nazm", "Untitled"));
    }
    if (ghazalResult[0]) {
      candidates.push(formatCandidate(ghazalResult[0], "ghazal", "Ghazal", "Ghazal"));
    }
    if (qataResult[0]) {
      candidates.push(formatCandidate(qataResult[0], "qata", "Qata", "Qata"));
    }
    if (shairResult[0]) {
      candidates.push(formatCandidate(shairResult[0], "shair", "Shair", "Shair"));
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No Kalam published in the last 24 hours.",
          data: null,
          err: null,
          status: HTTP_STATUS.OK,
        },
        { status: HTTP_STATUS.OK }
      );
    }

    // Genuine cross-collection comparison: pick the single newest
    // createdAt out of the (at most 4) per-collection candidates.
    const kalamOfTheDay = candidates.reduce((newest, current) =>
      new Date(current.createdAt).getTime() > new Date(newest.createdAt).getTime()
        ? current
        : newest
    );

    return NextResponse.json(
      {
        success: true,
        message: "Kalam of the Day fetched successfully (کلامِ روز حاصل ہوگیا)",
        data: kalamOfTheDay,
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Kalam of the Day Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Kalam of the Day (کلامِ روز حاصل نہیں ہو سکا)",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}