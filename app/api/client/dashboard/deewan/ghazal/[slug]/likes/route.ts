// app/api/client/dashboard/deewan-e-ghazal/[slug]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import jwt from "jsonwebtoken";

/* =========================================================
   ARRAY HELPERS
   likes/dislikes hold ObjectIds, but userId from the JWT is a
   string. Array.includes() compares by reference, so it would
   ALWAYS be false for ObjectId vs string. Compare as strings.
========================================================= */

function hasUser(arr: any[] | undefined | null, userId: string): boolean {
  return !!arr?.some((id: any) => String(id) === userId);
}

function withoutUser(arr: any[] | undefined | null, userId: string): any[] {
  return (arr ?? []).filter((id: any) => String(id) !== userId);
}

// GET - Get Like Status & Count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get user from token if available
    const userToken = request.cookies.get("UserCookie")?.value;
    let userId: string | null = null;

    if (userToken) {
      try {
        const decoded = jwt.verify(
          userToken,
          EnvSecrets.jwtSecret as string,
        ) as any;
        userId = decoded._id ? String(decoded._id) : null;
      } catch {
        // Token invalid, continue as guest
      }
    }

    const ghazal = await GhazalModel.findOne({ slug })
      .select("likes dislikes")
      .lean();

    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    const likesCount = ghazal.likes?.length || 0;
    const dislikesCount = ghazal.dislikes?.length || 0;
    const isLiked = userId ? hasUser(ghazal.likes as any[], userId) : false;
    const isDisliked = userId
      ? hasUser(ghazal.dislikes as any[], userId)
      : false;

    return NextResponse.json(
      {
        success: true,
        message: "Likes fetched successfully",
        data: {
          likesCount,
          dislikesCount,
          isLiked,
          isDisliked,
          userId: userId || null,
          totalReactions: likesCount + dislikesCount,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    console.error("Likes Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch likes",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// POST - Like / Dislike a Ghazal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
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
          message: "Authentication required to react",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid token",
          data: null,
          err: "INVALID_TOKEN",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const userId = String(decoded._id);

    // Parse body for reaction type
    const body = await request.json();
    const { reaction } = body; // "like" or "dislike"

    if (!reaction || (reaction !== "like" && reaction !== "dislike")) {
      return NextResponse.json(
        {
          success: false,
          message: "Reaction must be 'like' or 'dislike'",
          data: null,
          err: "INVALID_REACTION",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const ghazal = await GhazalModel.findOne({ slug });

    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Initialize arrays if they don't exist
    if (!ghazal.likes) ghazal.likes = [];
    if (!ghazal.dislikes) ghazal.dislikes = [];

    // Check current reactions
    const isLiked = hasUser(ghazal.likes as any[], userId);
    const isDisliked = hasUser(ghazal.dislikes as any[], userId);

    let action = "";
    let message = "";

    if (reaction === "like") {
      if (isLiked) {
        // Remove like (undo)
        ghazal.likes = withoutUser(ghazal.likes as any[], userId) as any;
        action = "unliked";
        message = "Like removed";
      } else {
        // Add like
        (ghazal.likes as any[]).push(userId);
        // Remove dislike if exists
        if (isDisliked) {
          ghazal.dislikes = withoutUser(
            ghazal.dislikes as any[],
            userId,
          ) as any;
        }
        action = "liked";
        message = "Ghazal liked";
      }
    } else if (reaction === "dislike") {
      if (isDisliked) {
        // Remove dislike (undo)
        ghazal.dislikes = withoutUser(ghazal.dislikes as any[], userId) as any;
        action = "undisliked";
        message = "Dislike removed";
      } else {
        // Add dislike
        (ghazal.dislikes as any[]).push(userId);
        // Remove like if exists
        if (isLiked) {
          ghazal.likes = withoutUser(ghazal.likes as any[], userId) as any;
        }
        action = "disliked";
        message = "Ghazal disliked";
      }
    }

    await ghazal.save();

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          action,
          reaction,
          likesCount: ghazal.likes.length,
          dislikesCount: ghazal.dislikes.length,
          isLiked: hasUser(ghazal.likes as any[], userId),
          isDisliked: hasUser(ghazal.dislikes as any[], userId),
          userId,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    console.error("Like/Dislike Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process reaction",
        data: null,
        err: "REACTION_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// DELETE - Remove Reaction (Unlike/Undislike)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
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
          message: "Authentication required",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid token",
          data: null,
          err: "INVALID_TOKEN",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const userId = String(decoded._id);

    const ghazal = await GhazalModel.findOne({ slug });

    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Check if user has any reaction
    const isLiked = hasUser(ghazal.likes as any[], userId);
    const isDisliked = hasUser(ghazal.dislikes as any[], userId);

    if (!isLiked && !isDisliked) {
      return NextResponse.json(
        {
          success: false,
          message: "No reaction found to remove",
          data: null,
          err: "NO_REACTION",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Remove both like and dislike
    if (isLiked) {
      ghazal.likes = withoutUser(ghazal.likes as any[], userId) as any;
    }
    if (isDisliked) {
      ghazal.dislikes = withoutUser(ghazal.dislikes as any[], userId) as any;
    }

    await ghazal.save();

    return NextResponse.json(
      {
        success: true,
        message: "Reaction removed successfully",
        data: {
          likesCount: ghazal.likes.length,
          dislikesCount: ghazal.dislikes.length,
          isLiked: false,
          isDisliked: false,
          userId,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    console.error("Remove Reaction Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove reaction",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}