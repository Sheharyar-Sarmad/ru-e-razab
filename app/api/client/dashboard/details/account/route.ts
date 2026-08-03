// app/api/client/dashboard/user/details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import UserAccountModel from "@/models/auth/user.account.model";

// GET - Get User Details
export async function GET(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Get user from cookie (already verified by proxy)
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

    // Decode token to get userId
    let userId = null;
    try {
      const decoded = JSON.parse(
        Buffer.from(userToken.split(".")[1], "base64").toString()
      );
      userId = decoded._id;
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

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID not found in token",
          data: null,
          err: "USER_ID_NOT_FOUND",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Find user by ID (exclude password)
    const user = await UserAccountModel.findById(userId)
      .select("accountname firstname lastname email phonenumber createdAt updatedAt")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
          data: null,
          err: "USER_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User details fetched successfully",
        data: {
          user: {
            id: user._id,
            accountname: user.accountname,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            phonenumber: user.phonenumber,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("User Details Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user details",
        data: null,
        err: "FETCH_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}