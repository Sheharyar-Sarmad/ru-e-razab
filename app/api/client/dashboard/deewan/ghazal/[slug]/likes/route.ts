// app/api/client/dashboard/deewan-e-ghazal/[slug]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
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
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const likesCount = ghazal.likes?.length || 0;
    const dislikesCount = ghazal.dislikes?.length || 0;
    const isLiked = userId ? ghazal.likes?.includes(userId) || false : false;
    const isDisliked = userId ? ghazal.dislikes?.includes(userId) || false : false;

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
      { status: HTTP_STATUS.OK }
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
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST - Like a Ghazal
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
          message: "Authentication required to react",
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
          message: "Invalid token",
          data: null,
          err: "INVALID_TOKEN",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = decoded._id;

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
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Initialize arrays if they don't exist
    if (!ghazal.likes) ghazal.likes = [];
    if (!ghazal.dislikes) ghazal.dislikes = [];

    // Check current reactions
    const isLiked = ghazal.likes.includes(userId);
    const isDisliked = ghazal.dislikes.includes(userId);

    let action = "";
    let message = "";

    if (reaction === "like") {
      if (isLiked) {
        // Remove like (undo)
        ghazal.likes = ghazal.likes.filter((id) => id.toString() !== userId);
        action = "unliked";
        message = "Like removed";
      } else {
        // Add like
        ghazal.likes.push(userId);
        // Remove dislike if exists
        if (isDisliked) {
          ghazal.dislikes = ghazal.dislikes.filter((id) => id.toString() !== userId);
        }
        action = "liked";
        message = "Ghazal liked";
      }
    } else if (reaction === "dislike") {
      if (isDisliked) {
        // Remove dislike (undo)
        ghazal.dislikes = ghazal.dislikes.filter((id) => id.toString() !== userId);
        action = "undisliked";
        message = "Dislike removed";
      } else {
        // Add dislike
        ghazal.dislikes.push(userId);
        // Remove like if exists
        if (isLiked) {
          ghazal.likes = ghazal.likes.filter((id) => id.toString() !== userId);
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
          isLiked: ghazal.likes.includes(userId),
          isDisliked: ghazal.dislikes.includes(userId),
          userId,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
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
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// DELETE - Remove Reaction (Unlike/Undislike)
export async function DELETE(
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
          message: "Authentication required",
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
          message: "Invalid token",
          data: null,
          err: "INVALID_TOKEN",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const userId = decoded._id;

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
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Check if user has any reaction
    const isLiked = ghazal.likes?.includes(userId) || false;
    const isDisliked = ghazal.dislikes?.includes(userId) || false;

    if (!isLiked && !isDisliked) {
      return NextResponse.json(
        {
          success: false,
          message: "No reaction found to remove",
          data: null,
          err: "NO_REACTION",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Remove both like and dislike
    if (isLiked) {
      ghazal.likes = ghazal.likes.filter((id) => id.toString() !== userId);
    }
    if (isDisliked) {
      ghazal.dislikes = ghazal.dislikes.filter((id) => id.toString() !== userId);
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
      { status: HTTP_STATUS.OK }
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
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}