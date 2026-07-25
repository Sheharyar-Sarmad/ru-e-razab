// app/api/auth/logout/route.ts
import { NextResponse, NextRequest } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";

// POST - User Logout
export async function POST(request: NextRequest) {
  try {
    // Get the token from cookie (for logging/debugging)
    const token = request.cookies.get("UserCookie")?.value;

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully. See you soon!",
        data: null,
        err: null,
        status: HTTP_STATUS.OK,
      },
      { status: HTTP_STATUS.OK }
    );

    // 1. Clear the main UserCookie (this is what your login sets)
    response.cookies.set("UserCookie", "", {
      httpOnly: true,
      secure: EnvSecrets.appEnv === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    console.error(
      `Logout Error: ${err instanceof Error ? err.message : String(err)}`
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