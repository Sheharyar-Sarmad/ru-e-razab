import { ConnectDB } from "@/db/connect.db";
import { NextResponse, NextRequest } from "next/server";
import EnvSecrets from "@/config/env.secrets";
import AdminAccountModel from "@/models/auth/admin.account";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";

interface AdminLoginBody {
  identifier: string;
  password: string;
}

interface RateLimitData {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

// Rate limiting store
const rateLimitStore = new Map<string, RateLimitData>();

// Rate limiting configuration
const MAX_REQUESTS = 3; // 3 requests
const WINDOW_TIME = 15 * 60 * 1000; // 15 minutes
const BLOCK_TIME_MIN = 30 * 60 * 1000; // 30 minutes minimum
const BLOCK_TIME_MAX = 40 * 60 * 1000; // 40 minutes maximum

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const current = rateLimitStore.get(ip);

    // Check if IP is currently blocked
    if (current?.blockedUntil && now < current.blockedUntil) {
      const remainingSeconds = Math.ceil((current.blockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. You are blocked for ${remainingMinutes} minutes.`,
          data: null,
          err: "RATE_LIMIT_BLOCKED",
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
        },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            "Retry-After": remainingSeconds.toString(),
          },
        },
      );
    }

    // Remove expired block
    if (current?.blockedUntil && now >= current.blockedUntil) {
      rateLimitStore.delete(ip);
    }

    const data = rateLimitStore.get(ip);

    // Start a new 15-minute window
    if (!data || now - data.windowStart >= WINDOW_TIME) {
      rateLimitStore.set(ip, {
        count: 1,
        windowStart: now,
      });

      // Proceed with login
      return await handleLogin(request);
    }

    // Increase request count
    data.count++;

    // Check if exceeded 3 requests
    if (data.count > MAX_REQUESTS) {
      // Random block time between 30-40 minutes
      const randomBlockMinutes = Math.floor(
        Math.random() * (BLOCK_TIME_MAX - BLOCK_TIME_MIN + 1) + BLOCK_TIME_MIN,
      );
      const blockDuration = randomBlockMinutes * 60 * 1000;

      data.blockedUntil = now + blockDuration;
      rateLimitStore.set(ip, data);

      const blockMinutes = Math.ceil(blockDuration / (60 * 1000));

      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. Too many login attempts in 15 minutes. You are blocked for ${blockMinutes} minutes.`,
          data: null,
          err: "RATE_LIMIT_EXCEEDED",
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
        },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            "Retry-After": Math.ceil(blockDuration / 1000).toString(),
          },
        },
      );
    }

    rateLimitStore.set(ip, data);

    // Proceed with login
    return await handleLogin(request);
  } catch (err) {
    console.error(
      `Admin Login Error: ${err instanceof Error ? err.message : String(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Separate login handler function
async function handleLogin(request: NextRequest) {
  await ConnectDB(EnvSecrets.mongoUri as string);

  const body: unknown = await request.json();

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
        data: null,
        err: "INVALID_REQUEST_BODY",
        status: HTTP_STATUS.BAD_REQUEST,
      },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const { identifier, password } = body as Record<string, unknown>;

  if (typeof identifier !== "string" || typeof password !== "string") {
    return NextResponse.json(
      {
        success: false,
        message: "identifier and password must be strings",
        data: null,
        err: "INVALID_REQUEST_BODY",
        status: HTTP_STATUS.BAD_REQUEST,
      },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  // Find admin by accountname, email, or phonenumber
  const admin = await AdminAccountModel.findOne({
    $or: [
      { accountname: identifier },
      { email: identifier },
      { phonenumber: identifier },
    ],
  }).select("+password"); // Include password for verification

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid credentials",
        data: null,
        err: "INVALID_CREDENTIALS",
        status: HTTP_STATUS.UNAUTHORIZED,
      },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  // Verify password
  const isPasswordValid = await compare(password, admin.password);

  if (!isPasswordValid) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid credentials",
        data: null,
        err: "INVALID_CREDENTIALS",
        status: HTTP_STATUS.UNAUTHORIZED,
      },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  // Generate JWT token
  const token = sign(
    {
      sub: admin._id.toString(),
      _id: admin._id,
      accountname: admin.accountname,
      email: admin.email,
      firstname: admin.firstname,
      lastname: admin.lastname,
      phonenumber: admin.phonenumber,
    },
    EnvSecrets.jwtSecret as string,
    { expiresIn: "7d" },
  );

  const response = NextResponse.json(
    {
      success: true,
      message: `Login successful. Welcome back, ${admin.firstname}!`,
      data: {
        sub: admin._id.toString(),
        accountname: admin.accountname,
        firstname: admin.firstname,
        lastname: admin.lastname,
        email: admin.email,
        phonenumber: admin.phonenumber,
      },
    },
    { status: HTTP_STATUS.OK },
  );

  // Set cookie
  response.cookies.set("AdminCookie", token, {
    httpOnly: true,
    secure: EnvSecrets.appEnv === "production" ? true : false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return response;
}
