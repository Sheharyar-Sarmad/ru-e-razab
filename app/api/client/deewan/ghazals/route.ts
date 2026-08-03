// app/api/admin/dashboard/deewan-e-ghazal/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";

const cache = new Map();
const CACHE_TTL = 60000;

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "6");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Cache key
    const cacheKey = `deewan:${page}:${limit}:${search}`;

    // Check cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data, {
          headers: {
            "X-Response-Time": `${(performance.now() - startTime).toFixed(2)}ms`,
            "X-Cache": "HIT",
          },
        });
      }
    }

    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Build filter
    const filter: any = {};
    if (search) {
      filter["content.0.lines.0"] = { $regex: search, $options: "i" };
    }

    let query = GhazalModel.find(filter)
      .select("takhallus slug content category coverImage createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Execute queries in parallel with try-catch for each
    try {
      const [ghazals, total] = await Promise.all([
        query.exec(),
        GhazalModel.countDocuments(filter),
      ]);

      const responseTime = performance.now() - startTime;

      const responseData = {
        success: true,
        message: search ? "Search results fetched successfully" : "Deewan-e-Ghazal fetched successfully",
        data: {
          ghazals,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
          search: search || null,
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
        err: null,
        status: HTTP_STATUS.OK,
      };

      // Store in cache
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      return NextResponse.json(responseData, {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "X-Cache": "MISS",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    } catch (queryError) {
      console.error("Query Error:", queryError);
      return NextResponse.json(
        {
          success: false,
          message: "Database query failed",
          data: null,
          err: "QUERY_ERROR",
          details: queryError instanceof Error ? queryError.message : String(queryError),
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  } catch (error) {
    console.error("Deewan-e-Ghazal Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch deewan-e-ghazal",
        data: null,
        err: "FETCH_ERROR",
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === "development" ? error instanceof Error ? error.stack : undefined : undefined,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}