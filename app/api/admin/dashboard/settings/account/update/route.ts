// app/api/admin/dashboard/settings/account/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import AdminAccountModel from "@/models/auth/admin.account";
import bcrypt from "bcrypt";
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

export async function PATCH(request: NextRequest) {
  try {
    // 1. Get AdminCookie
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

    // 2. Verify JWT and get admin ID
    const decoded = jwt.verify(
      adminCookie,
      EnvSecrets.jwtSecret as string,
    ) as AdminTokenPayload;

    const adminId = decoded.sub;

    // 3. Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // 4. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          data: null,
          err: "INVALID_JSON",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const {
      firstname,
      lastname,
      email,
      phonenumber,
      currentPassword,
      newPassword,
    } = body;

    // 5. Find existing admin with password
    const admin = await AdminAccountModel.findById(adminId).select("+password");

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

    // 6. Prepare update object
    const updateData: any = {};

    // 7. Validate and update fields
    if (firstname !== undefined) {
      if (firstname.length < 2 || firstname.length > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "First name must be between 2 and 50 characters",
            data: null,
            err: "INVALID_FIRSTNAME",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }
      updateData.firstname = firstname.trim();
    }

    if (lastname !== undefined) {
      if (lastname.length < 2 || lastname.length > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Last name must be between 2 and 50 characters",
            data: null,
            err: "INVALID_LASTNAME",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }
      updateData.lastname = lastname.trim();
    }

    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter a valid email address",
            data: null,
            err: "INVALID_EMAIL",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      // Check if email is already used by another admin
      const existingEmail = await AdminAccountModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: adminId },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Email is already in use",
            data: null,
            err: "EMAIL_EXISTS",
            status: HTTP_STATUS.CONFLICT,
          },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (phonenumber !== undefined) {
      // Validate phone number format (E.164)
      const phoneRegex = /^\+[1-9]\d{7,14}$/;
      if (!phoneRegex.test(phonenumber)) {
        return NextResponse.json(
          {
            success: false,
            message: "Phone number must be in international format (e.g., +923001234567)",
            data: null,
            err: "INVALID_PHONENUMBER",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      // Check if phone is already used by another admin
      const existingPhone = await AdminAccountModel.findOne({
        phonenumber,
        _id: { $ne: adminId },
      });
      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            message: "Phone number is already in use",
            data: null,
            err: "PHONE_EXISTS",
            status: HTTP_STATUS.CONFLICT,
          },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
      updateData.phonenumber = phonenumber;
    }

    // 8. Handle password change
    if (newPassword !== undefined && newPassword !== "") {
      // Current password is required to change password
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "Current password is required to change password",
            data: null,
            err: "CURRENT_PASSWORD_REQUIRED",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            message: "Current password is incorrect",
            data: null,
            err: "INVALID_CURRENT_PASSWORD",
            status: HTTP_STATUS.UNAUTHORIZED,
          },
          { status: HTTP_STATUS.UNAUTHORIZED },
        );
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must be at least 8 characters long",
            data: null,
            err: "INVALID_PASSWORD_LENGTH",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      if (newPassword.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message: "Password cannot exceed 100 characters",
            data: null,
            err: "INVALID_PASSWORD_LENGTH",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      // Check for uppercase, lowercase, number, and special character
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must contain uppercase, lowercase, number, and special character",
            data: null,
            err: "INVALID_PASSWORD_FORMAT",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    // 9. Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields to update. Please provide at least one field.",
          data: null,
          err: "NO_FIELDS_TO_UPDATE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // 10. Update admin
    const updatedAdmin = await AdminAccountModel.findByIdAndUpdate(
      adminId,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!updatedAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update admin account",
          data: null,
          err: "UPDATE_FAILED",
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // 11. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Account updated successfully",
        data: {
          id: updatedAdmin._id,
          accountname: updatedAdmin.accountname,
          firstname: updatedAdmin.firstname,
          lastname: updatedAdmin.lastname,
          email: updatedAdmin.email,
          phonenumber: updatedAdmin.phonenumber,
          updatedAt: updatedAdmin.updatedAt,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK },
    );

  } catch (err) {
    console.error(
      `Update Admin Account Error: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update admin account",
        data: null,
        err: err instanceof Error ? err.message : "Unknown error",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Support PUT as well (full update)
export async function PUT(request: NextRequest) {
  return PATCH(request);
}