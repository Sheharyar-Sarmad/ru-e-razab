// app/api/auth/signup/route.ts
import { ConnectDB } from "@/db/connect.db";
import { NextResponse, NextRequest } from "next/server";
import EnvSecrets from "@/config/env.secrets";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import UserAccountModel from "@/models/auth/user.account.model";

// POST - User Signup
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Parse request body
    const body = await request.json();

    const { accountname, firstname, lastname, password, phonenumber, email } = body;

    // VALIDATION

    // 1. Check required fields
    if (!accountname || !firstname || !lastname || !password || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields except phone number are required",
          data: null,
          err: "MISSING_FIELDS",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 2. Validate accountname (3-50 chars, lowercase, letters, numbers, underscores)
    if (accountname.length < 3 || accountname.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Account name must be between 3 and 50 characters",
          data: null,
          err: "INVALID_ACCOUNTNAME_LENGTH",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!/^[a-z0-9_]+$/.test(accountname)) {
      return NextResponse.json(
        {
          success: false,
          message: "Account name can only contain lowercase letters, numbers, and underscores",
          data: null,
          err: "INVALID_ACCOUNTNAME",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 3. Validate firstname (2-50 chars, letters, spaces, hyphens, apostrophes)
    if (firstname.length < 2 || firstname.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "First name must be between 2 and 50 characters",
          data: null,
          err: "INVALID_FIRSTNAME_LENGTH",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!/^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/.test(firstname)) {
      return NextResponse.json(
        {
          success: false,
          message: "First name contains invalid characters",
          data: null,
          err: "INVALID_FIRSTNAME",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 4. Validate lastname (2-50 chars, letters, spaces, hyphens, apostrophes)
    if (lastname.length < 2 || lastname.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Last name must be between 2 and 50 characters",
          data: null,
          err: "INVALID_LASTNAME_LENGTH",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!/^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/.test(lastname)) {
      return NextResponse.json(
        {
          success: false,
          message: "Last name contains invalid characters",
          data: null,
          err: "INVALID_LASTNAME",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 5. Validate password (8-100 chars, uppercase, lowercase, number, special char)
    if (password.length < 8 || password.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be between 8 and 100 characters",
          data: null,
          err: "INVALID_PASSWORD_LENGTH",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must contain at least one uppercase, one lowercase, one number, and one special character",
          data: null,
          err: "INVALID_PASSWORD",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 6. Validate phone number (optional, 10-14 digits with optional country code)
    if (phonenumber) {
      if (!/^(\+\d{1,3}[- ]?)?\d{10,14}$/.test(phonenumber)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter a valid phone number",
            data: null,
            err: "INVALID_PHONENUMBER",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    // 7. Validate email (max 254 chars, valid email format)
    if (email.length > 254) {
      return NextResponse.json(
        {
          success: false,
          message: "Email cannot exceed 254 characters",
          data: null,
          err: "INVALID_EMAIL_LENGTH",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

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
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // CHECK FOR DUPLICATES
    const duplicateUser = await UserAccountModel.findOne({
      $or: [
        { accountname: accountname.toLowerCase() },
        { email: email.toLowerCase() },
        ...(phonenumber ? [{ phonenumber }] : []),
      ],
    })
      .select("_id")
      .lean();

    if (duplicateUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this account name, email, or phone number already exists",
          data: null,
          err: "USER_ALREADY_EXISTS",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // HASH PASSWORD
    const hashedPassword = await hash(password, 12);

    // CREATE USER
    const user = await UserAccountModel.create({
      accountname: accountname.toLowerCase(),
      firstname,
      lastname,
      password: hashedPassword,
      phonenumber: phonenumber || undefined,
      email: email.toLowerCase(),
    });

    // GENERATE JWT TOKEN
    const token = sign(
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

    // RESPONSE
    const response = NextResponse.json(
      {
        success: true,
        message: `Welcome, ${user.firstname}! Your account has been created successfully.`,
        data: {
          user: {
            id: user._id,
            accountname: user.accountname,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            phonenumber: user.phonenumber,
          },
        },
        err: null,
        status: HTTP_STATUS.CREATED,
      },
      { status: HTTP_STATUS.CREATED }
    );

    // Set JWT cookie
    response.cookies.set("UserCookie", token, {
      httpOnly: true,
      secure: EnvSecrets.appEnv === "production" ? true : false,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: "/",
    });

    return response;
  } catch (err) {
    console.error(
      `User Sign-Up Error: ${err instanceof Error ? err.message : String(err)}`
    );

    // Handle duplicate key error from MongoDB
    if (err instanceof Error && (err as any).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this account name, email, or phone number already exists",
          data: null,
          err: "DUPLICATE_KEY",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error - Failed to create account",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}