// models/kalam/ghazals.model.ts
import { Schema, models, model, Types } from "mongoose";

// INTERFACES

interface Comment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
}

interface Shair {
  lines: string[];
}

interface Link {
  title: string;
  url: string;
  type?: string;
}

interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  filename: string;
  publicId?: string;
  thumbnail?: string; // For video/audio thumbnails
  duration?: number; // For video/audio duration in seconds
  width?: number; // For images/videos
  height?: number; // For images/videos
  alt?: string;
  metadata?: Record<string, any>;
}

interface Ghazal {
  takhallus: string;
  slug: string;
  content: Shair[];
  category: string[];
  coverImage: string;
  coverImageMetadata?: {
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
  media: MediaFile[];
  metaTitle?: string;
  metaDescription?: string;
  links?: Link[];
  likes: Types.ObjectId[];
  comments: Comment[];
  featured?: boolean;
  views?: number;
  publishedAt?: Date;
}

// SUB-SCHEMAS

const LinkSchema = new Schema<Link>(
  {
    title: {
      type: String,
      required: [true, "Link title is required"],
      trim: true,
      minlength: [1, "Link title cannot be empty"],
      maxlength: [100, "Link title cannot exceed 100 characters"],
    },
    url: {
      type: String,
      required: [true, "Link URL is required"],
      trim: true,
      maxlength: [500, "Link URL cannot exceed 500 characters"],
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please enter a valid URL",
      ],
    },
    type: {
      type: String,
      required: false,
      trim: true,
      enum: ["spotify", "youtube", "wikipedia", "website", "social", "other"],
      default: "website",
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

const CommentSchema = new Schema<Comment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "UserAccount",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, "Comment cannot be empty"],
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

const ShairSchema = new Schema<Shair>(
  {
    lines: {
      type: [String],
      required: true,
      set: (lines: string[]) => lines.map((line) => line.trim()),
      validate: [
        {
          validator: (lines: string[]) => lines.length === 2,
          message: "Each shair must contain exactly 2 lines",
        },
        {
          validator: (lines: string[]) =>
            lines.every(
              (line) =>
                line.length >= 2 &&
                line.length <= 300,
            ),
          message:
            "Each line must be between 2 and 300 characters",
        },
      ],
    },
  },
  {
    _id: false,
  }
);

const MediaSchema = new Schema<MediaFile>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['image', 'video', 'audio', 'document'],
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: [0, "File size must be positive"],
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, "Filename cannot exceed 255 characters"],
    },
    publicId: {
      type: String,
      required: false,
      trim: true,
    },
    thumbnail: {
      type: String,
      required: false,
      trim: true,
    },
    duration: {
      type: Number,
      required: false,
      min: [0, "Duration cannot be negative"],
    },
    width: {
      type: Number,
      required: false,
      min: [0, "Width cannot be negative"],
    },
    height: {
      type: Number,
      required: false,
      min: [0, "Height cannot be negative"],
    },
    alt: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, "Alt text cannot exceed 200 characters"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
      default: {},
    },
  },
  {
    _id: true,
    timestamps: true, // Track when each media was uploaded
  }
);

const CoverImageMetadataSchema = new Schema(
  {
    publicId: {
      type: String,
      required: false,
      trim: true,
    },
    width: {
      type: Number,
      required: false,
      min: [0, "Width cannot be negative"],
    },
    height: {
      type: Number,
      required: false,
      min: [0, "Height cannot be negative"],
    },
    format: {
      type: String,
      required: false,
      trim: true,
    },
    size: {
      type: Number,
      required: false,
      min: [0, "Size cannot be negative"],
    },
  },
  {
    _id: false,
  }
);

// MAIN SCHEMA 

const GhazalSchema = new Schema<Ghazal>(
  {
    takhallus: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Takhallus must be at least 2 characters long"],
      maxlength: [50, "Takhallus cannot exceed 50 characters"],
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    content: {
      type: [ShairSchema],
      required: true,
      validate: {
        validator: (shairs: Shair[]) =>
          shairs.length >= 1 &&
          shairs.length <= 10,
        message:
          "A Ghazal must contain between 1 and 10 shairs",
      },
    },

    category: {
      type: [String],
      required: true,
      validate: {
        validator: (categories: string[]) =>
          categories.length >= 1 &&
          categories.length <= 10,
        message:
          "A Ghazal must have between 1 and 10 categories",
      },
    },

    coverImage: {
      type: String,
      required: true,
      trim: true,
    },

    coverImageMetadata: {
      type: CoverImageMetadataSchema,
      required: false,
      default: {},
    },

    media: {
      type: [MediaSchema],
      required: false,
      default: [],
      validate: {
        validator: function(media: MediaFile[]) {
          return media.length <= 20; // Max 20 media files
        },
        message: "A Ghazal can have maximum 20 media files",
      },
    },

    metaTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
      default: function(this: any) {
        const firstLine = this.content?.[0]?.lines?.[0] || "";
        return `${firstLine} - ${this.takhallus || "Ghazal"}`.slice(0, 60);
      },
    },

    metaDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      default: function(this: any) {
        const lines = this.content?.slice(0, 2).flatMap((s: any) => s.lines) || [];
        const text = lines.join(" ").slice(0, 150);
        return `${text}... Read the complete ghazal by ${this.takhallus || "the poet"}.`.slice(0, 160);
      },
    },

    links: {
      type: [LinkSchema],
      required: false,
      default: [],
      validate: {
        validator: function(links: Link[]) {
          return links.length <= 5;
        },
        message: "A Ghazal can have maximum 5 links",
      },
    },

    likes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "UserAccount",
        },
      ],
      default: [],
    },

    comments: {
      type: [CommentSchema],
      default: [],
    },

    featured: {
      type: Boolean,
      default: false,
    },

    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },

    publishedAt: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },

  {
    timestamps: true,
  }
);

