// app/api/admin/dashboard/jadeed/nazm/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import NazmModel from "@/models/kalam/nazm.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary } from "@/middlewares/app/upload.images";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// TYPES

type MediaKind = "image" | "video" | "audio" | "document";

interface UploadedFile {
  url: string;
  type: MediaKind;
  mimeType: string;
  size: number;
  filename: string;
  publicId?: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  alt?: string;
  metadata?: Record<string, any>;
}

// HELPERS

function fail(message: string, err: string, status: number) {
  return NextResponse.json(
    { success: false, message, data: null, err, status },
    { status }
  );
}

function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function isFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

// Cloudinary helpers may return url/secure_url and publicId/public_id
function normalizeUpload(result: any) {
  const url: string | undefined = result?.secure_url || result?.url;
  const publicId: string | undefined = result?.public_id || result?.publicId;
  if (!url) {
    throw new Error(
      `Cloudinary returned no URL. Result: ${JSON.stringify(result)?.slice(0, 300)}`
    );
  }
  return {
    url,
    publicId,
    width: result?.width as number | undefined,
    height: result?.height as number | undefined,
    format: result?.format as string | undefined,
    duration: result?.duration as number | undefined,
  };
}

function detectMediaType(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

const ALLOWED_MEDIA: Record<MediaKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif", "image/svg+xml", "image/bmp", "image/tiff"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/3gpp", "video/mpeg"],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/flac", "audio/mp4"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
  ],
};

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif"];
const LINK_TYPES = ["spotify", "youtube", "wikipedia", "website", "social", "other"];

function validateMedia(file: File): string | null {
  if (file.size > MAX_MEDIA_SIZE) return `${file.name}: exceeds 100MB limit`;
  const kind = detectMediaType(file.type);
  if (!ALLOWED_MEDIA[kind].includes(file.type)) {
    return `${file.name}: file type ${file.type || "unknown"} is not allowed`;
  }
  return null;
}

async function processFile(file: File, folder: string, alt?: string): Promise<UploadedFile> {
  const problem = validateMedia(file);
  if (problem) throw new Error(problem);

  const buffer: Buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = detectMediaType(file.type);
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 50);
  const publicId = `nazm_${Date.now()}_${baseName || "file"}`;

  // Keep options minimal. Delivery transformations (f_auto, q_auto) belong in the URL, not the upload call.
  const resource_type =
    mediaType === "image" ? "image" : mediaType === "video" || mediaType === "audio" ? "video" : "raw";

  const result = normalizeUpload(
    await uploadToCloudinary(buffer, folder, {
      resource_type,
      public_id: publicId,
      overwrite: false,
      ...(mediaType === "image" && file.type !== "image/svg+xml" && file.type !== "image/gif"
        ? { transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }] }
        : {}),
    })
  );

  const uploaded: UploadedFile = {
    url: result.url,
    type: mediaType,
    mimeType: file.type,
    size: buffer.length,
    filename: file.name.slice(0, 255),
    publicId: result.publicId,
    alt: (alt || file.name.replace(/\.[^/.]+$/, "")).slice(0, 200),
    metadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      originalSize: file.size,
      format: result.format,
    },
  };

  if (mediaType === "image" || mediaType === "video") {
    uploaded.width = result.width;
    uploaded.height = result.height;
  }
  if (mediaType === "video" || mediaType === "audio") {
    uploaded.duration = result.duration;
  }

  return uploaded;
}

