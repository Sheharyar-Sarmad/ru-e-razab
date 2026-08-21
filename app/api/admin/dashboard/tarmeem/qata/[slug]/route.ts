// app/api/admin/dashboard/tarmeem/qata/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import QataModel from "@/models/kalam/qata.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary } from "@/middlewares/app/upload.images";
import cloudinary from "@/config/cloudinary.config";

// Helpers
const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
};

const extractPublicId = (url: string): string | null => {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    const publicIdParts = parts.slice(uploadIndex + 2);
    const publicId = publicIdParts.join("/").split(".")[0];
    return publicId || null;
  } catch {
    return null;
  }
};

const uploadFile = async (file: File, folder: string) => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return uploadToCloudinary(buffer, folder) as Promise<{ url: string; publicId: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();

  try {
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug is required",
          data: null,
          err: "SLUG_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const existingQata = await QataModel.findOne({ slug });
    if (!existingQata) {
      return NextResponse.json(
        {
          success: false,
          message: "Qata not found",
          data: null,
          err: "QATA_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let updateData: any = {};
    let newCoverImageUrl: string | null = null;
    let newCoverImageMetadata: any = null;
    const oldCoverImageUrl = existingQata.coverImage || null;
    let mediaFilesToDelete: string[] = [];
    let newMediaUrls: Array<{ url: string; publicId: string; file: File }> = [];

    if (isMultipart) {
      const formData = await request.formData();

      // Text fields
      const takhallus = formData.get("takhallus") as string;
      const contentRaw = formData.get("content") as string;
      const categoriesRaw = formData.get("categories") as string;
      const metaTitle = formData.get("metaTitle") as string;
      const metaDescription = formData.get("metaDescription") as string;
      const linksRaw = formData.get("links") as string;
      const featured = formData.get("featured") as string;
      const publishedAt = formData.get("publishedAt") as string;

      // Files
      const coverImageFile = formData.get("coverImage") as File | null;
      const mediaFiles = formData.getAll("media") as File[];
      const mediaToRemoveRaw = formData.get("mediaToRemove") as string;

      // Assign text fields
      if (takhallus) updateData.takhallus = takhallus;

      // Content (exactly 2 shairs)
      if (contentRaw) {
        try {
          const content = JSON.parse(contentRaw);
          if (!Array.isArray(content) || content.length !== 2) {
            throw new Error("Content must be an array with exactly 2 shairs");
          }
          for (const shair of content) {
            if (!shair.lines || !Array.isArray(shair.lines) || shair.lines.length !== 2) {
              throw new Error("Each shair must have exactly 2 lines");
            }
            for (const line of shair.lines) {
              if (typeof line !== "string" || line.length < 2 || line.length > 300) {
                throw new Error("Each line must be between 2 and 300 characters");
              }
            }
          }
          updateData.content = content;
        } catch (err: any) {
          return NextResponse.json(
            {
              success: false,
              message: err.message || "Invalid content format",
              data: null,
              err: "INVALID_CONTENT",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
      }

      // Categories
      if (categoriesRaw) {
        try {
          const categories = JSON.parse(categoriesRaw);
          if (!Array.isArray(categories) || categories.length === 0 || categories.length > 10) {
            throw new Error("Categories must be an array with 1-10 items");
          }
          updateData.category = categories;
        } catch (err: any) {
          return NextResponse.json(
            {
              success: false,
              message: err.message || "Invalid categories format",
              data: null,
              err: "INVALID_CATEGORIES",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
      }

      // Meta title/description (with length checks)
      if (metaTitle !== undefined && metaTitle !== null) {
        if (metaTitle.length > 60) {
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
        updateData.metaTitle = metaTitle.trim() || undefined;
      }
      if (metaDescription !== undefined && metaDescription !== null) {
        if (metaDescription.length > 160) {
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
        updateData.metaDescription = metaDescription.trim() || undefined;
      }

      // Featured
      if (featured !== undefined && featured !== null) {
        updateData.featured = featured === "true";
      }

      // PublishedAt
      if (publishedAt) {
        const date = new Date(publishedAt);
        if (!isNaN(date.getTime())) {
          updateData.publishedAt = date;
        }
      }

      // Links (max 5)
      if (linksRaw !== undefined && linksRaw !== null) {
        if (linksRaw === "") {
          updateData.links = [];
        } else {
          try {
            const links = JSON.parse(linksRaw);
            if (!Array.isArray(links) || links.length > 5) {
              throw new Error("Links must be an array with maximum 5 items");
            }
            const linkTypes = ["spotify", "youtube", "wikipedia", "website", "social", "other"];
            const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            for (const link of links) {
              if (!link.title || !link.url) {
                throw new Error("Each link must have a title and URL");
              }
              if (link.title.length < 1 || link.title.length > 100) {
                throw new Error("Link title must be between 1 and 100 characters");
              }
              if (link.url.length > 500 || !urlRegex.test(link.url)) {
                throw new Error(`Invalid URL for link: ${link.title}`);
              }
              if (link.type && !linkTypes.includes(link.type)) {
                throw new Error(`Invalid link type: ${link.type}`);
              }
            }
            updateData.links = links;
          } catch (err: any) {
            return NextResponse.json(
              {
                success: false,
                message: err.message || "Invalid links format",
                data: null,
                err: "INVALID_LINKS",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST }
            );
          }
        }
      }

      // Handle media removal
      if (mediaToRemoveRaw) {
        try {
          mediaFilesToDelete = JSON.parse(mediaToRemoveRaw);
          if (!Array.isArray(mediaFilesToDelete)) {
            throw new Error("mediaToRemove must be an array of IDs");
          }
        } catch {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid mediaToRemove format",
              data: null,
              err: "INVALID_MEDIA_REMOVE",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
      }

      // Cover image upload
      if (coverImageFile && coverImageFile.size > 0) {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif"];
        if (coverImageFile.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              success: false,
              message: "Cover image size exceeds 5MB",
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
              message: "Invalid file type for cover image. Allowed: JPEG, PNG, WEBP, GIF",
              data: null,
              err: "INVALID_FILE_TYPE",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
        try {
          const uploadResult = await uploadFile(coverImageFile, "qata/covers");
          newCoverImageUrl = uploadResult.url;
          newCoverImageMetadata = {
            publicId: uploadResult.publicId,
            width: 0,
            height: 0,
            format: coverImageFile.type.split("/")[1],
            size: coverImageFile.size,
          };
          updateData.coverImage = newCoverImageUrl;
          updateData.coverImageMetadata = newCoverImageMetadata;
        } catch (err) {
          console.error("Cover upload error:", err);
          return NextResponse.json(
            {
              success: false,
              message: "Failed to upload cover image",
              data: null,
              err: "CLOUDINARY_UPLOAD_FAILED",
              status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
          );
        }
      }

      // Media files upload
      if (mediaFiles && mediaFiles.length > 0) {
        const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
        const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        for (const file of mediaFiles) {
          if (file.size > MAX_MEDIA_SIZE) {
            return NextResponse.json(
              {
                success: false,
                message: `File ${file.name} exceeds 10MB limit`,
                data: null,
                err: "MEDIA_FILE_TOO_LARGE",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST }
            );
          }
          if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
            return NextResponse.json(
              {
                success: false,
                message: `Unsupported file type: ${file.type}`,
                data: null,
                err: "INVALID_MEDIA_TYPE",
                status: HTTP_STATUS.BAD_REQUEST,
              },
              { status: HTTP_STATUS.BAD_REQUEST }
            );
          }
          try {
            const uploadResult = await uploadFile(file, "qata/media");
            newMediaUrls.push({
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              file,
            });
          } catch (err) {
            console.error("Media upload error:", err);
            return NextResponse.json(
              {
                success: false,
                message: `Failed to upload media: ${file.name}`,
                data: null,
                err: "MEDIA_UPLOAD_FAILED",
                status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
              },
              { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
            );
          }
        }
      }
    } else {
      // JSON body (no files)
      try {
        const body = await request.json();
        const { _id, slug: _, createdAt, updatedAt, __v, ...cleanData } = body;
        updateData = cleanData;
        // Additional validation for meta and links (same as above) – we'll keep it concise
        // (You can add similar validations for JSON as well)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON body",
            data: null,
            err: "INVALID_JSON",
            status: HTTP_STATUS.BAD_REQUEST,
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0 && mediaFilesToDelete.length === 0 && newMediaUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields to update",
          data: null,
          err: "NO_UPDATE_DATA",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Process media removal (delete from Cloudinary and DB)
    let removedMediaIds: string[] = [];
    if (mediaFilesToDelete.length > 0) {
      const existingMedia = existingQata.media || [];
      const remainingMedia = existingMedia.filter(
        (m: any) => !mediaFilesToDelete.includes(m._id.toString())
      );
      const toRemove = existingMedia.filter(
        (m: any) => mediaFilesToDelete.includes(m._id.toString())
      );
      for (const media of toRemove) {
        if (media.publicId) {
          await deleteFromCloudinary(media.publicId);
        }
        removedMediaIds.push(media._id.toString());
      }
      updateData.media = remainingMedia;
    }

    // Append new media
    if (newMediaUrls.length > 0) {
      const newMediaObjects = newMediaUrls.map((item) => ({
        url: item.url,
        publicId: item.publicId,
        type: item.file.type.startsWith("image/") ? "image" :
              item.file.type.startsWith("video/") ? "video" :
              item.file.type.startsWith("audio/") ? "audio" : "document",
        mimeType: item.file.type,
        size: item.file.size,
        filename: item.file.name,
      }));
      if (updateData.media) {
        updateData.media = [...updateData.media, ...newMediaObjects];
      } else {
        updateData.media = [...(existingQata.media || []), ...newMediaObjects];
      }
    }

    // Update document
    const updatedQata = await QataModel.findOneAndUpdate(
      { slug },
      { ...updateData },
      {
        new: true,
        runValidators: true,
        select:
          "takhallus slug content category coverImage coverImageMetadata media metaTitle metaDescription links likes comments createdAt updatedAt featured views publishedAt",
      }
    );

    // Delete old cover image if replaced
    let oldImageDeleted = false;
    if (newCoverImageUrl && oldCoverImageUrl) {
      const oldPublicId = extractPublicId(oldCoverImageUrl);
      if (oldPublicId) {
        try {
          oldImageDeleted = await deleteFromCloudinary(oldPublicId);
        } catch (error) {
          console.error("Failed to delete old cover image:", error);
        }
      }
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Qata updated successfully",
        data: {
          qata: updatedQata,
          image: {
            oldImageDeleted,
            newImageUploaded: !!newCoverImageUrl,
            newImageUrl: newCoverImageUrl || updatedQata.coverImage,
          },
          media: {
            removed: removedMediaIds,
            added: newMediaUrls.length,
          },
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
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
    console.error("Update Qata Error:", error);
    if (error instanceof Error && error.name === "ValidationError") {
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
    if ((error as any)?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate entry – a qata with this slug already exists",
          data: null,
          err: "DUPLICATE_KEY",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update qata",
        data: null,
        err: "UPDATE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}