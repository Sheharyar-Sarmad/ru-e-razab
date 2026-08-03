// app/api/admin/dashboard/hazf/qata/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import QataModel from "@/models/kalam/qata.model";
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

// DELETE - Delete Qata by Slug (Hazf - حذف)
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

    // STEP 1: Find qata to get cover image
    const qata = await QataModel.findOne({ slug });

    if (!qata) {
      return NextResponse.json(
        {
          success: false,
          message: "Qata not found (قطعہ نہیں ملا)",
          data: null,
          err: "QATA_NOT_FOUND",
          status: HTTP_STATUS.NOT_FOUND,
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Store cover image URL and public ID
    const coverImageUrl = qata.coverImage;
    let publicId: string | null = null;

    // Extract public ID from the URL
    if (coverImageUrl) {
      publicId = extractPublicId(coverImageUrl);
      console.log("📸 Extracted public ID:", publicId);
    }

    // STEP 2: Delete qata from database
    await QataModel.findOneAndDelete({ slug });

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
        message: "Qata deleted successfully (قطعہ حذف ہوگیا)",
        data: {
          deletedQata: {
            id: qata._id,
            takhallus: qata.takhallus,
            slug: qata.slug,
            content: qata.content,
            category: qata.category,
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
    console.error("Delete Qata Error (Hazf):", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete qata (قطعہ حذف نہیں ہو سکا)",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}