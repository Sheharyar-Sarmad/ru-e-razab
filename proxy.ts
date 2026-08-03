// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { RateLimit } from "./middlewares/app/rate.limit";
import { VerifyAdmin } from "./middlewares/auth/verify.admin";
import { VerifyUser } from "./middlewares/auth/verify.user"; 

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Apply rate limiting
  const rateLimitResponse = RateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 2. Protect admin API routes
  if (pathname.startsWith("/api/admin/dashboard")) {
    const adminResponse = await VerifyAdmin(request);
    if (adminResponse) {
      return adminResponse;
    }
  }

  // 3. Protect user API routes
  if (pathname.startsWith("/api/client/dashboard")) {
    const userResponse = await VerifyUser(request);
    if (userResponse) {
      return userResponse;
    }
  }

  // 4. Protect admin dashboard pages
  if (pathname.startsWith("/admin/dashboard")) {
    const adminResponse = await VerifyAdmin(request);
    if (adminResponse) {
      return adminResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};