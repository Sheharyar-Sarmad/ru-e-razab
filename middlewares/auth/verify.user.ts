import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import EnvSecrets from "@/config/env.secrets";

export function VerifyUser(request: NextRequest) {
  const userCookie = request.cookies.get("UserCookie")?.value;

  if (!userCookie) {
    return redirectToLogin(request);
  }

  try {
    jwt.verify(
      userCookie,
      EnvSecrets.jwtSecret as string,
    );

    return null;
  } catch (error) {
    console.error("Admin verification failed:", error);

    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRoute) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized. Admin authentication required.",
        data: null,
        err: "UNAUTHORIZED",
        status: 401,
      },
      { status: 401 },
    );
  }

  return NextResponse.redirect(
    new URL("/user/login", request.url),
  );
}