// app/api/auth/login/route.ts
import { ConnectDB } from "@/db/connect.db";
import { NextResponse, NextRequest } from "next/server";
import EnvSecrets from "@/config/env.secrets";
import UserAccountModel from "@/models/auth/user.account.model";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { randomBytes } from "crypto";

// INTERFACES
interface RateLimitData {
  count: number;
  windowStart: number;
  blockedUntil?: number;
  failedAttempts: number;
  lastAttempt: number;
}

// RATE LIMITING CONFIGURATION
const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 5, // Max 5 requests
  WINDOW_TIME: 15 * 60 * 1000, // 15 minutes
  BLOCK_TIME_MIN: 30 * 60 * 1000, // 30 minutes minimum
  BLOCK_TIME_MAX: 60 * 60 * 1000, // 60 minutes maximum (1 hour)
  MAX_FAILED_ATTEMPTS: 3, // Block after 3 failed attempts
  CLEANUP_INTERVAL: 60 * 60 * 1000, // Cleanup every hour
};

// STORAGE
const rateLimitStore = new Map<string, RateLimitData>();
const loginHistory = new Map<string, { attempts: number; lastAttempt: Date }[]>();

// CLEANUP JOB (Runs every hour)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.blockedUntil && now > data.blockedUntil) {
      rateLimitStore.delete(ip);
    }
    if (now - data.windowStart > RATE_LIMIT_CONFIG.WINDOW_TIME * 2) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

// HELPER FUNCTIONS

// Generate random block time
const getRandomBlockTime = (): number => {
  const min = RATE_LIMIT_CONFIG.BLOCK_TIME_MIN;
  const max = RATE_LIMIT_CONFIG.BLOCK_TIME_MAX;
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Log login attempt
const logLoginAttempt = (ip: string, identifier: string, success: boolean) => {
  if (!loginHistory.has(ip)) {
    loginHistory.set(ip, []);
  }
  const history = loginHistory.get(ip)!;
  history.push({
    attempts: success ? 1 : 0,
    lastAttempt: new Date(),
  });
  // Keep only last 100 records
  if (history.length > 100) {
    history.shift();
  }
};

// Get client IP (with proxy support)
const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || 
         request.headers.get("cf-connecting-ip") || 
         request.headers.get("true-client-ip") ||
         request.ip || 
         "unknown";
};

// Generate secure token with fingerprint
const generateSecureToken = (user: any, fingerprint: string): string => {
  return sign(
    {
      sub: user._id.toString(),
      _id: user._id,
      accountname: user.accountname,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phonenumber: user.phonenumber,
      fingerprint: fingerprint,
      issuedAt: Date.now(),
    },
    EnvSecrets.jwtSecret as string,
    { expiresIn: "30d" }
  );
};

