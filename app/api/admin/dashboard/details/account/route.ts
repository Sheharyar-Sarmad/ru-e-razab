import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import AdminAccountModel from "@/models/auth/admin.account.model";
import jwt from "jsonwebtoken";

interface AdminTokenPayload {
  sub: string;
  _id: string;
  accountname: string;
  email: string;
  firstname: string;
  lastname: string;
  phonenumber: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get AdminCookie
    const adminCookie = request.cookies.get("AdminCookie")?.value;

    if (!adminCookie) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication required",
          data: null,
          err: "UNAUTHORIZED",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    // Verify JWT
    const decoded = jwt.verify(
      adminCookie,
      EnvSecrets.jwtSecret as string,
    ) as AdminTokenPayload;

    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Fetch admin details
    const admin = await AdminAccountModel.findById(decoded.sub).lean();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin account not found",
          data: null,
          err: "ADMIN_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Admin details fetched successfully",
        data: admin,
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (err) {
    console.error(
      `Admin Details Error: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin details",
        data: null,
        err: err instanceof Error ? err.message : "Unknown error",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
