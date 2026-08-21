import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";
import cloudinary from "@/config/cloudinary.config";

// Helper: Delete file from Cloudinary with proper resource type
const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType 
    });
    return result.result === "ok";
  } catch (error) {
    console.error(`Cloudinary delete error for ${publicId} (${resourceType}):`, error);
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

    // STEP 1: Find ghazal to get all media & cover image
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

    // STEP 2: Delete all associated files from Cloudinary
    let coverImageDeleted = false;
    let mediaFilesDeleted = 0;
    let mediaErrors = 0;

    // 2a. Delete Cover Image
    if (ghazal.coverImage) {
      const publicId = extractPublicId(ghazal.coverImage);
      if (publicId) {
        try {
          coverImageDeleted = await deleteFromCloudinary(publicId, 'image');
          console.log(`📸 Cover image ${coverImageDeleted ? '✅' : '❌'} deleted: ${publicId}`);
        } catch (error) {
          console.error("Failed to delete cover image:", error);
        }
      }
    }

    // 2b. Delete all Media Files (Video, Audio, Images, Documents)
    const mediaDeletionPromises = ghazal.media.map(async (mediaItem) => {
      if (mediaItem.publicId) {
        // Map your internal media types to Cloudinary resource types
        let resourceType: 'image' | 'video' | 'raw' = 'image';
        
        if (mediaItem.type === 'video' || mediaItem.type === 'audio') {
          resourceType = 'video'; // Cloudinary treats audio as video resource
        } else if (mediaItem.type === 'document') {
          resourceType = 'raw';
        } // else it stays 'image'

        try {
          const deleted = await deleteFromCloudinary(mediaItem.publicId, resourceType);
          if (deleted) {
            mediaFilesDeleted++;
          } else {
            mediaErrors++;
          }
          return deleted;
        } catch (error) {
          mediaErrors++;
          console.error(`Failed to delete media ${mediaItem.publicId}:`, error);
          return false;
        }
      }
      return false;
    });

    // Wait for all media deletions to finish
    await Promise.all(mediaDeletionPromises);

    // STEP 3: Delete ghazal from database (after Cloudinary cleanup)
    await GhazalModel.findOneAndDelete({ slug });

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Ghazal and associated files deleted successfully (حذف ہوگیا)",
        data: {
          deletedGhazal: {
            id: ghazal._id,
            takhallus: ghazal.takhallus,
            slug: ghazal.slug,
          },
          cleanupSummary: {
            coverImageDeleted,
            mediaFilesDeleted,
            mediaErrors,
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