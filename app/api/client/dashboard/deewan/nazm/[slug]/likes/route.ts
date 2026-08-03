// app/api/client/dashboard/deewan/nazm/[slug]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import NazmModel from "@/models/kalam/nazm.model";
import jwt from "jsonwebtoken";

// GET - Get Like Status & Count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get user from token if available
    const userToken = request.cookies.get("UserCookie")?.value;
    let userId = null;

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string) as any;
        userId = decoded._id;
      } catch {
        // Token invalid, continue as guest
      }
    }

    const nazm = await NazmModel.findOne({ slug })
      .select("likes")
      .lean();

    if (!nazm) {
      return NextResponse.json(
        {
          success: false,
          message: "Nazm not found (نظم نہیں ملی)",
          data: null,
          err: "NAZM_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const likesCount = nazm.likes?.length || 0;
    const isLiked = userId ? nazm.likes?.some((id: any) => id.toString() === userId) || false : false;

    return NextResponse.json(
      {
        success: true,
        message: "Likes fetched successfully (پسندیدگی حاصل ہوگئی)",
        data: {
          likesCount,
          isLiked,
          userId: userId || null,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Nazm Likes Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch likes (پسندیدگی حاصل نہیں ہو سکی)",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST - Like a Nazm
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get user from token
    const userToken = request.cookies.get("UserCookie")?.value;
    if (!userToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to like (پسند کرنے کے لیے لاگ ان ضروری ہے)",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid token (غلط ٹوکن)",
          data: null,
          err: "INVALID_TOKEN",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = decoded._id;

    const nazm = await NazmModel.findOne({ slug });

    if (!nazm) {
      return NextResponse.json(
        {
          success: false,
          message: "Nazm not found (نظم نہیں ملی)",
          data: null,
          err: "NAZM_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Initialize likes array if it doesn't exist
    if (!nazm.likes) {
      nazm.likes = [];
    }

    // Check if already liked
    const isLiked = nazm.likes.some((id: any) => id.toString() === userId);

    let action = "";
    let message = "";

    if (isLiked) {
      // Remove like (unlike)
      nazm.likes = nazm.likes.filter((id: any) => id.toString() !== userId);
      action = "unliked";
      message = "Like removed (پسند واپس لی گئی)";
    } else {
      // Add like
      nazm.likes.push(userId);
      action = "liked";
      message = "Nazm liked (نظم پسند آئی)";
    }

    await nazm.save();

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          action,
          likesCount: nazm.likes.length,
          isLiked: !isLiked,
          userId,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Nazm Like Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process like (پسند نہیں ہو سکی)",
        data: null,
        err: "LIKE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
