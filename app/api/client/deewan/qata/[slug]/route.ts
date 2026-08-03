// app/api/admin/dashboard/deewan/qata/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import QataModel from "@/models/kalam/qata.model";

// CACHE

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour for single qata

// GET - Fetch Single Qata by Slug

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();

  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // UNWRAP params with await
    const { slug } = await params;

    // Validate slug
    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug is required",
          data: null,
          err: "SLUG_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // CHECK CACHE

    const cacheKey = `qata:${slug}`;
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

    // FIND QATA BY SLUG

    const qata = await QataModel.findOne({ slug })
      .select(
        "takhallus slug content category coverImage metaTitle metaDescription links likes comments createdAt updatedAt"
      )
      .lean()
      .exec();

    // Check if qata exists
    if (!qata) {
      return NextResponse.json(
        {
          success: false,
          message: "Qata not found",
          data: null,
          err: "QATA_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // GET LIKES & COMMENTS COUNT

    const likesCount = qata.likes?.length || 0;
    const commentsCount = qata.comments?.length || 0;

    const responseTime = performance.now() - startTime;

    // BUILD RESPONSE

    const responseData = {
      success: true,
      message: "Qata fetched successfully",
      data: {
        qata: {
          ...qata,
          likesCount,
          commentsCount,
        },
        meta: {
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
      },
      err: null,
      status: HTTP_STATUS.OK,
    };

    // 💾 STORE IN CACHE

    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    // Return response
    return NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Single Qata Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch qata",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}