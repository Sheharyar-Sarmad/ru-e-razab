import { NextRequest, NextResponse } from "next/server";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import EnvSecrets from "@/config/env.secrets";

export async function POST(request: NextRequest) {
    try {
        await ConnectDB(EnvSecrets.mongoUri as string);

        const response = NextResponse.json(
            {
                success: true,
                message: "You logged out successfully",
                data: null,
                err: null,
                status: HTTP_STATUS.OK,
            },
            { status: HTTP_STATUS.OK }
        );

        // Clear authentication cookie
        response.cookies.set("AdminCookie", "", {
            httpOnly: true,
            secure: EnvSecrets.appEnv === "production" ? true : false,
            sameSite: "lax",
            expires: new Date(0),
            path: "/",
        });

        return response;
    } catch (err) {
        console.error(
            `Admin logout error: ${
                err instanceof Error ? err.message : String(err)
            }`
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