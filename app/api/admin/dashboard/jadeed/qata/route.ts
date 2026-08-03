// app/api/admin/dashboard/jadeed-qata/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import QataModel from "@/models/kalam/qata.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary } from "@/middlewares/app/upload.images";

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Check Content-Type
    const contentType = request.headers.get("content-type") || "";

    if (
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("application/x-www-form-urlencoded")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Content-Type must be multipart/form-data",
          data: null,
          err: "INVALID_CONTENT_TYPE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Parse form data
    const formData = await request.formData();

    // Extract fields
    const takhallus = formData.get("takhallus") as string;
    const contentRaw = formData.get("content") as string;
    const categoriesRaw = formData.get("categories") as string;
    const coverImageFile = formData.get("coverImage") as File;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const linksRaw = formData.get("links") as string;

    if (!takhallus) {
      return NextResponse.json(
        {
          success: false,
          message: "Takhallus is required",
          data: null,
          err: "TAKHALLUS_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!contentRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Content is required",
          data: null,
          err: "CONTENT_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!categoriesRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Categories are required",
          data: null,
          err: "CATEGORIES_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!coverImageFile) {
      return NextResponse.json(
        {
          success: false,
          message: "Cover image is required",
          data: null,
          err: "COVER_IMAGE_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    let content: { lines: string[] }[];
    let categories: string[];

    try {
      content = JSON.parse(contentRaw);
      categories = JSON.parse(categoriesRaw);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON format for content or categories",
          data: null,
          err: "INVALID_JSON_FORMAT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!Array.isArray(content) || content.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Content must be an array with exactly 2 shairs",
          data: null,
          err: "INVALID_CONTENT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Validate each shair
    for (const shair of content) {
      if (
        !shair.lines ||
        !Array.isArray(shair.lines) ||
        shair.lines.length !== 2
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Each shair must have exactly 2 lines",
            data: null,
            err: "INVALID_SHAIR",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      for (const line of shair.lines) {
        if (typeof line !== "string" || line.length < 2 || line.length > 300) {
          return NextResponse.json(
            {
              success: false,
              message: "Each line must be between 2 and 300 characters",
              data: null,
              err: "INVALID_LINE_LENGTH",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST },
          );
        }
      }
    }

    // VALIDATE CATEGORIES

    if (
      !Array.isArray(categories) ||
      categories.length === 0 ||
      categories.length > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Categories must be an array with 1-10 items",
          data: null,
          err: "INVALID_CATEGORIES",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // VALIDATE META TITLE & DESCRIPTION
    if (metaTitle && metaTitle.length > 60) {
      return NextResponse.json(
        {
          success: false,
          message: "Meta title cannot exceed 60 characters",
          data: null,
          err: "META_TITLE_TOO_LONG",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (metaDescription && metaDescription.length > 160) {
      return NextResponse.json(
        {
          success: false,
          message: "Meta description cannot exceed 160 characters",
          data: null,
          err: "META_DESCRIPTION_TOO_LONG",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // VALIDATE LINKS

    let links: any[] = [];
    if (linksRaw) {
      try {
        links = JSON.parse(linksRaw);

        if (!Array.isArray(links)) {
          return NextResponse.json(
            {
              success: false,
              message: "Links must be an array",
              data: null,
              err: "INVALID_LINKS_FORMAT",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST },
          );
        }

        if (links.length > 5) {
          return NextResponse.json(
            {
              success: false,
              message: "Maximum 5 links allowed",
              data: null,
              err: "LINKS_LIMIT_EXCEEDED",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST },
          );
        }

        const linkTypes = [
          "spotify",
          "youtube",
          "wikipedia",
          "website",
          "social",
          "other",
        ];
        const urlRegex =
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

        for (const link of links) {
          if (!link.title || !link.url) {
            return NextResponse.json(
              {
                success: false,
                message: "Each link must have a title and URL",
                data: null,
                err: "INVALID_LINK_MISSING_FIELDS",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST },
            );
          }

          if (link.title.length < 1 || link.title.length > 100) {
            return NextResponse.json(
              {
                success: false,
                message: "Link title must be between 1 and 100 characters",
                data: null,
                err: "INVALID_LINK_TITLE",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST },
            );
          }

          if (link.url.length > 500) {
            return NextResponse.json(
              {
                success: false,
                message: "Link URL cannot exceed 500 characters",
                data: null,
                err: "INVALID_LINK_URL_LENGTH",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST },
            );
          }

          if (!urlRegex.test(link.url)) {
            return NextResponse.json(
              {
                success: false,
                message: "Please enter a valid URL for: " + link.title,
                data: null,
                err: "INVALID_LINK_URL",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST },
            );
          }

          if (link.type && !linkTypes.includes(link.type)) {
            return NextResponse.json(
              {
                success: false,
                message: `Invalid link type. Allowed: ${linkTypes.join(", ")}`,
                data: null,
                err: "INVALID_LINK_TYPE",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST },
            );
          }
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON format for links",
            data: null,
            err: "INVALID_LINKS_JSON",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }
    }

    // VALIDATE IMAGE

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/jfif",
    ];

    if (coverImageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size exceeds 5MB limit",
          data: null,
          err: "FILE_TOO_LARGE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (!ALLOWED_TYPES.includes(coverImageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file type. Allowed: JPEG, PNG, WEBP, GIF",
          data: null,
          err: "INVALID_FILE_TYPE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // UPLOAD IMAGE TO CLOUDINARY

    const bytes = await coverImageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let coverImageUrl: string;
    try {
      const uploadResult = (await uploadToCloudinary(buffer, "qata")) as {
        url: string;
        publicId: string;
      };
      coverImageUrl = uploadResult.url;
      console.log("Image uploaded successfully:", coverImageUrl);
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to upload cover image to Cloudinary",
          data: null,
          err: "CLOUDINARY_UPLOAD_FAILED",
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // CHECK FOR DUPLICATE SLUG

    const tempSlug = content[0].lines[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const existingQata = await QataModel.findOne({ slug: tempSlug });
    if (existingQata) {
      return NextResponse.json(
        {
          success: false,
          message: "A qata with similar first line already exists",
          data: null,
          err: "DUPLICATE_SLUG",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // CREATE QATA
    const qata = new QataModel({
      takhallus,
      content,
      category: categories,
      coverImage: coverImageUrl,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      links: links || [],
      likes: [],
      comments: [],
    });

    await qata.save();

    return NextResponse.json(
      {
        success: true,
        message: "Qata created successfully (قطعہ تخلیق ہوگیا)",
        data: {
          qata: {
            id: qata._id,
            takhallus: qata.takhallus,
            slug: qata.slug,
            content: qata.content,
            category: qata.category,
            coverImage: qata.coverImage,
            metaTitle: qata.metaTitle,
            metaDescription: qata.metaDescription,
            links: qata.links,
            likes: qata.likes,
            comments: qata.comments,
            createdAt: qata.createdAt,
            updatedAt: qata.updatedAt,
          },
        },
        err: null,
        status: HTTP_STATUS.CREATED,
      },
      { status: HTTP_STATUS.CREATED },
    );
  } catch (error) {
    console.error("Jadeed Qata Error:", error);

    if (error instanceof Error) {
      if (error.name === "ValidationError") {
        return NextResponse.json(
          {
            success: false,
            message: error.message || "Validation error",
            data: null,
            err: "VALIDATION_ERROR",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      if ((error as any).code === 11000) {
        return NextResponse.json(
          {
            success: false,
            message: "Duplicate entry - a qata with this slug already exists",
            data: null,
            err: "DUPLICATE_KEY",
            status: HTTP_STATUS.CONFLICT,
          },
          { status: HTTP_STATUS.CONFLICT },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
