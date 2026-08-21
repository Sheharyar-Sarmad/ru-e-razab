// middlewares/app/upload.images.ts
import cloudinary from "@/config/cloudinary.config";

export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
  allowed_formats?: string[];
  max_bytes?: number;
  transformation?: any;
  eager?: any[];
  public_id?: string;
  overwrite?: boolean;
  format?: string;
  quality?: string;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  createdAt?: string;
  duration?: number;
  thumbnail?: string;
  eager?: any[];
}

export const uploadToCloudinary = async (
  file: Buffer | string,
  folder: string = "ru-e-razab",
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Merge options with defaults
    const uploadOptions = {
      folder: `ru-e-razab/${folder}`,
      resource_type: options.resource_type || "auto",
      secure: true,
      use_filename: true,
      unique_filename: true,
      overwrite: options.overwrite || false,
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            createdAt: result.created_at,
            duration: result.duration,
            thumbnail: result.thumbnail_url || result.eager?.[0]?.secure_url,
            eager: result.eager,
          });
        } else {
          reject(new Error("Upload failed - no result"));
        }
      }
    );

    // Handle both Buffer and string (base64)
    if (typeof file === "string") {
      // If it's a base64 string
      const buffer = Buffer.from(file.split(",")[1] || file, "base64");
      uploadStream.write(buffer);
    } else {
      uploadStream.write(file);
    }
    
    uploadStream.end();
  });
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (publicId: string) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Get file info from Cloudinary
export const getCloudinaryFileInfo = async (publicId: string) => {
  return new Promise((resolve, reject) => {
    cloudinary.api.resource(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};