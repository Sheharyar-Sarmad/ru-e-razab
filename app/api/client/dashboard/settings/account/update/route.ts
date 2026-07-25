// app/api/client/dashboard/settings/account/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import UserAccountModel from "@/models/auth/user.account.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10; 

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PHONE_REGEX = /^(\+\d{1,3}[- ]?)?\d{10,14}$/;
const NAME_REGEX = /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/;

const getConnection = async () => {
  if (isConnected) return;
  if (connectionPromise) {
    await connectionPromise;
    return;
  }
  connectionPromise = (async () => {
    await ConnectDB(EnvSecrets.mongoUri as string);
    isConnected = true;
  })();
  await connectionPromise;
};

export async function PATCH(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Token verification
    const userToken = request.cookies.get("UserCookie")?.value;
    if (!userToken) {
      return errorResponse("User authentication required", "UNAUTHORIZED", 401);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(userToken, EnvSecrets.jwtSecret as string);
    } catch {
      return errorResponse("Invalid or expired token", "INVALID_TOKEN", 401);
    }

    const userId = decoded.sub;

    // 2. Database connection (cached)
    await getConnection();

    // 3. Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", "INVALID_JSON", 400);
    }

    const { firstname, lastname, email, phonenumber, currentPassword, newPassword } = body;

    // 4. Build update object
    const updateData: any = {};
    let needsPasswordCheck = false;
    let hasUpdates = false;

    if (firstname !== undefined) {
      if (firstname.length < 2 || firstname.length > 50 || !NAME_REGEX.test(firstname)) {
        return errorResponse("Invalid first name", "INVALID_FIRSTNAME", 400);
      }
      updateData.firstname = firstname.trim();
      hasUpdates = true;
    }

    if (lastname !== undefined) {
      if (lastname.length < 2 || lastname.length > 50 || !NAME_REGEX.test(lastname)) {
        return errorResponse("Invalid last name", "INVALID_LASTNAME", 400);
      }
      updateData.lastname = lastname.trim();
      hasUpdates = true;
    }

    if (email !== undefined) {
      if (!EMAIL_REGEX.test(email)) {
        return errorResponse("Invalid email address", "INVALID_EMAIL", 400);
      }
      updateData.email = email.toLowerCase().trim();
      hasUpdates = true;
    }

    if (phonenumber !== undefined) {
      if (!PHONE_REGEX.test(phonenumber)) {
        return errorResponse("Invalid phone number", "INVALID_PHONENUMBER", 400);
      }
      updateData.phonenumber = phonenumber;
      hasUpdates = true;
    }

    if (newPassword !== undefined && newPassword !== "") {
      needsPasswordCheck = true;
      
      if (newPassword.length < 8) {
        return errorResponse("Password must be at least 8 characters", "INVALID_PASSWORD_LENGTH", 400);
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || 
          !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return errorResponse(
          "Password must contain uppercase, lowercase, number, and special character",
          "INVALID_PASSWORD_FORMAT",
          400
        );
      }
      
      if (!currentPassword) {
        return errorResponse("Current password required", "CURRENT_PASSWORD_REQUIRED", 400);
      }
      
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return errorResponse("No fields to update", "NO_FIELDS_TO_UPDATE", 400);
    }

    // 6. Duplicate check
    if (email !== undefined) {
      const existingEmail = await UserAccountModel.findOne({
        email: updateData.email,
        _id: { $ne: userId }
      }).select("_id").lean();

      if (existingEmail) {
        return errorResponse("Email already in use", "EMAIL_EXISTS", 409);
      }
    }

    if (phonenumber !== undefined && phonenumber) {
      const existingPhone = await UserAccountModel.findOne({
        phonenumber: updateData.phonenumber,
        _id: { $ne: userId }
      }).select("_id").lean();

      if (existingPhone) {
        return errorResponse("Phone number already in use", "PHONE_EXISTS", 409);
      }
    }

    if (needsPasswordCheck) {
      const user = await UserAccountModel.findById(userId)
        .select("password")
        .lean();

      if (!user) {
        return errorResponse("User not found", "USER_NOT_FOUND", 404);
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return errorResponse("Current password is incorrect", "INVALID_CURRENT_PASSWORD", 401);
      }

      updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    const updateResult = await UserAccountModel.updateOne(
      { _id: userId },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return errorResponse("User not found", "USER_NOT_FOUND", 404);
    }

    const responseTime = performance.now() - startTime;

    // 9. Fetch user if email changed
    let newToken = null;
    let userData = null;

    if (email !== undefined) {
      const user = await UserAccountModel.findById(userId)
        .select("_id accountname firstname lastname email phonenumber")
        .lean();

      if (user) {
        userData = user;
        newToken = jwt.sign(
          {
            sub: user._id.toString(),
            _id: user._id,
            accountname: user.accountname,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            phonenumber: user.phonenumber,
          },
          EnvSecrets.jwtSecret as string,
          { expiresIn: "30d" }
        );
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Account updated successfully",
        data: {
          user: userData || null,
          updated: true,
          emailUpdated: email !== undefined,
          passwordUpdated: newPassword !== undefined && newPassword !== "",
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );

    if (newToken) {
      response.cookies.set("UserToken", newToken, {
        httpOnly: true,
        secure: EnvSecrets.appEnv === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error(`Update Error: ${err instanceof Error ? err.message : "Unknown"}`);
    return errorResponse("Failed to update account", "UPDATE_ERROR", 500);
  }
}

function errorResponse(message: string, err: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      err,
      status,
    },
    { status }
  );
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}