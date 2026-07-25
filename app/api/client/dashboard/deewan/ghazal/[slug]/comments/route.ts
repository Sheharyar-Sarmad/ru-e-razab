// app/api/client/dashboard/deewan/ghazal/[slug]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import UserAccountModel from "@/models/auth/user.account.model";  // ✅ Add this import
import jwt from "jsonwebtoken";

// ============================================
// GET - Get All Comments with Status
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get user from token for comment status
    const userToken = request.cookies.get("UserToken")?.value;
    let userId = null;

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string) as any;
        userId = decoded._id;
      } catch {
        // Token invalid, continue as guest
      }
    }

    // ✅ Now populate should work with UserAccount model imported
    const ghazal = await GhazalModel.findOne({ slug })
      .select("comments")
      .populate("comments.user", "firstname lastname email accountname")
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

    const allComments = ghazal.comments || [];
    const total = allComments.length;
    const paginatedComments = allComments.slice(skip, skip + limit);

    // Check if user has commented
    const hasUserCommented = userId 
      ? allComments.some((c: any) => c.user?._id?.toString() === userId || c.user?.toString() === userId)
      : false;

    return NextResponse.json(
      {
        success: true,
        message: "Comments fetched successfully",
        data: {
          comments: paginatedComments,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
          status: {
            totalComments: total,
            hasUserCommented,
            userId: userId || null,
            isAuthenticated: !!userId,
          },
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Get Comments Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch comments",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// ============================================
// POST - Add Comment
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get user from token
    const userToken = request.cookies.get("UserToken")?.value;
    if (!userToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to comment",
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

    // Parse body
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment content is required",
          data: null,
          err: "COMMENT_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment cannot exceed 500 characters",
          data: null,
          err: "COMMENT_TOO_LONG",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Find ghazal
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

    // Initialize comments array if it doesn't exist
    if (!ghazal.comments) {
      ghazal.comments = [];
    }

    // Add comment
    ghazal.comments.push({
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    });

    await ghazal.save();

    // Get the updated ghazal with populated user
    const updatedGhazal = await GhazalModel.findOne({ slug })
      .select("comments")
      .populate("comments.user", "firstname lastname email accountname")
      .lean();

    const allComments = updatedGhazal?.comments || [];
    const newComment = allComments[allComments.length - 1] || null;

    return NextResponse.json(
      {
        success: true,
        message: "✅ Comment added successfully",
        data: {
          comment: newComment,
          status: {
            totalComments: allComments.length,
            hasUserCommented: true,
            userId,
            isAuthenticated: true,
          },
        },
        err: null,
        status: HTTP_STATUS.CREATED,
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error("Add Comment Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add comment",
        data: null,
        err: "COMMENT_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// ============================================
// DELETE - Delete Comment
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get commentId from query params
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment ID is required",
          data: null,
          err: "COMMENT_ID_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get user from token
    const userToken = request.cookies.get("UserToken")?.value;
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

    // Find ghazal
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

    // Find comment index
    const commentIndex = ghazal.comments.findIndex(
      (c) => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment not found",
          data: null,
          err: "COMMENT_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const comment = ghazal.comments[commentIndex];

    // Check if user owns the comment OR is admin
    const isAdmin = decoded.role === "admin" || decoded.role === "super_admin";
    const isOwner = comment.user.toString() === userId;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only delete your own comments",
          data: null,
          err: "FORBIDDEN",
          status: HTTP_STATUS.FORBIDDEN,
        },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Remove comment
    ghazal.comments.splice(commentIndex, 1);
    await ghazal.save();

    // Check if user has any other comments
    const hasUserCommented = ghazal.comments.some(
      (c) => c.user.toString() === userId
    );

    return NextResponse.json(
      {
        success: true,
        message: "✅ Comment deleted successfully",
        data: {
          deletedCommentId: commentId,
          status: {
            totalComments: ghazal.comments.length,
            hasUserCommented,
            userId,
            isAuthenticated: true,
          },
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete comment",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}