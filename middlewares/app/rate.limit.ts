import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";

interface RateLimitData {
    count: number;
    windowStart: number;
    blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitData>();

const MAX_REQUESTS = 50;
const WINDOW_TIME = 5 * 60 * 1000; // 5 minutes
const BLOCK_TIME = 10 * 60 * 1000; // 10 minutes

export function RateLimit(request: NextRequest) {
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

    const now = Date.now();
    const current = rateLimitStore.get(ip);

    // Check if IP is blocked
    if (current?.blockedUntil && now < current.blockedUntil) {
        const remainingSeconds = Math.ceil(
            (current.blockedUntil - now) / 1000
        );

        return NextResponse.json(
            {
                success: false,
                message: "Too many requests. You are temporarily blocked.",
                data: null,
                err: "TOO_MANY_REQUESTS",
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
            },
            {
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
                headers: {
                    "Retry-After": remainingSeconds.toString(),
                },
            }
        );
    }

    // Remove expired block
    if (current?.blockedUntil && now >= current.blockedUntil) {
        rateLimitStore.delete(ip);
    }

    const data = rateLimitStore.get(ip);

    // Start new window
    if (!data || now - data.windowStart >= WINDOW_TIME) {
        rateLimitStore.set(ip, {
            count: 1,
            windowStart: now,
        });

        return null;
    }

    data.count++;

    // Block after exceeding limit
    if (data.count > MAX_REQUESTS) {
        data.blockedUntil = now + BLOCK_TIME;

        rateLimitStore.set(ip, data);

        return NextResponse.json(
            {
                success: false,
                message: "Rate limit exceeded. You are blocked for 10 minutes.",
                data: null,
                err: "TOO_MANY_REQUESTS",
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
            },
            { status: HTTP_STATUS.TOO_MANY_REQUESTS }
        );
    }

    rateLimitStore.set(ip, data);

    return null;
}