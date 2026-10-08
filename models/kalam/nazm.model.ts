// models/kalam/nazm.model.ts
import { Schema, models, model, Types } from "mongoose";
import { makeSlug } from "@/lib/slugify";

interface Comment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
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
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  alt?: string;
  metadata?: Record<string, any>;
}

interface Nazm {
  unwan: string;
  takhallus: string;
  slug?: string;
  content: string[]; // Azad Nazm — flat array of lines (misra)
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
    timestamps: true,
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

const NazmSchema = new Schema<Nazm>(
  {
    unwan: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Unwan must be at least 2 characters long"],
      maxlength: [100, "Unwan cannot exceed 100 characters"],
    },
    takhallus: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Takhallus must be at least 2 characters long"],
      maxlength: [50, "Takhallus cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      index: true,
      trim: true,
    },
    // Azad Nazm — flat array of lines (misra), 1..100 lines, 2..300 chars each
    content: {
      type: [String],
      required: true,
      set: (lines: string[]) => lines.map((line) => line.trim()),
      validate: [
        {
          validator: (lines: string[]) =>
            Array.isArray(lines) && lines.length >= 1 && lines.length <= 100,
          message: "A Nazm must contain between 1 and 100 lines",
        },
        {
          validator: (lines: string[]) =>
            Array.isArray(lines) &&
            lines.every(
              (line) =>
                typeof line === "string" &&
                line.trim().length >= 2 &&
                line.trim().length <= 300
            ),
          message: "Each line must be between 2 and 300 characters",
        },
      ],
    },
    category: {
      type: [String],
      required: true,
      validate: {
        validator: (categories: string[]) =>
          categories.length >= 1 && categories.length <= 10,
        message: "A Nazm must have between 1 and 10 categories",
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
        validator: function (media: MediaFile[]) {
          return media.length <= 20;
        },
        message: "A Nazm can have maximum 20 media files",
      },
    },
    metaTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    links: {
      type: [LinkSchema],
      required: false,
      default: [],
      validate: {
        validator: function (links: Link[]) {
          return links.length <= 5;
        },
        message: "A Nazm can have maximum 5 links",
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

NazmSchema.index(
  { takhallus: 1, createdAt: -1 },
  { name: "takhallus_created_at_idx" }
);

NazmSchema.index(
  { createdAt: -1 },
  { name: "created_at_desc_idx" }
);

NazmSchema.index(
  { category: 1, createdAt: -1 },
  { name: "category_created_at_idx" }
);

NazmSchema.index(
  { likes: 1, createdAt: -1 },
  { name: "likes_created_at_idx" }
);

NazmSchema.index(
  { comments: 1, createdAt: -1 },
  { name: "comments_created_at_idx" }
);

NazmSchema.index(
  { slug: 1 },
  { unique: true, name: "slug_unique_idx" }
);

// New indexes for media
NazmSchema.index(
  { "media.type": 1 },
  { name: "media_type_idx", background: true }
);

NazmSchema.index(
  { "media.createdAt": -1 },
  { name: "media_created_at_idx", background: true }
);

NazmSchema.index(
  { featured: 1, createdAt: -1 },
  { name: "featured_created_at_idx", background: true }
);

NazmSchema.index(
  { views: -1 },
  { name: "views_desc_idx", background: true }
);

NazmSchema.index(
  { publishedAt: -1 },
  { name: "published_at_desc_idx", background: true }
);

NazmSchema.index(
  {
    takhallus: "text",
    content: "text",
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "nazm_search_text_idx",
    background: true,
    weights: {
      takhallus: 10,
      content: 8,
      metaTitle: 6,
      metaDescription: 4,
    },
  }
);

NazmSchema.index(
  { "comments.createdAt": -1 },
  { name: "comments_created_at_desc_idx", background: true }
);

NazmSchema.index(
  {
    unwan: "text",
    takhallus: "text",
    content: "text",
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "nazm_search_text_idx",
    background: true,
    weights: {
      unwan: 12, // highest priority
      takhallus: 10,
      content: 8,
      metaTitle: 6,
      metaDescription: 4,
    },
  }
);

NazmSchema.index(
  { unwan: 1 },
  { collation: { locale: "en", strength: 2 }, name: "unwan_ci_idx" }
);

NazmSchema.index(
  { takhallus: 1 },
  { collation: { locale: "en", strength: 2 }, name: "takhallus_ci_idx" }
);

// MIDDLEWARE

NazmSchema.pre("validate", function () {
  // Slug: generate on create, or when the title changes.
  if ((this.isNew || this.isModified("unwan")) && this.unwan) {
    const base = makeSlug(this.unwan) || "nazm";
    // Last 6 chars of _id keep the unique index from ever colliding
    this.slug = `${base}-${this._id.toString().slice(-6)}`;
  }

  if (!this.metaTitle && this.unwan) {
    this.metaTitle = `${this.unwan} - ${this.takhallus || "Nazm"}`.slice(0, 60);
  }

  if (!this.metaDescription && this.content?.length) {
    const text = this.content.join(" ").slice(0, 150);
    this.metaDescription =
      `${text}... Read the complete nazm by ${this.takhallus || "the poet"}.`.slice(0, 160);
  }

  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// STATIC METHODS

NazmSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug });
};

NazmSchema.statics.findFeatured = function (limit: number = 10) {
  return this.find({ featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

NazmSchema.statics.incrementViews = function (id: Types.ObjectId) {
  return this.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );
};

// MODEL

const NazmModel = models.Nazm || model<Nazm>("Nazm", NazmSchema);

export default NazmModel;