// app/api/admin/dashboard/jadeed-nazm/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import NazmModel from "@/models/kalam/nazm.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary } from "@/middlewares/app/upload.images";
import sharp from 'sharp'; // Add this package: npm install sharp

function generateSlugFromUnwan(unwan: string): string {
  return unwan
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Compress image BEFORE upload
async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(800, 800, { // Max 800x800
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 60, // Lower quality = smaller file
        progressive: true,
        mozjpeg: true // Better compression
      })
      .toBuffer();
  } catch (error) {
    console.error("Image compression failed:", error);
    return buffer; // Return original if compression fails
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.json(
        {
          success: false,
          message: "Content-Type must be multipart/form-data",
          data: null,
          err: "INVALID_CONTENT_TYPE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const formData = await request.formData();

    const unwan = formData.get("unwan") as string;
    const takhallus = formData.get("takhallus") as string;
    const contentRaw = formData.get("content") as string;
    const categoriesRaw = formData.get("categories") as string;
    const coverImageFile = formData.get("coverImage") as File;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const linksRaw = formData.get("links") as string;

    // === VALIDATIONS (keep as is - removed for brevity) ===
    if (!unwan) {
      return NextResponse.json(
        {
          success: false,
          message: "Unwan (title) is required",
          data: null,
          err: "UNWAN_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!takhallus) {
      return NextResponse.json(
        {
          success: false,
          message: "Takhallus is required",
          data: null,
          err: "TAKHALLUS_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse JSON
    let content: { shairs: { lines: string[] }[] }[];
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
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate content
    if (!Array.isArray(content) || content.length < 1 || content.length > 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Content must be an array with 1-6 bands",
          data: null,
          err: "INVALID_CONTENT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    for (const band of content) {
      if (!band.shairs || !Array.isArray(band.shairs) || band.shairs.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            message: "Each band must contain exactly 2 shairs",
            data: null,
            err: "INVALID_BAND",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      for (const shair of band.shairs) {
        if (!shair.lines || !Array.isArray(shair.lines) || shair.lines.length !== 2) {
          return NextResponse.json(
            {
              success: false,
              message: "Each shair must have exactly 2 lines",
              data: null,
              err: "INVALID_SHAIR",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
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
              { status: HTTP_STATUS.BAD_REQUEST }
            );
          }
        }
      }
    }

    if (!Array.isArray(categories) || categories.length === 0 || categories.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Categories must be an array with 1-10 items",
          data: null,
          err: "INVALID_CATEGORIES",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (metaTitle && metaTitle.length > 60) {
      return NextResponse.json(
        {
          success: false,
          message: "Meta title cannot exceed 60 characters",
          data: null,
          err: "META_TITLE_TOO_LONG",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse links
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
            { status: HTTP_STATUS.BAD_REQUEST }
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
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }

        const linkTypes = ["spotify", "youtube", "wikipedia", "website", "social", "other"];
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

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
              { status: HTTP_STATUS.BAD_REQUEST }
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
              { status: HTTP_STATUS.BAD_REQUEST }
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
              { status: HTTP_STATUS.BAD_REQUEST }
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
              { status: HTTP_STATUS.BAD_REQUEST }
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
              { status: HTTP_STATUS.BAD_REQUEST }
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
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    // Validate image
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif"];

    if (coverImageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size exceeds 5MB limit",
          data: null,
          err: "FILE_TOO_LARGE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
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
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // === OPTIMIZATION: Compress Image BEFORE Upload ===
    const slug = generateSlugFromUnwan(unwan);
    
    // Convert file to buffer
    const bytes = await coverImageFile.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // Compress image (this will reduce upload time significantly)
    const compressStart = Date.now();
    buffer = await compressImage(buffer);
    console.log(`Image compressed in ${Date.now() - compressStart}ms, size: ${(buffer.length / 1024).toFixed(2)}KB`);

    // Run Cloudinary upload and duplicate check in PARALLEL
    const [uploadResult, existingNazm] = await Promise.all([
      uploadToCloudinary(buffer, "nazms", {
        transformation: [
          {
            quality: "auto:eco", // Cloudinary will optimize
            fetch_format: "auto",
          }
        ]
      }) as Promise<{ url: string; publicId: string }>,
      NazmModel.findOne({ slug })
    ]);

    const coverImageUrl = uploadResult.url;
    const finalSlug = existingNazm ? `${slug}-${Date.now()}` : slug;

    // Create nazm
    const nazm = new NazmModel({
      unwan,
      takhallus,
      content,
      category: categories,
      coverImage: coverImageUrl,
      slug: finalSlug,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      links: links || [],
      likes: [],
      comments: [],
    });

    await nazm.save();
    
    return NextResponse.json(
      {
        success: true,
        message: "Nazm created successfully (نظم تخلیق ہوگیا)",
        data: {
          nazm: {
            id: nazm._id,
            unwan: nazm.unwan,
            takhallus: nazm.takhallus,
            slug: nazm.slug,
            content: nazm.content,
            category: nazm.category,
            coverImage: nazm.coverImage,
            metaTitle: nazm.metaTitle,
            metaDescription: nazm.metaDescription,
            links: nazm.links,
            likes: nazm.likes,
            comments: nazm.comments,
            createdAt: nazm.createdAt,
            updatedAt: nazm.updatedAt,
          },
        },
        err: null,
        status: HTTP_STATUS.CREATED,
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error("Jadeed Nazm Error:", error);

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
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      if ((error as any).code === 11000) {
        return NextResponse.json(
          {
            success: false,
            message: "Duplicate entry - a nazm with this slug already exists",
            data: null,
            err: "DUPLICATE_KEY",
            status: HTTP_STATUS.CONFLICT,
          },
          { status: HTTP_STATUS.CONFLICT }
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
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}