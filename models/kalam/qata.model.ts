// models/kalam/qata.model.ts
import { Schema, models, model, Types } from "mongoose";

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
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  alt?: string;
  metadata?: Record<string, any>;
}

interface Qata {
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
            lines.every((line) => line.length >= 2 && line.length <= 300),
          message: "Each line must be between 2 and 300 characters",
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

const QataSchema = new Schema<Qata>(
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
        validator: (shairs: Shair[]) => shairs.length === 2,
        message: "A Qata must contain exactly 2 shairs",
      },
    },

    category: {
      type: [String],
      required: true,
      validate: {
        validator: (categories: string[]) =>
          categories.length >= 1 && categories.length <= 10,
        message: "A Qata must have between 1 and 10 categories",
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
          return media.length <= 20;
        },
        message: "A Qata can have maximum 20 media files",
      },
    },

    metaTitle: {
      type: String,
      required: false,
      trim: true,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
      default: function(this: any) {
        const firstLine = this.content?.[0]?.lines?.[0] || "";
        return `${firstLine} - ${this.takhallus || "Qata"}`.slice(0, 60);
      },
    },

    metaDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      default: function(this: any) {
        const lines = this.content?.flatMap((s: any) => s.lines) || [];
        const text = lines.join(" ").slice(0, 150);
        return `${text}... Read the complete qata by ${this.takhallus || "the poet"}.`.slice(0, 160);
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
        message: "A Qata can have maximum 5 links",
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

QataSchema.index(
  { slug: 1 },
  { unique: true, name: "slug_unique_idx" }
);

QataSchema.index(
  { takhallus: 1, createdAt: -1 },
  { name: "takhallus_created_at_idx" }
);

QataSchema.index(
  { createdAt: -1 },
  { name: "created_at_desc_idx" }
);

QataSchema.index(
  { category: 1, createdAt: -1 },
  { name: "category_created_at_idx" }
);

QataSchema.index(
  { likes: 1, createdAt: -1 },
  { name: "likes_created_at_idx" }
);

QataSchema.index(
  { featured: 1, createdAt: -1 },
  { name: "featured_created_at_idx" }
);

QataSchema.index(
  { views: -1 },
  { name: "views_desc_idx" }
);

QataSchema.index(
  { publishedAt: -1 },
  { name: "published_at_desc_idx" }
);

QataSchema.index(
  { "media.type": 1 },
  { name: "media_type_idx", background: true }
);

QataSchema.index(
  { "media.createdAt": -1 },
  { name: "media_created_at_idx", background: true }
);

QataSchema.index(
  {
    takhallus: "text",
    "content.lines": "text",
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "qata_search_idx",
    background: true,
    weights: {
      takhallus: 10,
      "content.lines": 8,
      metaTitle: 6,
      metaDescription: 4,
    },
  }
);

// MIDDLEWARE 

QataSchema.pre("validate", function () {
  if (this.content?.[0]?.lines?.[0]) {
    this.slug = this.content[0].lines[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  if (!this.metaTitle && this.content?.[0]?.lines?.[0]) {
    const firstLine = this.content[0].lines[0];
    this.metaTitle = `${firstLine} - ${this.takhallus || "Qata"}`.slice(0, 60);
  }

  if (!this.metaDescription && this.content) {
    const lines = this.content.flatMap((s: any) => s.lines);
    const text = lines.join(" ").slice(0, 150);
    this.metaDescription = `${text}... Read the complete qata by ${this.takhallus || "the poet"}.`.slice(0, 160);
  }

  // Set publishedAt if not set
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// STATIC METHODS 

QataSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug });
};

QataSchema.statics.findFeatured = function(limit: number = 10) {
  return this.find({ featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

QataSchema.statics.incrementViews = function(id: Types.ObjectId) {
  return this.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  );
};

QataSchema.index(
  { "comments.createdAt": -1 },
  { name: "comments_created_at_desc_idx", background: true }
);


const QataModel = models.Qata || model<Qata>("Qata", QataSchema);

export default QataModel;