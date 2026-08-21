// app/api/admin/dashboard/jadeed/ghazal/route.ts
import EnvSecrets from "@/config/env.secrets";
import { ConnectDB } from "@/db/connect.db";
import { HTTP_STATUS } from "@/lib/http.status.codes";
import GhazalModel from "@/models/kalam/ghazals.model";
import { NextResponse, NextRequest } from "next/server";
import { uploadToCloudinary, CloudinaryUploadOptions } from "@/middlewares/app/upload.images";

// TYPES 

interface UploadedFile {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  filename: string;
  publicId?: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  alt?: string;
  metadata?: Record<string, any>;
}

// HELPER FUNCTIONS 

// Detect file type from MIME type
function detectMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// Check if file is allowed
function isFileAllowed(mimeType: string, size: number): { allowed: boolean; message?: string } {
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  
  if (size > MAX_FILE_SIZE) {
    return { allowed: false, message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
  }

  const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jfif', 'image/svg+xml', 'image/bmp', 'image/tiff'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/mpeg'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/flac', 'audio/mp4'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
               'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'text/plain', 'text/csv', 'application/json', 'application/xml']
  };

  const type = detectMediaType(mimeType);
  const allowedForType = ALLOWED_TYPES[type] || [];
  
  if (!allowedForType.includes(mimeType)) {
    return { allowed: false, message: `File type ${mimeType} is not allowed` };
  }

  return { allowed: true };
}

// Process uploaded file using existing Cloudinary middleware
async function processFile(
  file: File,
  folder: string = "ghazals/media",
  alt?: string
): Promise<UploadedFile> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type;
  const fileSize = file.size;
  const filename = file.name;

  // Validate file
  const validation = isFileAllowed(mimeType, fileSize);
  if (!validation.allowed) {
    throw new Error(validation.message || 'Invalid file');
  }

  const mediaType = detectMediaType(mimeType);
  const timestamp = Date.now();
  const baseName = filename.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const publicId = `ghazal_${timestamp}_${baseName}`;

  // Configure Cloudinary options based on file type
  let uploadOptions: CloudinaryUploadOptions = {
    resource_type: 'auto',
    public_id: publicId,
    overwrite: false,
  };

  // Image specific options
  if (mediaType === 'image') {
    uploadOptions = {
      ...uploadOptions,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      quality: 'auto:good',
    };
    // For large images, generate thumbnail
    if (fileSize > 5 * 1024 * 1024) { // > 5MB
      uploadOptions.eager = [
        { width: 400, height: 400, crop: 'fill', format: 'jpg' }
      ];
    }
  }

  // Video specific options
  if (mediaType === 'video') {
    uploadOptions = {
      ...uploadOptions,
      resource_type: 'video',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      eager: [
        { width: 400, height: 400, crop: 'fill', format: 'jpg', start_offset: '0' }
      ],
      quality: 'auto:good',
    };
  }

  // Audio specific options
  if (mediaType === 'audio') {
    uploadOptions = {
      ...uploadOptions,
      resource_type: 'video', // Audio is treated as video in Cloudinary
      transformation: [
        { quality: 'auto:good' },
        { format: 'mp3' }
      ],
    };
  }

  // Document specific options
  if (mediaType === 'document') {
    uploadOptions = {
      ...uploadOptions,
      resource_type: 'raw',
      eager: [
        { format: 'jpg', page: '1' } // Generate thumbnail for first page
      ],
    };
  }

  // Upload to Cloudinary using the existing middleware
  const uploadResult = await uploadToCloudinary(
    buffer,
    folder,
    uploadOptions
  );

  // Prepare response
  const uploadedFile: UploadedFile = {
    url: uploadResult.url,
    type: mediaType,
    mimeType: mimeType,
    size: fileSize,
    filename: filename,
    publicId: uploadResult.publicId,
    alt: alt || filename.replace(/\.[^/.]+$/, ''),
  };

  // Add optional fields based on media type
  if (mediaType === 'image' || mediaType === 'video') {
    uploadedFile.width = uploadResult.width;
    uploadedFile.height = uploadResult.height;
  }

  if (mediaType === 'video' || mediaType === 'audio') {
    uploadedFile.duration = uploadResult.duration;
    uploadedFile.thumbnail = uploadResult.thumbnail;
  }

  if (mediaType === 'document') {
    // For documents, use the eager generated thumbnail
    uploadedFile.thumbnail = uploadResult.eager?.[0]?.url;
  }

  // Add metadata
  uploadedFile.metadata = {
    uploadedAt: new Date().toISOString(),
    originalName: filename,
    fileSize: fileSize,
    width: uploadResult.width,
    height: uploadResult.height,
    format: uploadResult.format,
    duration: uploadResult.duration,
  };

  return uploadedFile;
}

