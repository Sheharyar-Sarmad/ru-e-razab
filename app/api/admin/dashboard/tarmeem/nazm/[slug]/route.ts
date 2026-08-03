// app/api/admin/dashboard/tarmeem/nazm/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import NazmModel from "@/models/kalam/nazm.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary } from "@/middlewares/app/upload.images";
import cloudinary from "@/config/cloudinary.config";

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
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
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

    const existingNazm = await NazmModel.findOne({ slug });
    if (!existingNazm) {
      return NextResponse.json(
        {
          success: false,
          message: "Nazm not found",
          data: null,
          err: "NAZM_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let updateData: any = {};
    let newCoverImageUrl: string | null = null;
    const oldCoverImageUrl: string | null = existingNazm.coverImage || null;

    if (isMultipart) {
      const formData = await request.formData();

      const unwan = formData.get("unwan") as string;
      const takhallus = formData.get("takhallus") as string;
      const contentRaw = formData.get("content") as string;
      const categoriesRaw = formData.get("categories") as string;
      const coverImageFile = formData.get("coverImage") as File | null;
      const metaTitle = formData.get("metaTitle") as string;
      const metaDescription = formData.get("metaDescription") as string;
      const linksRaw = formData.get("links") as string;

      if (unwan) updateData.unwan = unwan;
      if (takhallus) updateData.takhallus = takhallus;

      if (contentRaw) {
        try {
          const content = JSON.parse(contentRaw);
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
          updateData.content = content;
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid JSON format for content",
              data: null,
              err: "INVALID_CONTENT_JSON",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
      }

      if (categoriesRaw) {
        try {
          const categories = JSON.parse(categoriesRaw);
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
          updateData.category = categories;
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid JSON format for categories",
              data: null,
              err: "INVALID_CATEGORIES_JSON",
              status: HTTP_STATUS.BAD_REQUEST,
            },
            { status: HTTP_STATUS.BAD_REQUEST }
          );
        }
      }

      if (metaTitle !== null && metaTitle !== undefined) {
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

      if (metaDescription !== null && metaDescription !== undefined) {
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

      if (linksRaw !== null && linksRaw !== undefined) {
        if (linksRaw === "") {
          updateData.links = [];
        } else {
          try {
            const links = JSON.parse(linksRaw);
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
            updateData.links = links;
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
      }

      if (coverImageFile) {
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

        try {
          const bytes = await coverImageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const uploadResult = await uploadToCloudinary(buffer, "nazms") as {
            url: string;
            publicId: string;
          };
          newCoverImageUrl = uploadResult.url;
          updateData.coverImage = newCoverImageUrl;
        } catch (error) {
          console.error("Cloudinary upload error:", error);
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
    } else {
      try {
        const body = await request.json();
        const { _id, slug: _, createdAt, updatedAt, __v, ...cleanData } = body;
        updateData = cleanData;

        if (updateData.metaTitle && updateData.metaTitle.length > 60) {
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

        if (updateData.metaDescription && updateData.metaDescription.length > 160) {
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

        if (updateData.links !== undefined) {
          if (!Array.isArray(updateData.links)) {
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
          if (updateData.links.length > 5) {
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
          for (const link of updateData.links) {
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
        }
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

    if (Object.keys(updateData).length === 0) {
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

    const updatedNazm = await NazmModel.findOneAndUpdate(
      { slug },
      { ...updateData },
      {
        new: true,
        runValidators: true,
        select: "unwan takhallus slug content category coverImage metaTitle metaDescription links likes comments createdAt updatedAt"
      }
    );

    let oldImageDeleted = false;
    if (newCoverImageUrl && oldCoverImageUrl) {
      const oldPublicId = extractPublicId(oldCoverImageUrl);
      if (oldPublicId) {
        try {
          const result = await deleteFromCloudinary(oldPublicId);
          oldImageDeleted = result;
        } catch (error) {
          console.error("Failed to delete old image:", error);
        }
      }
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Nazm updated successfully (نظم تارمیم ہوگیا)",
        data: {
          nazm: updatedNazm,
          image: {
            oldImageDeleted,
            newImageUploaded: !!newCoverImageUrl,
            newImageUrl: newCoverImageUrl || updatedNazm.coverImage,
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
    console.error("Update Nazm Error:", error);

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

    if (error instanceof Error && (error as any).code === 11000) {
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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update nazm",
        data: null,
        err: "UPDATE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}