// MAIN POST HANDLER
export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const ip = getClientIP(request);
    const now = Date.now();

    // RATE LIMITING CHECK
    const current = rateLimitStore.get(ip);

    // Check if IP is currently blocked
    if (current?.blockedUntil && now < current.blockedUntil) {
      const remainingMs = current.blockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      return NextResponse.json(
        {
          success: false,
          message: `⛔ Too many login attempts. You are blocked for ${remainingMinutes} minutes.`,
          data: null,
          err: "RATE_LIMIT_BLOCKED",
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
        },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            "Retry-After": remainingSeconds.toString(),
            "X-RateLimit-Blocked": "true",
            "X-RateLimit-Blocked-Until": new Date(current.blockedUntil).toISOString(),
          },
        }
      );
    }

    // Remove expired block
    if (current?.blockedUntil && now >= current.blockedUntil) {
      rateLimitStore.delete(ip);
    }

    // Get or create rate limit data
    let rateData = rateLimitStore.get(ip);

    // Start a new window if expired
    if (!rateData || now - rateData.windowStart >= RATE_LIMIT_CONFIG.WINDOW_TIME) {
      rateData = {
        count: 0,
        windowStart: now,
        failedAttempts: 0,
        lastAttempt: now,
      };
    }

    // Increment request count
    rateData.count++;
    rateData.lastAttempt = now;

    // Check if exceeded max requests
    if (rateData.count > RATE_LIMIT_CONFIG.MAX_REQUESTS) {
      // Calculate block duration
      const blockDuration = getRandomBlockTime();
      const blockMinutes = Math.ceil(blockDuration / (60 * 1000));

      rateData.blockedUntil = now + blockDuration;
      rateLimitStore.set(ip, rateData);

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
            "X-RateLimit-Limit": RATE_LIMIT_CONFIG.MAX_REQUESTS.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(now + blockDuration).toISOString(),
          },
        }
      );
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

    // Sanitize identifier (prevent injection)
    const sanitizedIdentifier = identifier.trim().toLowerCase();

    const userAgent = request.headers.get("user-agent") || "unknown";
    const fingerprint = `${userAgent}_${ip}`;

    
    await ConnectDB(EnvSecrets.mongoUri as string);

    const user = await UserAccountModel.findOne({
      $or: [
        { accountname: sanitizedIdentifier },
        { email: sanitizedIdentifier },
        ...(sanitizedIdentifier.match(/^[\d+]{10,14}$/) 
          ? [{ phonenumber: sanitizedIdentifier }] 
          : []),
      ],
    })
      .select("+password") // Include password
      .lean();

    if (!user) {
      // Increment failed attempts
      rateData.failedAttempts++;
      rateData.count++;
      rateLimitStore.set(ip, rateData);

      // Log failed attempt
      logLoginAttempt(ip, sanitizedIdentifier, false);

      // Check if max failed attempts reached
      if (rateData.failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
        const blockDuration = getRandomBlockTime();
        const blockMinutes = Math.ceil(blockDuration / (60 * 1000));
        
        rateData.blockedUntil = now + blockDuration;
        rateLimitStore.set(ip, rateData);

        return NextResponse.json(
          {
            success: false,
            message: `Too many failed attempts. You are blocked for ${blockMinutes} minutes.`,
            data: null,
            err: "TOO_MANY_FAILED_ATTEMPTS",
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
          },
          { status: HTTP_STATUS.TOO_MANY_REQUESTS }
        );
      }

      // Return generic message (don't reveal if user exists)
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
          data: null,
          err: "INVALID_CREDENTIALS",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      rateData.failedAttempts++;
      rateData.count++;
      rateLimitStore.set(ip, rateData);

      // Log failed attempt
      logLoginAttempt(ip, sanitizedIdentifier, false);

      // Check if max failed attempts reached
      if (rateData.failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
        const blockDuration = getRandomBlockTime();
        const blockMinutes = Math.ceil(blockDuration / (60 * 1000));
        
        rateData.blockedUntil = now + blockDuration;
        rateLimitStore.set(ip, rateData);

        return NextResponse.json(
          {
            success: false,
            message: `Too many failed attempts. You are blocked for ${blockMinutes} minutes.`,
            data: null,
            err: "TOO_MANY_FAILED_ATTEMPTS",
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
          },
          { status: HTTP_STATUS.TOO_MANY_REQUESTS }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
          data: null,
          err: "INVALID_CREDENTIALS",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    
    rateLimitStore.delete(ip);
    logLoginAttempt(ip, sanitizedIdentifier, true);

 
    const token = generateSecureToken(user, fingerprint);

    
    const response = NextResponse.json(
      {
        success: true,
        message: `Welcome back, ${user.firstname}! You have been logged in successfully.`,
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
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );

   
    response.cookies.set("UserCookie", token, {
      httpOnly: true,
      secure: EnvSecrets.appEnv === "production" ? true : false,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return response;
  } catch (err) {
    console.error(
      `User Login Error: ${err instanceof Error ? err.message : String(err)}`
    );

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}