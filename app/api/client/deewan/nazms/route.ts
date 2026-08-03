// app/api/admin/dashboard/deewan/nazm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";

// CACHE
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// HELPER: Get cache key
function getCacheKey(
  page: number,
  limit: number,
  search: string,
  category: string,
  takhallus: string,
  sortBy: string,
  sortOrder: string
): string {
  return `nazms:${page}:${limit}:${search}:${category}:${takhallus}:${sortBy}:${sortOrder}`;
}

// GET - All Nazms with Pagination, Search & Filtering
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { searchParams } = new URL(request.url);

    // 📄 PAGINATION
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "9"); // 9 per page
    const skip = (page - 1) * limit;

    // 🔍 SEARCH & FILTERS
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const takhallus = searchParams.get("takhallus") || "";

    // 📊 SORTING
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // CHECK CACHE
    const cacheKey = getCacheKey(page, limit, search, category, takhallus, sortBy, sortOrder);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache HIT for: ${cacheKey}`);
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${(performance.now() - startTime).toFixed(2)}ms`,
          "X-Cache": "HIT",
        },
      });
    }

    console.log(`Cache MISS for: ${cacheKey}`);

    // BUILD FILTER
    let filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { unwan: { $regex: search, $options: "i" } },
        { takhallus: { $regex: search, $options: "i" } },
        { "content.shairs.lines": { $regex: search, $options: "i" } },
        { metaTitle: { $regex: search, $options: "i" } },
        { metaDescription: { $regex: search, $options: "i" } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = { $in: [category] };
    }

    // Takhallus filter
    if (takhallus) {
      filter.takhallus = { $regex: takhallus, $options: "i" };
    }

    // BUILD SORT
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // EXECUTE QUERY
    const [nazms, total] = await Promise.all([
      NazmModel.find(filter)
        .select("unwan takhallus slug content category coverImage metaTitle metaDescription links likes comments createdAt updatedAt")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      NazmModel.countDocuments(filter),
    ]);

    // GET ALL CATEGORIES & POETS (for filters)
    const [allCategories, allPoets] = await Promise.all([
      NazmModel.distinct("category"),
      NazmModel.distinct("takhallus"),
    ]);

    const responseTime = performance.now() - startTime;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // BUILD RESPONSE
    const responseData = {
      success: true,
      message: "Nazms fetched successfully (نظمیں حاصل ہوگئیں)",
      data: {
        nazms,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev,
          nextPage: hasNext ? page + 1 : null,
          prevPage: hasPrev ? page - 1 : null,
        },
        filters: {
          search: search || null,
          category: category || null,
          takhallus: takhallus || null,
          availableCategories: allCategories,
          availablePoets: allPoets,
        },
        sort: {
          field: sortBy,
          order: sortOrder,
        },
        meta: {
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    // STORE IN CACHE
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Cache": "MISS",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Deewan Nazm Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch nazms (نظمیں حاصل نہیں ہو سکیں)",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}