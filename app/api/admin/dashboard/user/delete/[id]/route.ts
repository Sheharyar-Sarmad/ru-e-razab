// app/api/admin/dashboard/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import UserAccountModel from "@/models/auth/user.account.model";

// DELETE - Delete User by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { id } = await params;

    // Validate ID
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
          data: null,
          err: "USER_ID_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check if user exists
    const user = await UserAccountModel.findById(id).lean();

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

    // Delete user
    await UserAccountModel.findByIdAndDelete(id);

    // Clear cache (if you have caching in the GET route)
    // You can import and call clearUsersCache() if needed

    return NextResponse.json(
      {
        success: true,
        message: "User deleted successfully",
        data: {
          deletedUser: {
            id: user._id,
            accountname: user.accountname,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
          },
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}