// MAIN API HANDLER 

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await ConnectDB(EnvSecrets.mongoUri as string);

    // Check Content-Type
    const contentType = request.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          message: "Content-Type must be multipart/form-data",
          data: null,
          err: "INVALID_CONTENT_TYPE",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse form data
    const formData = await request.formData();

    // Extract fields
    const takhallus = formData.get("takhallus") as string;
    const contentRaw = formData.get("content") as string;
    const categoriesRaw = formData.get("categories") as string;
    const coverImageFile = formData.get("coverImage") as File;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const linksRaw = formData.get("links") as string;
    const mediaFiles = formData.getAll("media") as File[];
    const featured = formData.get("featured") === 'true';

    // VALIDATION 

    // Validate required fields
    if (!takhallus) {
      return NextResponse.json(
        {
          success: false,
          message: "تخلص (Takhallus) is required",
          data: null,
          err: "TAKHALLUS_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!contentRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Content is required",
          data: null,
          err: "CONTENT_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!categoriesRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Categories are required",
          data: null,
          err: "CATEGORIES_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!coverImageFile) {
      return NextResponse.json(
        {
          success: false,
          message: "Cover image is required",
          data: null,
          err: "COVER_IMAGE_REQUIRED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse content and categories
    let content: { lines: string[] }[];
    let categories: string[];

    try {
      content = JSON.parse(contentRaw);
      categories = JSON.parse(categoriesRaw);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON format for content or categories",
          data: null,
          err: "INVALID_JSON_FORMAT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate content structure
    if (!Array.isArray(content) || content.length === 0 || content.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Content must be an array with 1-10 shairs",
          data: null,
          err: "INVALID_CONTENT",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    for (const shair of content) {
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

    // Validate categories
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

    // Validate metaTitle if provided
    if (metaTitle && metaTitle.length > 60) {
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

    // Validate metaDescription if provided
    if (metaDescription && metaDescription.length > 160) {
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

    // Validate media files limit
    if (mediaFiles.length > 20) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum 20 media files allowed",
          data: null,
          err: "MEDIA_LIMIT_EXCEEDED",
          status: HTTP_STATUS.BAD_REQUEST,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse and validate links
    let links: any[] = [];
    if (linksRaw) {
      try {
        links = JSON.parse(linksRaw);
        
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

    // UPLOAD FILES USING EXISTING MIDDLEWARE 

    // Upload cover image
    let coverImageUrl: string;
    let coverImageMetadata: any = {};

    try {
      const coverFile = await processFile(
        coverImageFile,
        "ghazals/covers",
        `Cover image for ${takhallus}`
      );
      coverImageUrl = coverFile.url;
      coverImageMetadata = {
        publicId: coverFile.publicId,
        width: coverFile.width,
        height: coverFile.height,
        format: coverFile.metadata?.format,
        size: coverFile.size,
      };
      console.log("Cover image uploaded successfully:", coverImageUrl);
    } catch (error) {
      console.error("Cover image upload error:", error);
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to upload cover image",
          data: null,
          err: "COVER_IMAGE_UPLOAD_FAILED",
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Upload media files
    let uploadedMedia: UploadedFile[] = [];
    if (mediaFiles.length > 0) {
      console.log(`Processing ${mediaFiles.length} media files...`);
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        try {
          console.log(`Uploading media ${i + 1}/${mediaFiles.length}: ${file.name}`);
          const mediaFile = await processFile(
            file,
            "ghazals/media",
            `Media ${i + 1} for ${takhallus}`
          );
          uploadedMedia.push(mediaFile);
          console.log(`Media ${i + 1} uploaded successfully:`, mediaFile.url);
        } catch (error) {
          console.error(`Failed to upload media ${i + 1}:`, error);
          // Continue with other files, but log the error
        }
      }
    }

    // Check for duplicate slug
    const tempSlug = content[0].lines[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const existingGhazal = await GhazalModel.findOne({ slug: tempSlug });
    if (existingGhazal) {
      return NextResponse.json(
        {
          success: false,
          message: "A ghazal with similar first line already exists",
          data: null,
          err: "DUPLICATE_SLUG",
          status: HTTP_STATUS.CONFLICT,
        },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // CREATE GHAZAL 

    const ghazal = new GhazalModel({
      takhallus,
      content,
      category: categories,
      coverImage: coverImageUrl,
      coverImageMetadata,
      media: uploadedMedia,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      links: links || [],
      featured: featured || false,
      likes: [],
      comments: [],
      views: 0,
      publishedAt: new Date(),
    });

    await ghazal.save();

    // RESPONSE 

    return NextResponse.json(
      {
        success: true,
        message: "Ghazal created successfully (جدید غزل تخلیق ہوگئی)",
        data: {
          ghazal: {
            id: ghazal._id,
            takhallus: ghazal.takhallus,
            slug: ghazal.slug,
            content: ghazal.content,
            category: ghazal.category,
            coverImage: ghazal.coverImage,
            coverImageMetadata: ghazal.coverImageMetadata,
            media: ghazal.media,
            metaTitle: ghazal.metaTitle,
            metaDescription: ghazal.metaDescription,
            links: ghazal.links,
            featured: ghazal.featured,
            views: ghazal.views,
            likes: ghazal.likes,
            comments: ghazal.comments,
            publishedAt: ghazal.publishedAt,
            createdAt: ghazal.createdAt,
            updatedAt: ghazal.updatedAt,
          },
          uploadSummary: {
            totalMediaUploaded: uploadedMedia.length,
            coverImageUploaded: true,
          },
        },
        err: null,
        status: HTTP_STATUS.CREATED,
      },
      { status: HTTP_STATUS.CREATED }
    );

  } catch (error) {
    console.error("Jadeed Ghazal Error:", error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.name === "ValidationError") {
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

      if ((error as any).code === 11000) {
        return NextResponse.json(
          {
            success: false,
            message: "Duplicate entry - a ghazal with this slug already exists",
            data: null,
            err: "DUPLICATE_KEY",
            status: HTTP_STATUS.CONFLICT,
          },
          { status: HTTP_STATUS.CONFLICT }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal Server Error",
        data: null,
        err: "INTERNAL_SERVER_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}