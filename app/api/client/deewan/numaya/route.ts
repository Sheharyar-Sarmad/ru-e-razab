// app/api/client/numaya/kalam/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import GhazalModel from "@/models/kalam/ghazals.model";
import QataModel from "@/models/kalam/qata.model";
import ShairModel from "@/models/kalam/shair.model";

interface FeaturedItem {
  _id: string;
  type: "nazm" | "ghazal" | "qata" | "shair";
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

// Filter shared by every pipeline — matches the original route's semantics
// (coverImage must exist and be non-null/non-empty).
const COVER_IMAGE_FILTER = { coverImage: { $exists: true, $nin: [null, ""] } };

/**
 * Builds an aggregation pipeline that does all the heavy lifting inside
 * MongoDB instead of Node:
 *  - $match hits the partial index on coverImage (see indexes below), so it
 *    never scans documents without a cover image.
 *  - $project trims each document down to just what the response needs
 *    *before* sorting, and computes likesCount/commentsCount via $size
 *    instead of loading full likes/comments arrays into JS.
 *  - $sort + $limit run in the DB, so at most `limit` documents per
 *    collection ever cross the wire — not the whole collection.
 *
 * `firstLineExpr` differs slightly between nazm (band -> shair -> lines),
 * ghazal/qata (shair -> lines), and shair (lines directly) — so it's passed
 * in per model.
 */
function buildPipeline(limit: number, firstLineExpr: Record<string, unknown>) {
  return [
    { $match: COVER_IMAGE_FILTER },
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
    { $sort: { likesCount: -1, commentsCount: -1, createdAt: -1 } },
    // Fetch `limit` from *each* collection so merging four of them can
    // never come up short of the requested top-`limit` overall.
    { $limit: limit },
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

export async function GET(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 12);

    const [nazms, ghazals, qatas, shairs] = await Promise.all([
      NazmModel.aggregate(buildPipeline(limit, NAZM_FIRST_LINE_SAFE)).allowDiskUse(false),
      GhazalModel.aggregate(buildPipeline(limit, GHAZAL_QATA_FIRST_LINE)).allowDiskUse(false),
      QataModel.aggregate(buildPipeline(limit, GHAZAL_QATA_FIRST_LINE)).allowDiskUse(false),
      ShairModel.aggregate(buildPipeline(limit, SHAIR_FIRST_LINE)).allowDiskUse(false),
    ]);

    const formattedNazms: FeaturedItem[] = nazms.map((item: any) => ({
      _id: String(item._id),
      type: "nazm",
      typeDisplay: "Nazm",
      title: item.unwan || "Untitled",
      slug: item.slug,
      firstLine: item.firstLine || "",
      category: item.category || [],
      coverImage: item.coverImage || "",
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
    }));

    const formattedGhazals: FeaturedItem[] = ghazals.map((item: any) => ({
      _id: String(item._id),
      type: "ghazal",
      typeDisplay: "Ghazal",
      title: "Ghazal",
      slug: item.slug,
      firstLine: item.firstLine || "",
      category: item.category || [],
      coverImage: item.coverImage || "",
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
    }));

    const formattedQatas: FeaturedItem[] = qatas.map((item: any) => ({
      _id: String(item._id),
      type: "qata",
      typeDisplay: "Qata",
      title: "Qata",
      slug: item.slug,
      firstLine: item.firstLine || "",
      category: item.category || [],
      coverImage: item.coverImage || "",
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
    }));

    const formattedShairs: FeaturedItem[] = shairs.map((item: any) => ({
      _id: String(item._id),
      type: "shair",
      typeDisplay: "Shair",
      title: "Shair",
      slug: item.slug,
      firstLine: item.firstLine || "",
      category: item.category || [],
      coverImage: item.coverImage || "",
      likesCount: item.likesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
    }));

    // Each collection already arrives sorted and capped at `limit`, so this
    // merge + re-sort + slice operates on at most 4 * limit (≤48) small,
    // pre-trimmed objects — effectively free compared to the DB work.
    const allFeatured = [
      ...formattedNazms,
      ...formattedGhazals,
      ...formattedQatas,
      ...formattedShairs,
    ].sort(
      (a, b) => b.likesCount - a.likesCount || b.commentsCount - a.commentsCount
    );

    const numaya = allFeatured.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        message: "Numaya Kalam fetched successfully (نمایاں کلام حاصل ہوگیا)",
        data: {
          featured: numaya,
          count: numaya.length,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Numaya Kalam Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Numaya Kalam (نمایاں کلام حاصل نہیں ہو سکا)",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}