// MAIN HANDLER

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Database
    try {
      await ConnectDB(EnvSecrets.mongoUri as string);
    } catch (error) {
      console.error("DB connection error:", error);
      return fail(`Database connection failed: ${errMsg(error)}`, "DB_CONNECTION_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // 2. Parse form
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return fail("Content-Type must be multipart/form-data", "INVALID_CONTENT_TYPE", HTTP_STATUS.BAD_REQUEST);
    }

    let formData: globalThis.FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("formData parse error:", error);
      return fail(`Could not read the upload: ${errMsg(error)}`, "FORM_PARSE_FAILED", HTTP_STATUS.BAD_REQUEST);
    }

    const unwan = (formData.get("unwan") as string | null)?.trim() || "";
    const takhallus = (formData.get("takhallus") as string | null)?.trim() || "";
    const contentRaw = formData.get("content") as string | null;
    const categoriesRaw = formData.get("categories") as string | null;
    const coverEntry = formData.get("coverImage");
    const metaTitle = (formData.get("metaTitle") as string | null)?.trim() || "";
    const metaDescription = (formData.get("metaDescription") as string | null)?.trim() || "";
    const linksRaw = formData.get("links") as string | null;
    const mediaFiles = formData.getAll("media").filter(isFile);
    const featured = formData.get("featured") === "true";

    // 3. Validation
    if (!unwan) return fail("Unwan (title) is required", "UNWAN_REQUIRED", HTTP_STATUS.BAD_REQUEST);
    if (!takhallus) return fail("Takhallus is required", "TAKHALLUS_REQUIRED", HTTP_STATUS.BAD_REQUEST);
    if (!contentRaw) return fail("Content is required", "CONTENT_REQUIRED", HTTP_STATUS.BAD_REQUEST);
    if (!categoriesRaw) return fail("Categories are required", "CATEGORIES_REQUIRED", HTTP_STATUS.BAD_REQUEST);
    if (!isFile(coverEntry)) return fail("Cover image is required", "COVER_IMAGE_REQUIRED", HTTP_STATUS.BAD_REQUEST);
    const coverImageFile: File = coverEntry;

    let content: { shairs: { lines: string[] }[] }[];
    let categories: string[];
    try {
      content = JSON.parse(contentRaw);
      categories = JSON.parse(categoriesRaw);
    } catch {
      return fail("Invalid JSON format for content or categories", "INVALID_JSON_FORMAT", HTTP_STATUS.BAD_REQUEST);
    }

    if (!Array.isArray(content) || content.length < 1 || content.length > 6) {
      return fail("Content must be an array with 1-6 bands", "INVALID_CONTENT", HTTP_STATUS.BAD_REQUEST);
    }

    for (const band of content) {
      if (!band?.shairs || !Array.isArray(band.shairs) || band.shairs.length !== 2) {
        return fail("Each band must contain exactly 2 shairs", "INVALID_BAND", HTTP_STATUS.BAD_REQUEST);
      }
      for (const shair of band.shairs) {
        if (!shair?.lines || !Array.isArray(shair.lines) || shair.lines.length !== 2) {
          return fail("Each shair must have exactly 2 lines", "INVALID_SHAIR", HTTP_STATUS.BAD_REQUEST);
        }
        for (const line of shair.lines) {
          const len = typeof line === "string" ? line.trim().length : 0;
          if (len < 2 || len > 300) {
            return fail("Each line must be between 2 and 300 characters", "INVALID_LINE_LENGTH", HTTP_STATUS.BAD_REQUEST);
          }
        }
      }
    }

    if (!Array.isArray(categories) || categories.length === 0 || categories.length > 10) {
      return fail("Categories must be an array with 1-10 items", "INVALID_CATEGORIES", HTTP_STATUS.BAD_REQUEST);
    }
    if (metaTitle.length > 60) return fail("Meta title cannot exceed 60 characters", "META_TITLE_TOO_LONG", HTTP_STATUS.BAD_REQUEST);
    if (metaDescription.length > 160) return fail("Meta description cannot exceed 160 characters", "META_DESCRIPTION_TOO_LONG", HTTP_STATUS.BAD_REQUEST);
    if (mediaFiles.length > 20) return fail("Maximum 20 media files allowed", "MEDIA_LIMIT_EXCEEDED", HTTP_STATUS.BAD_REQUEST);

    // Links
    let links: { title: string; url: string; type?: string }[] = [];
    if (linksRaw) {
      try {
        links = JSON.parse(linksRaw);
      } catch {
        return fail("Invalid JSON format for links", "INVALID_LINKS_JSON", HTTP_STATUS.BAD_REQUEST);
      }
      if (!Array.isArray(links)) return fail("Links must be an array", "INVALID_LINKS_FORMAT", HTTP_STATUS.BAD_REQUEST);
      if (links.length > 5) return fail("Maximum 5 links allowed", "LINKS_LIMIT_EXCEEDED", HTTP_STATUS.BAD_REQUEST);

      for (const link of links) {
        if (!link?.title || !link?.url) {
          return fail("Each link must have a title and URL", "INVALID_LINK_MISSING_FIELDS", HTTP_STATUS.BAD_REQUEST);
        }
        if (link.title.length > 100) return fail("Link title must be 1-100 characters", "INVALID_LINK_TITLE", HTTP_STATUS.BAD_REQUEST);
        if (link.url.length > 500) return fail("Link URL cannot exceed 500 characters", "INVALID_LINK_URL_LENGTH", HTTP_STATUS.BAD_REQUEST);
        try {
          new URL(link.url);
        } catch {
          return fail(`Please enter a valid URL for: ${link.title}`, "INVALID_LINK_URL", HTTP_STATUS.BAD_REQUEST);
        }
        if (link.type && !LINK_TYPES.includes(link.type)) {
          return fail(`Invalid link type. Allowed: ${LINK_TYPES.join(", ")}`, "INVALID_LINK_TYPE", HTTP_STATUS.BAD_REQUEST);
        }
      }
    }

    // Cover validation
    if (coverImageFile.size > MAX_COVER_SIZE) {
      return fail("Cover image exceeds 5MB limit", "FILE_TOO_LARGE", HTTP_STATUS.BAD_REQUEST);
    }
    if (!COVER_TYPES.includes(coverImageFile.type)) {
      return fail("Invalid cover type. Allowed: JPEG, PNG, WEBP, GIF", "INVALID_FILE_TYPE", HTTP_STATUS.BAD_REQUEST);
    }

    // 4. Upload cover
    let coverImageUrl: string;
    let coverImageMetadata: Record<string, any> = {};

    try {
      const coverBuffer: Buffer = Buffer.from(await coverImageFile.arrayBuffer());

      const cover = normalizeUpload(
        await uploadToCloudinary(coverBuffer, "nazms/covers", {
          resource_type: "image",
          transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
        })
      );

      coverImageUrl = cover.url;
      coverImageMetadata = {
        publicId: cover.publicId,
        width: cover.width,
        height: cover.height,
        format: cover.format,
        size: coverBuffer.length,
      };
    } catch (error) {
      console.error("Cover upload error:", error);
      return fail(`Failed to upload cover image: ${errMsg(error)}`, "COVER_IMAGE_UPLOAD_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // 5. Upload media (a failed file never crashes the request)
    const uploadedMedia: UploadedFile[] = [];
    const failedMedia: { name: string; reason: string }[] = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      try {
        uploadedMedia.push(await processFile(file, "nazms/media", `Media ${i + 1} for ${takhallus}`));
      } catch (error) {
        console.error(`Failed to upload media ${i + 1} (${file.name}):`, error);
        failedMedia.push({ name: file.name, reason: errMsg(error) });
      }
    }

    // 6. Save (slug is generated by the model's pre("validate") hook)
    const nazm = new NazmModel({
      unwan,
      takhallus,
      content,
      category: categories,
      coverImage: coverImageUrl,
      coverImageMetadata,
      media: uploadedMedia,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      links,
      featured,
      likes: [],
      comments: [],
      views: 0,
      publishedAt: new Date(),
    });

    await nazm.save();

    console.log(`Nazm created in ${Date.now() - startTime}ms`);

    return NextResponse.json(
      {
        success: true,
        message:
          failedMedia.length > 0
            ? `Nazm created, but ${failedMedia.length} media file(s) failed to upload`
            : "Nazm created successfully (نظم تخلیق ہوگیا)",
        data: {
          nazm: {
            id: nazm._id,
            unwan: nazm.unwan,
            takhallus: nazm.takhallus,
            slug: nazm.slug,
            content: nazm.content,
            category: nazm.category,
            coverImage: nazm.coverImage,
            coverImageMetadata: nazm.coverImageMetadata,
            media: nazm.media,
            metaTitle: nazm.metaTitle,
            metaDescription: nazm.metaDescription,
            links: nazm.links,
            featured: nazm.featured,
            views: nazm.views,
            likes: nazm.likes,
            comments: nazm.comments,
            publishedAt: nazm.publishedAt,
            createdAt: nazm.createdAt,
            updatedAt: nazm.updatedAt,
          },
          uploadSummary: {
            totalMediaUploaded: uploadedMedia.length,
            failedMedia,
            coverImageUploaded: true,
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
        return fail(error.message || "Validation error", "VALIDATION_ERROR", HTTP_STATUS.BAD_REQUEST);
      }
      if ((error as any).code === 11000) {
        return fail("Duplicate entry - a nazm with this slug already exists", "DUPLICATE_KEY", HTTP_STATUS.CONFLICT);
      }
    }

    return fail(errMsg(error) || "Internal Server Error", "INTERNAL_SERVER_ERROR", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}