// app/api/admin/dashboard/deewan-e-ghazal/hazf/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";
import cloudinary from "@/config/cloudinary.config";

// Helper: Delete image from Cloudinary
const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
};

// Helper: Extract public ID from Cloudinary URL
const extractPublicId = (url: string): string | null => {
  try {
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image_id.jpg
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    
    // Get everything after the version number
    const publicIdParts = parts.slice(uploadIndex + 2);
    const publicId = publicIdParts.join("/").split(".")[0]; // Remove file extension
    return publicId || null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

// DELETE - Delete Ghazal by Slug (Hazf - حذف)
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

    // STEP 1: Find ghazal to get cover image
    const ghazal = await GhazalModel.findOne({ slug });
    
    if (!ghazal) {
      return NextResponse.json(
        {
          success: false,
          message: "Ghazal not found",
          data: null,
          err: "GHAZAL_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Store cover image URL and public ID
    const coverImageUrl = ghazal.coverImage;
    let publicId: string | null = null;

    // Extract public ID from the URL
    if (coverImageUrl) {
      publicId = extractPublicId(coverImageUrl);
      console.log("Extracted public ID:", publicId);
    }

    // STEP 2: Delete ghazal from database
    await GhazalModel.findOneAndDelete({ slug });

    // STEP 3: Delete cover image from Cloudinary
    let imageDeleted = false;

    if (publicId) {
      try {
        imageDeleted = await deleteFromCloudinary(publicId);
        console.log(`📸 Image ${imageDeleted ? '✅' : '❌'} deleted: ${publicId}`);
      } catch (error) {
        console.error("Failed to delete cover image:", error);
        // Don't fail the request if image deletion fails
      }
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Ghazal deleted successfully (حذف ہوگیا)",
        data: {
          deletedGhazal: {
            id: ghazal._id,
            takhallus: ghazal.takhallus,
            slug: ghazal.slug,
            content: ghazal.content,
            category: ghazal.category,
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
    console.error("Delete Ghazal Error (Hazf):", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete ghazal",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}