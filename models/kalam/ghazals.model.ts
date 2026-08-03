// models/kalam/ghazals.model.ts
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

interface Ghazal {
  takhallus: string;
  slug: string;
  content: Shair[];
  category: string[];
  coverImage: string;
  metaTitle?: string;
  metaDescription?: string;
  links?: Link[];
  likes: Types.ObjectId[];
  comments: Comment[];
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

      set: (lines: string[]) =>
        lines.map((line) => line.trim()),

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
  },

  {
    timestamps: true,
  }
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

GhazalSchema.pre("validate", function () {
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
    this.metaTitle = `${firstLine} - ${this.takhallus || "Ghazal"}`.slice(0, 60);
  }

  if (!this.metaDescription && this.content) {
    const lines = this.content.slice(0, 2).flatMap((s: any) => s.lines);
    const text = lines.join(" ").slice(0, 150);
    this.metaDescription = `${text}... Read the complete ghazal by ${this.takhallus || "the poet"}.`.slice(0, 160);
  }
});

const GhazalModel =
  models.Ghazal ||
  model<Ghazal>("Ghazal", GhazalSchema);

export default GhazalModel;