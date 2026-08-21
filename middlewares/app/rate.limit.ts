// middlewares/app/rate.limit.ts
import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/http.status.codes";

interface RateLimitData {
    count: number;
    windowStart: number;
    blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitData>();

// More reasonable limits
const MAX_REQUESTS = 100; // Increased from 50 to 100
const WINDOW_TIME = 60 * 1000; // 1 minute (was 5 minutes)
const BLOCK_TIME = 5 * 60 * 1000; // 5 minutes (was 10 minutes)

// Skip rate limiting for specific IPs (admin, internal)
const WHITELIST_IPS = [
    "127.0.0.1",
    "::1",
    "localhost",
    // Add your server IPs here
];

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    
    return forwarded?.split(",")[0]?.trim() || 
           realIp || 
           cfConnectingIp || 
           "unknown";
}

// Check if IP is whitelisted
function isWhitelisted(ip: string): boolean {
    return WHITELIST_IPS.includes(ip) || ip.startsWith("192.168.") || ip.startsWith("10.");
}

export function RateLimit(request: NextRequest) {
    const ip = getClientIP(request);
    
    // Skip rate limiting for whitelisted IPs
    if (isWhitelisted(ip)) {
        return null;
    }

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
                message: `Too many requests. Please try again in ${remainingSeconds} seconds.`,
                data: null,
                err: "TOO_MANY_REQUESTS",
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
            },
            {
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
                headers: {
                    "Retry-After": remainingSeconds.toString(),
                    "X-RateLimit-Limit": MAX_REQUESTS.toString(),
                    "X-RateLimit-Remaining": "0",
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
                message: "Rate limit exceeded. You are temporarily blocked for 5 minutes.",
                data: null,
                err: "TOO_MANY_REQUESTS",
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
            },
            { 
                status: HTTP_STATUS.TOO_MANY_REQUESTS,
                headers: {
                    "Retry-After": (BLOCK_TIME / 1000).toString(),
                    "X-RateLimit-Limit": MAX_REQUESTS.toString(),
                    "X-RateLimit-Remaining": "0",
                },
            }
        );
    }

    rateLimitStore.set(ip, data);

    // Add rate limit headers for successful requests
    const remaining = MAX_REQUESTS - data.count;
    const resetTime = new Date(data.windowStart + WINDOW_TIME);
    
    // Note: This is a simplified approach - in production you'd need to 
    // modify the response differently
    return null;
}

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        // Remove if expired
        if (value.blockedUntil && now > value.blockedUntil + BLOCK_TIME) {
            rateLimitStore.delete(key);
        }
        if (!value.blockedUntil && now - value.windowStart > WINDOW_TIME * 2) {
            rateLimitStore.delete(key);
        }
    }
}, 60 * 1000); // Clean every minute