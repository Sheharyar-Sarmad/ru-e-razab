// app/api/admin/dashboard/deewan/qata/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import QataModel from "@/models/kalam/qata.model";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCacheKey(
  page: number,
  limit: number,
  search: string,
  category: string,
  takhallus: string,
  sortBy: string,
  sortOrder: string
): string {
  return `qatas:${page}:${limit}:${search}:${category}:${takhallus}:${sortBy}:${sortOrder}`;
}

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "9");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const takhallus = searchParams.get("takhallus") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const cacheKey = getCacheKey(page, limit, search, category, takhallus, sortBy, sortOrder);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${(performance.now() - startTime).toFixed(2)}ms`,
          "X-Cache": "HIT",
        },
      });
    }

    // Build filter
    let filter: any = {};
    if (search) {
      filter.$text = { $search: search };
    }
    if (category) {
      filter.category = { $in: [category] };
    }
    if (takhallus) {
      filter.takhallus = { $regex: `^${takhallus}$`, $options: "i" };
    }

    // Build sort
    let sort: any = {};
    if (search) {
      sort = { score: { $meta: "textScore" } };
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const query = QataModel.find(filter)
      .select(
        "takhallus slug content category coverImage coverImageMetadata media metaTitle metaDescription links likes comments createdAt updatedAt featured views publishedAt"
      );
    if (search) {
      query.select({ score: { $meta: "textScore" } });
    }

    const [qatas, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).lean().exec(),
      QataModel.countDocuments(filter),
    ]);

    const [allCategories, allPoets] = await Promise.all([
      QataModel.distinct("category"),
      QataModel.distinct("takhallus"),
    ]);

    const responseTime = performance.now() - startTime;
    const totalPages = Math.ceil(total / limit);

    const responseData = {
      success: true,
      message: "Qatas fetched successfully",
      data: {
        qatas,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          search: search || null,
          category: category || null,
          takhallus: takhallus || null,
          availableCategories: allCategories,
          availablePoets: allPoets,
        },
        sort: { field: sortBy, order: sortOrder },
        meta: { responseTime: `${responseTime.toFixed(2)}ms` },
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Cache": "MISS",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Deewan Qata Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch qatas",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}