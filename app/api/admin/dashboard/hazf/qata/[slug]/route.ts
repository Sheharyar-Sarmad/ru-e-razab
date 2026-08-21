// app/api/admin/dashboard/hazf/qata/[slug]/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import QataModel from "@/models/kalam/qata.model";
import { NextResponse, NextRequest } from "next/server";
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
  } catch {
    return null;
  }
};

export async function DELETE(
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

    // Find the qata to get all media URLs
    const qata = await QataModel.findOne({ slug });
    if (!qata) {
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

    // Collect all public IDs to delete (cover + media)
    const publicIdsToDelete: string[] = [];

    // Cover image
    if (qata.coverImage) {
      const publicId = extractPublicId(qata.coverImage);
      if (publicId) publicIdsToDelete.push(publicId);
    }

    // Media files
    if (qata.media && Array.isArray(qata.media)) {
      for (const media of qata.media) {
        if (media.publicId) {
          publicIdsToDelete.push(media.publicId);
        }
      }
    }

    // Delete the document
    await QataModel.findOneAndDelete({ slug });

    // Delete all files from Cloudinary
    const deletionResults = [];
    for (const publicId of publicIdsToDelete) {
      try {
        const deleted = await deleteFromCloudinary(publicId);
        deletionResults.push({ publicId, deleted });
      } catch (error) {
        console.error(`Failed to delete ${publicId}:`, error);
        deletionResults.push({ publicId, deleted: false });
      }
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Qata and associated media deleted successfully",
        data: {
          deletedQata: {
            id: qata._id,
            takhallus: qata.takhallus,
            slug: qata.slug,
          },
          deletionResults,
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
    console.error("Delete Qata Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete qata",
        data: null,
        err: "DELETE_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}