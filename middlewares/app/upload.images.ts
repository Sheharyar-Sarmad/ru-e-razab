// middleware/cloudinary-upload.ts
import cloudinary from "@/config/cloudinary.config";

export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
  allowed_formats?: string[];
  max_bytes?: number;
  transformation?: any;
  public_id?: string;
  overwrite?: boolean;
}

export const uploadToCloudinary = async (
  file: Buffer | string,
  folder: string,
  options: CloudinaryUploadOptions = {}
) => {
  return new Promise((resolve, reject) => {
    // Merge options with defaults
    const uploadOptions = {
      folder: `ru-e-razab/${folder}`,
      resource_type: options.resource_type || "image",
      secure: true,
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result?.secure_url,
            publicId: result?.public_id,
            width: result?.width,
            height: result?.height,
            format: result?.format,
            bytes: result?.bytes,
            createdAt: result?.created_at,
          });
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

// Optional: Delete from Cloudinary
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