// INDEXES 

GhazalSchema.index(
  { "media.type": 1 },
  { name: "media_type_idx", background: true }
);

GhazalSchema.index(
  { createdAt: -1 },
  { name: "created_at_desc_idx" }
);

GhazalSchema.index(
  { "content.0.lines.0": 1 },
  { name: "first_line_search_idx" }
);

GhazalSchema.index(
  { "content.0.lines.0": 1, createdAt: -1 },
  { name: "search_pagination_idx" }
);

GhazalSchema.index(
  { takhallus: 1, createdAt: -1 },
  { name: "takhallus_created_at_idx" }
);

GhazalSchema.index(
  { createdAt: -1 },
  { 
    name: "count_idx",
    sparse: true 
  }
);

GhazalSchema.index(
  { category: 1, createdAt: -1 },
  { name: "category_created_at_idx" }
);

GhazalSchema.index(
  { likes: 1, createdAt: -1 },
  { name: "likes_created_at_idx" }
);

GhazalSchema.index(
  { "comments": 1, createdAt: -1 },
  { name: "comments_created_at_idx" }
);

GhazalSchema.index(
  { "comments": 1 },
  { 
    name: "comments_count_idx",
    background: true 
  }
);

GhazalSchema.index(
  { "comments.createdAt": -1 },
  { 
    name: "comments_created_at_desc_idx",
    background: true 
  }
);

GhazalSchema.index(
  { slug: 1, "comments.createdAt": -1 },
  { 
    name: "slug_comments_pagination_idx",
    background: true 
  }
);

GhazalSchema.index(
  { "comments.user": 1 },
  { 
    name: "comments_user_idx",
    background: true 
  }
);

GhazalSchema.index(
  { slug: 1, "comments.user": 1 },
  { 
    name: "slug_user_comments_idx",
    background: true 
  }
);

// New indexes for media
GhazalSchema.index(
  { "media.type": 1 },
  { name: "media_type_idx", background: true }
);

GhazalSchema.index(
  { "media.createdAt": -1 },
  { name: "media_created_at_idx", background: true }
);

GhazalSchema.index(
  { featured: 1, createdAt: -1 },
  { name: "featured_created_at_idx", background: true }
);

GhazalSchema.index(
  { views: -1 },
  { name: "views_desc_idx", background: true }
);

GhazalSchema.index(
  { publishedAt: -1 },
  { name: "published_at_desc_idx", background: true }
);

// Text search index
GhazalSchema.index(
  {
    takhallus: "text",
    "content.0.lines.0": "text",
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "ghazal_search_text_idx",
    background: true,
    weights: {
      takhallus: 10,
      "content.0.lines.0": 8,
      metaTitle: 6,
      metaDescription: 4,
    },
  }
);

// MIDDLEWARE 

GhazalSchema.pre("validate", function () {
  // Generate slug from first line
  if (this.content?.[0]?.lines?.[0]) {
    this.slug = this.content[0].lines[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Auto-generate meta title if not provided
  if (!this.metaTitle && this.content?.[0]?.lines?.[0]) {
    const firstLine = this.content[0].lines[0];
    this.metaTitle = `${firstLine} - ${this.takhallus || "Ghazal"}`.slice(0, 60);
  }

  // Auto-generate meta description if not provided
  if (!this.metaDescription && this.content) {
    const lines = this.content.slice(0, 2).flatMap((s: any) => s.lines);
    const text = lines.join(" ").slice(0, 150);
    this.metaDescription = `${text}... Read the complete ghazal by ${this.takhallus || "the poet"}.`.slice(0, 160);
  }

  // Set publishedAt if not set
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// STATIC METHODS 

GhazalSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug });
};

GhazalSchema.statics.findFeatured = function(limit: number = 10) {
  return this.find({ featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

GhazalSchema.statics.incrementViews = function(id: Types.ObjectId) {
  return this.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );
};

// MODEL 

const GhazalModel =
  models.Ghazal ||
  model<Ghazal>("Ghazal", GhazalSchema);

export default GhazalModel;