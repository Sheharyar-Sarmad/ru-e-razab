// app/api/client/dashboard/deewan/ghazal/[slug]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import GhazalModel from "@/models/kalam/ghazals.model";
import UserAccountModel from "@/models/auth/user.account.model";

// GET - Get All Comments with Status
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

    // Get user from token (already verified by proxy)
    const userToken = request.cookies.get("UserCookie")?.value;
    let userId = null;

    if (userToken) {
      try {
        const decoded = JSON.parse(
          Buffer.from(userToken.split(".")[1], "base64").toString()
        );
        userId = decoded._id;
      } catch {
        // Token invalid
      }
    }

    const ghazal = await GhazalModel.findOne({ slug })
      .select("comments")
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

    // Manual population: Get user data for all comments
    let commentsWithUser = [];
    
    if (allComments.length > 0) {
      const userIds = [...new Set(
        allComments
          .map((c: any) => c.user?.toString())
          .filter(Boolean)
      )];

      const users = await UserAccountModel.find({
        _id: { $in: userIds }
      })
        .select("firstname lastname email accountname")
        .lean();

      const userMap = new Map();
      users.forEach((user: any) => {
        userMap.set(user._id.toString(), user);
      });

      commentsWithUser = allComments.map((comment: any) => ({
        ...comment,
        user: userMap.get(comment.user?.toString()) || null,
      }));
    } else {
      commentsWithUser = allComments;
    }

    const total = commentsWithUser.length;
    const paginatedComments = commentsWithUser.slice(skip, skip + limit);

    const hasUserCommented = userId 
      ? allComments.some((c: any) => c.user?.toString() === userId)
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

// POST - Add Comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Get user from cookie (already verified by proxy)
    const userToken = request.cookies.get("UserCookie")?.value;
    let userId = null;

    if (userToken) {
      try {
        const decoded = JSON.parse(
          Buffer.from(userToken.split(".")[1], "base64").toString()
        );
        userId = decoded._id;
      } catch {
        // Invalid token
      }
    }

    if (!userId) {
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

    const body = await request.json();
    const { content } = body;

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

    if (!ghazal.comments) {
      ghazal.comments = [];
    }

    const newComment = {
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    };

    ghazal.comments.push(newComment);
    await ghazal.save();

    const user = await UserAccountModel.findById(userId)
      .select("firstname lastname email accountname")
      .lean();

    const commentWithUser = {
      ...newComment,
      _id: ghazal.comments[ghazal.comments.length - 1]._id,
      user,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Comment added successfully",
        data: {
          comment: commentWithUser,
          status: {
            totalComments: ghazal.comments.length,
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

// DELETE - Delete Comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

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

    // Get user from cookie (already verified by proxy)
    const userToken = request.cookies.get("UserCookie")?.value;
    let userId = null;
    let decoded: any = {};

    if (userToken) {
      try {
        decoded = JSON.parse(
          Buffer.from(userToken.split(".")[1], "base64").toString()
        );
        userId = decoded._id;
      } catch {
        // Invalid token
      }
    }

    if (!userId) {
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

    ghazal.comments.splice(commentIndex, 1);
    await ghazal.save();

    const hasUserCommented = ghazal.comments.some(
      (c) => c.user.toString() === userId
    );

    return NextResponse.json(
      {
        success: true,
        message: "Comment deleted successfully",
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