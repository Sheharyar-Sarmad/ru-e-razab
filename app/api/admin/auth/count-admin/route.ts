import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { NextResponse } from "next/server";
import AdminAccountModel from "@/models/auth/admin.account";


export async function GET() {
    try {
        await ConnectDB(EnvSecrets.mongoUri as string);

        const AdminCount = await AdminAccountModel.countDocuments();
        const MaxAdminCount = 3;

        return NextResponse.json(
            {
                success: true,
                message: "Admin count fetched successfully",
                data: {
                    adminCount: AdminCount,
                    isAllowed: AdminCount < MaxAdminCount,
                },
                err: null,
                status: HTTP_STATUS.OK,
            },
            { status: HTTP_STATUS.OK }
        );

    } catch (err) {
        console.error(
            `Admin count error: ${
                err instanceof Error ? err.message : String(err)
            }`
        );

        return NextResponse.json(
            {
                success: false,
                message: "Internal Server Error",
                data: null,
                err: "INTERNAL_SERVER_ERROR",
                status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        )
    }
}