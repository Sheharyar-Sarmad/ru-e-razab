import { ConnectDB } from "@/db/connect.db";
import { NextResponse, NextRequest } from "next/server";
import EnvSecrets from "@/config/env.secrets";
import AdminAccountModel from "@/models/auth/admin.account.model";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import { hash } from "bcrypt";
import { sign } from "jsonwebtoken";

interface AdminAccountBody {
  accountname: string;
  firstname: string;
  lastname: string;
  password: string;
  phonenumber: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const MaxAdminCount = await AdminAccountModel.findOne()
      .skip(2)
      .select("_id")
      .lean();

    if (MaxAdminCount) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to create an account!",
          data: null,
          err: "UNAUTHORIZED_ROLE_DEMAND",
          status: HTTP_STATUS.UNAUTHORIZED,
        },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

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

    const { accountname, firstname, lastname, password, phonenumber, email } =
      body as Record<string, unknown>;

    if (
      typeof accountname !== "string" ||
      typeof firstname !== "string" ||
      typeof lastname !== "string" ||
      typeof password !== "string" ||
      typeof phonenumber !== "string" ||
      typeof email !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "accountname, firstname, lastname, password, phonenumber, and email must all be strings",
          data: null,
          err: "INVALID_REQUEST_BODY",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const AdminData: AdminAccountBody = {
      accountname,
      firstname,
      lastname,
      password,
      phonenumber,
      email,
    };

    const duplicateAccount = await AdminAccountModel.findOne({
      $or: [
        { accountname: AdminData.accountname },
        { email: AdminData.email },
        { phonenumber: AdminData.phonenumber },
      ],
    })
      .select("_id")
      .lean();

    if (duplicateAccount) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to create account with the provided information",
          data: null,
          err: "ACCOUNT_CREATION_FAILED",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    const hashedPassword = await hash(AdminData.password, 12);

    const admin = await AdminAccountModel.create({
      ...AdminData,
      password: hashedPassword,
    });

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
        message: `Your account has been created successfully. Welcome, ${admin.firstname}!`,
        data: {
          accountname: admin.accountname,
          firstname: admin.firstname,
          lastname: admin.lastname,
          email: admin.email,
          phonenumber: admin.phonenumber,
        },
      },
      { status: HTTP_STATUS.CREATED },
    );

    response.cookies.set("AdminCookie", token, {
      httpOnly: true,
      secure: EnvSecrets.appEnv === "production" ? true : false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (err) {
    console.error(
      `Admin Sign-Up Error: ${err instanceof Error ? err.message : String(err)}`,
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
