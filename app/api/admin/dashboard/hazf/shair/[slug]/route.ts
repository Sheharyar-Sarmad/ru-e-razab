// app/api/admin/dashboard/hazf/shair/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import ShairModel from "@/models/kalam/shair.model";
import { NextResponse, NextRequest } from "next/server";
import cloudinary from "@/config/cloudinary.config";

// HELPER: Delete image from Cloudinary
const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
};

// HELPER: Extract public ID from Cloudinary URL
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

// DELETE - Delete Shair by Slug (Hazf - حذف)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();

  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    const { slug } = await params;

    // Validate slug
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

    // STEP 1: Find shair to get cover image
    const shair = await ShairModel.findOne({ slug });

    if (!shair) {
      return NextResponse.json(
        {
          success: false,
          message: "Shair not found (شعر نہیں ملا)",
          data: null,
          err: "SHAIR_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Store cover image URL and public ID
    const coverImageUrl = shair.coverImage;
    let publicId: string | null = null;

    // Extract public ID from the URL
    if (coverImageUrl) {
      publicId = extractPublicId(coverImageUrl);
      console.log("📸 Extracted public ID:", publicId);
    }

    // STEP 2: Delete shair from database
    await ShairModel.findOneAndDelete({ slug });

    // STEP 3: Delete cover image from Cloudinary
    let imageDeleted = false;

    if (publicId) {
      try {
        imageDeleted = await deleteFromCloudinary(publicId);
        console.log(`Image ${imageDeleted ? '✅' : '❌'} deleted: ${publicId}`);
      } catch (error) {
        console.error("Failed to delete cover image:", error);
        // Don't fail the request if image deletion fails
      }
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Shair deleted successfully (شعر حذف ہوگیا)",
        data: {
          deletedShair: {
            id: shair._id,
            takhallus: shair.takhallus,
            slug: shair.slug,
            content: shair.content,
            category: shair.category,
          },
          image: {
            url: coverImageUrl,
            publicId: publicId,
            deleted: imageDeleted,
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
    console.error("Delete Shair Error (Hazf):", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete shair (شعر حذف نہیں ہو سکا)",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}