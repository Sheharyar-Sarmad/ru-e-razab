// app/api/admin/dashboard/deewan-e-ghazal/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";

// ============================================
// GET - Fetch Single Ghazal by Slug
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }  // ← Make params a Promise
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

    // Find ghazal by slug (using indexed field for fast lookup)
    const ghazal = await GhazalModel.findOne({ slug })
      .select("takhallus slug content category coverImage likes comments createdAt updatedAt")
      .lean()
      .exec();

    // Check if ghazal exists
    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const responseTime = performance.now() - startTime;

    // Return response
    return NextResponse.json(
      {
        success: true,
        message: "Ghazal fetched successfully",
        data: {
          ghazal,
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Single Ghazal Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch ghazal",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}