import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary, CloudinaryUploadOptions } from "@/middlewares/app/upload.images";
import cloudinary from "@/config/cloudinary.config";

// Extract public ID from Cloudinary URL
const extractPublicId = (url: string): string | null => {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    const publicIdParts = parts.slice(uploadIndex + 2);
    return publicIdParts.join("/").split(".")[0] || null;
  } catch { return null; }
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch { return false; }
};

// Reuse file processing helper (same as POST)
async function processFile(
  file: File,
  folder: string = "ghazals/media",
  alt?: string
): Promise<{ url: string; metadata: any; publicId: string; width?: number; height?: number; duration?: number; thumbnail?: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type;
  const fileSize = file.size;

  if (fileSize > 100 * 1024 * 1024) throw new Error("File size exceeds 100MB limit");

  const mediaType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'document';
  const timestamp = Date.now();
  const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const publicId = `ghazal_${timestamp}_${baseName}`;

  let uploadOptions: CloudinaryUploadOptions = {
    resource_type: 'auto',
    public_id: publicId,
    overwrite: false,
  };

  if (mediaType === 'image') {
    uploadOptions = { ...uploadOptions, resource_type: 'image', transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }] };
  } else if (mediaType === 'video') {
    uploadOptions = { ...uploadOptions, resource_type: 'video', transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }], eager: [{ width: 400, height: 400, crop: 'fill', format: 'jpg', start_offset: '0' }] };
  } else if (mediaType === 'audio') {
    uploadOptions = { ...uploadOptions, resource_type: 'video', transformation: [{ quality: 'auto:good' }, { format: 'mp3' }] };
  } else {
    uploadOptions = { ...uploadOptions, resource_type: 'raw' };
  }

  const uploadResult = await uploadToCloudinary(buffer, folder, uploadOptions);

  return {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    width: uploadResult.width,
    height: uploadResult.height,
    duration: uploadResult.duration,
    thumbnail: uploadResult.eager?.[0]?.url || uploadResult.thumbnail,
    metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, fileSize: fileSize, format: uploadResult.format },
  };
}

function detectMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();

  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Slug is required", err: "SLUG_REQUIRED" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const ghazal = await GhazalModel.findOne({ slug });
    if (!ghazal) {
      return NextResponse.json(
        { success: false, message: "Ghazal not found", err: "NOT_FOUND" },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Content-Type must be multipart/form-data", err: "INVALID_CONTENT_TYPE" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const formData = await request.formData();

    const takhallus = formData.get("takhallus") as string;
    const contentRaw = formData.get("content") as string;
    const categoriesRaw = formData.get("categories") as string;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const linksRaw = formData.get("links") as string;
    const featured = formData.get("featured") === 'true';
    const coverImageFile = formData.get("coverImage") as File | null;
    const mediaFiles = formData.getAll("media") as File[];

    // Update text fields
    if (takhallus) ghazal.takhallus = takhallus;

    if (contentRaw) {
      const content = JSON.parse(contentRaw);
      // Validate (same as POST)
      if (!Array.isArray(content) || content.length === 0 || content.length > 10) {
        return NextResponse.json({ success: false, message: "Content must have 1-10 shairs", err: "INVALID_CONTENT" }, { status: HTTP_STATUS.BAD_REQUEST });
      }
      for (const shair of content) {
        if (!shair.lines || shair.lines.length !== 2) {
          return NextResponse.json({ success: false, message: "Each shair must have exactly 2 lines", err: "INVALID_SHAIR" }, { status: HTTP_STATUS.BAD_REQUEST });
        }
        for (const line of shair.lines) {
          if (typeof line !== "string" || line.length < 2 || line.length > 300) {
            return NextResponse.json({ success: false, message: "Each line must be 2-300 characters", err: "INVALID_LINE" }, { status: HTTP_STATUS.BAD_REQUEST });
          }
        }
      }
      ghazal.content = content;

      // Regenerate slug if first line changed
      const newSlug = content[0].lines[0].trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      if (newSlug !== ghazal.slug) {
        const existing = await GhazalModel.findOne({ slug: newSlug, _id: { $ne: ghazal._id } });
        if (existing) {
          return NextResponse.json({ success: false, message: "Another ghazal with this first line exists", err: "DUPLICATE_SLUG" }, { status: HTTP_STATUS.CONFLICT });
        }
        ghazal.slug = newSlug;
      }
    }

    if (categoriesRaw) {
      const categories = JSON.parse(categoriesRaw);
      if (!Array.isArray(categories) || categories.length === 0 || categories.length > 10) {
        return NextResponse.json({ success: false, message: "Categories must have 1-10 items", err: "INVALID_CATEGORIES" }, { status: HTTP_STATUS.BAD_REQUEST });
      }
      ghazal.category = categories;
    }

    if (metaTitle !== undefined) ghazal.metaTitle = metaTitle || undefined;
    if (metaDescription !== undefined) ghazal.metaDescription = metaDescription || undefined;
    if (featured !== undefined) ghazal.featured = featured;

    if (linksRaw) {
      const links = JSON.parse(linksRaw);
      if (links.length > 5) {
        return NextResponse.json({ success: false, message: "Max 5 links allowed", err: "LINKS_LIMIT" }, { status: HTTP_STATUS.BAD_REQUEST });
      }
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      for (const link of links) {
        if (!link.title || !link.url) {
          return NextResponse.json({ success: false, message: "Each link must have title and URL", err: "INVALID_LINK" }, { status: HTTP_STATUS.BAD_REQUEST });
        }
        if (!urlRegex.test(link.url)) {
          return NextResponse.json({ success: false, message: `Invalid URL for ${link.title}`, err: "INVALID_URL" }, { status: HTTP_STATUS.BAD_REQUEST });
        }
      }
      ghazal.links = links;
    }

    // Update Cover Image (Replace)
    if (coverImageFile && coverImageFile.size > 0) {
      try {
        // Delete old cover image from Cloudinary
        if (ghazal.coverImageMetadata?.publicId) {
          await deleteFromCloudinary(ghazal.coverImageMetadata.publicId);
        }
        // Upload new cover
        const coverResult = await processFile(coverImageFile, "ghazals/covers");
        ghazal.coverImage = coverResult.url;
        ghazal.coverImageMetadata = {
          publicId: coverResult.publicId,
          width: coverResult.width,
          height: coverResult.height,
          format: coverResult.metadata?.format,
          size: coverImageFile.size,
        };
      } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Cover image upload failed", err: "COVER_UPLOAD_FAILED" }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
      }
    }

    // Update Media (Replace entire array)
    if (mediaFiles && mediaFiles.length > 0) {
      if (mediaFiles.length > 20) {
        return NextResponse.json({ success: false, message: "Max 20 media files allowed", err: "MEDIA_LIMIT" }, { status: HTTP_STATUS.BAD_REQUEST });
      }

      // Delete old media from Cloudinary (optional, but good for cleanup)
      for (const oldMedia of ghazal.media) {
        if (oldMedia.publicId) {
          await deleteFromCloudinary(oldMedia.publicId).catch(() => {});
        }
      }

      // Upload new media
      const uploadPromises = mediaFiles.map((file, i) =>
        processFile(file, "ghazals/media", `Media ${i + 1}`).catch((err) => {
          console.error(err);
          return null;
        })
      );
      const results = await Promise.all(uploadPromises);
      const newMedia = results.filter((r) => r !== null).map((m) => ({
        url: m.url,
        type: detectMediaType(m.metadata?.format || m.metadata?.originalName?.split('.').pop() || 'image'),
        mimeType: m.metadata?.format || 'unknown',
        size: m.metadata?.fileSize || 0,
        filename: m.metadata?.originalName || 'file',
        publicId: m.publicId,
        thumbnail: m.thumbnail,
        duration: m.duration,
        width: m.width,
        height: m.height,
        alt: `Media for ghazal`,
        metadata: m.metadata,
      }));
      ghazal.media = newMedia;
    }

    await ghazal.save();

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Ghazal updated successfully",
        data: ghazal,
        err: null,
        status: HTTP_STATUS.OK,
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Update Ghazal Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal Server Error",
        data: null,
        err: "UPDATE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}