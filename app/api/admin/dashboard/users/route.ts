// app/api/admin/dashboard/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import UserAccountModel from "@/models/auth/user.account.model";

// CACHE IMPLEMENTATION

// In-memory cache store
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute (shorter for admin data)

// HELPER: Get cache key
function getCacheKey(
  page: number,
  limit: number,
  search: string,
  sortBy: string,
  sortOrder: string
): string {
  return `users:${page}:${limit}:${search}:${sortBy}:${sortOrder}`;
}

// HELPER: Clear cache
export function clearUsersCache() {
  cache.clear();
  console.log("Users cache cleared");
}

// OPTIMIZED GET - All Users with Search & Pagination
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "9");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const skip = (page - 1) * limit;

    // 🔥 CHECK CACHE FIRST
    const cacheKey = getCacheKey(page, limit, search, sortBy, sortOrder);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache HIT for: ${cacheKey}`);
      return NextResponse.json(cached.data, {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${(performance.now() - startTime).toFixed(2)}ms`,
          "X-Cache": "HIT",
          "X-Cache-TTL": `${Math.floor((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000)}s`,
        },
      });
    }

    console.log(`Cache MISS for: ${cacheKey}`);

    // BUILD FILTER

    // OPTIMIZED: Build search filter with $or and regex
    let filter: any = {};

    if (search) {
      // Use regex with case-insensitive for partial search
      const searchRegex = { $regex: search, $options: "i" };
      filter = {
        $or: [
          { accountname: searchRegex },
          { firstname: searchRegex },
          { lastname: searchRegex },
          { email: searchRegex },
          { phonenumber: searchRegex },
        ],
      };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // EXECUTE QUERY

    // OPTIMIZED: Use hint to force index usage
    const query = UserAccountModel.find(filter)
      .select("_id accountname firstname lastname email phonenumber createdAt updatedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    try {
      if (search) {
        query.hint("user_search_compound_idx");
      } else {
        query.hint("created_at_desc_idx");
      }
    } catch (error) {
      console.warn("Index hint failed, using default query plan");
    }

    const [users, total] = await Promise.all([
      query.exec(),
      UserAccountModel.countDocuments(filter),
    ]);

    const responseTime = performance.now() - startTime;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // BUILD RESPONSE

    const responseData = {
      success: true,
      message: "Users fetched successfully",
      data: {
        users,
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
        search: search || null,
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

    console.log(`Cached: ${cacheKey}`);

    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Cache": "MISS",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Admin Users Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

