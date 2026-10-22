// app/api/client/auth/login/route.ts
import { ConnectDB } from "@/db/connect.db";
import { NextResponse, NextRequest } from "next/server";
import EnvSecrets from "@/config/env.secrets";
import UserAccountModel from "@/models/auth/user.account.model";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

interface RateLimitData {
  count: number;
  windowStart: number;
  blockedUntil?: number;
  failedAttempts: number;
  lastAttempt: number;
}

interface UserDocument {
  _id: any;
  accountname: string;
  email: string;
  firstname: string;
  lastname: string;
  phonenumber: string;
  password?: string;
}

const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 10,
  WINDOW_TIME: 15 * 60 * 1000,
  BLOCK_TIME_MIN: 30 * 60 * 1000,
  BLOCK_TIME_MAX: 60 * 60 * 1000,
  MAX_FAILED_ATTEMPTS: 5,
};

const COOKIE_NAME = "UserCookie";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches JWT expiry

const rateLimitStore = new Map<string, RateLimitData>();

const getRandomBlockTime = (): number => {
  const { BLOCK_TIME_MIN: min, BLOCK_TIME_MAX: max } = RATE_LIMIT_CONFIG;
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip") ||
    "unknown"
  );
};

const generateSecureToken = (user: UserDocument, fingerprint: string): string => {
  return sign(
    {
      sub: user._id.toString(),
      _id: user._id,
      accountname: user.accountname,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phonenumber: user.phonenumber,
      fingerprint,
    },
    EnvSecrets.jwtSecret as string,
    { expiresIn: "30d" }
  );
};

const blockedResponse = (blockedUntil: number, now: number) => {
  const remainingMs = blockedUntil - now;
  const minutes = Math.ceil(remainingMs / 60000);
  return NextResponse.json(
    {
      success: false,
      message: `Too many attempts. Try again in ${minutes} minutes.`,
      data: null,
      err: "RATE_LIMIT_BLOCKED",
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
    },
    {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      headers: { "Retry-After": Math.ceil(remainingMs / 1000).toString() },
    }
  );
};

const invalidCredentials = () =>
  NextResponse.json(
    {
      success: false,
      message: "Invalid credentials",
      data: null,
      err: "INVALID_CREDENTIALS",
      status: HTTP_STATUS.UNAUTHORIZED,
    },
    { status: HTTP_STATUS.UNAUTHORIZED }
  );

// Single place that records a failure and decides whether to block
const registerFailure = (ip: string, rateData: RateLimitData, now: number) => {
  rateData.failedAttempts++;

  if (rateData.failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
    rateData.blockedUntil = now + getRandomBlockTime();
    rateLimitStore.set(ip, rateData);
    return blockedResponse(rateData.blockedUntil, now);
  }

  rateLimitStore.set(ip, rateData);
  return invalidCredentials();
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const now = Date.now();

    let rateData = rateLimitStore.get(ip);

    // Currently blocked?
    if (rateData?.blockedUntil && now < rateData.blockedUntil) {
      return blockedResponse(rateData.blockedUntil, now);
    }

    // New window if none, expired window, or expired block
    if (
      !rateData ||
      now - rateData.windowStart >= RATE_LIMIT_CONFIG.WINDOW_TIME ||
      (rateData.blockedUntil && now >= rateData.blockedUntil)
    ) {
      rateData = { count: 0, windowStart: now, failedAttempts: 0, lastAttempt: now };
    }

    rateData.count++;
    rateData.lastAttempt = now;

    if (rateData.count > RATE_LIMIT_CONFIG.MAX_REQUESTS) {
      rateData.blockedUntil = now + getRandomBlockTime();
      rateLimitStore.set(ip, rateData);
      return blockedResponse(rateData.blockedUntil, now);
    }

    rateLimitStore.set(ip, rateData);

    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Identifier (accountname/email/phone) and password are required",
          data: null,
          err: "MISSING_CREDENTIALS",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (typeof identifier !== "string" || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body format",
          data: null,
          err: "INVALID_REQUEST_BODY",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const sanitizedIdentifier = identifier.trim().toLowerCase();
    const userAgent = request.headers.get("user-agent") || "unknown";
    const fingerprint = `${userAgent}_${ip}`;

    await ConnectDB(EnvSecrets.mongoUri as string);

    const user = (await UserAccountModel.findOne({
      $or: [
        { accountname: sanitizedIdentifier },
        { email: sanitizedIdentifier },
        ...(/^[\d+]{10,14}$/.test(sanitizedIdentifier)
          ? [{ phonenumber: sanitizedIdentifier }]
          : []),
      ],
    })
      .select("+password")
      .lean()) as UserDocument | null;

    if (!user) return registerFailure(ip, rateData, now);

    const isPasswordMatch = await compare(password, user.password || "");
    if (!isPasswordMatch) return registerFailure(ip, rateData, now);

    // Success: reset limiter
    rateLimitStore.delete(ip);

    const token = generateSecureToken(user, fingerprint);
    const { password: _, ...userProfile } = user;

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: { user: userProfile },
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );

    // THE FIX: cookie name must match what VerifyUser reads
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}