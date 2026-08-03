// models/kalam/shair.model.ts
import { Schema, models, model, Types } from "mongoose";

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

interface Shair {
  takhallus: string;
  slug: string;
  content: string[];
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
      type: [String],
      required: true,
      set: (lines: string[]) => lines.map((line) => line.trim()),
      validate: [
        {
          validator: (lines: string[]) => lines.length === 2,
          message: "A Shair must contain exactly 2 lines",
        },
        {
          validator: (lines: string[]) =>
            lines.every((line) => line.length >= 2 && line.length <= 300),
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
        message: "A Shair must have between 1 and 10 categories",
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
        const firstLine = this.content?.[0] || "";
        return `${firstLine} - ${this.takhallus || "Shair"}`.slice(0, 60);
      },
    },

    metaDescription: {
      type: String,
      required: false,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
      default: function(this: any) {
        const lines = this.content || [];
        const text = lines.join(" ").slice(0, 150);
        return `${text}... Read the complete shair by ${this.takhallus || "the poet"}.`.slice(0, 160);
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
        message: "A Shair can have maximum 5 links",
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

ShairSchema.index(
  { slug: 1 },
  { unique: true, name: "slug_unique_idx" }
);

ShairSchema.index(
  { takhallus: 1, createdAt: -1 },
  { name: "takhallus_created_at_idx" }
);

ShairSchema.index(
  { createdAt: -1 },
  { name: "created_at_desc_idx" }
);

ShairSchema.index(
  { "content": "text" },
  {
    name: "content_text_search_idx",
    background: true,
    weights: {
      content: 10,
    },
  }
);

ShairSchema.index(
  { category: 1 },
  {
    name: "category_idx",
    background: true,
  }
);

ShairSchema.index(
  { category: 1, createdAt: -1 },
  {
    name: "category_created_at_idx",
    background: true,
  }
);

ShairSchema.index(
  {
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "meta_text_search_idx",
    background: true,
    weights: {
      metaTitle: 8,
      metaDescription: 5,
    },
  }
);

ShairSchema.index(
  { takhallus: 1, category: 1, createdAt: -1 },
  {
    name: "takhallus_category_created_at_idx",
    background: true,
  }
);

ShairSchema.index(
  {
    takhallus: "text",
    content: "text",
    metaTitle: "text",
    metaDescription: "text",
  },
  {
    name: "full_text_search_idx",
    background: true,
    weights: {
      takhallus: 10,
      content: 8,
      metaTitle: 6,
      metaDescription: 4,
    },
  }
);

ShairSchema.index(
  { likes: 1, createdAt: -1 },
  {
    name: "likes_created_at_idx",
    background: true,
  }
);

ShairSchema.index(
  { "comments": 1, createdAt: -1 },
  {
    name: "comments_created_at_idx",
    background: true,
  }
);

ShairSchema.pre("validate", function () {
  if (this.content?.[0]) {
    this.slug = this.content[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  if (!this.metaTitle && this.content?.[0]) {
    const firstLine = this.content[0];
    this.metaTitle = `${firstLine} - ${this.takhallus || "Shair"}`.slice(0, 60);
  }

  if (!this.metaDescription && this.content) {
    const lines = this.content || [];
    const text = lines.join(" ").slice(0, 150);
    this.metaDescription = `${text}... Read the complete shair by ${this.takhallus || "the poet"}.`.slice(0, 160);
  }
});

const ShairModel = models.Shair || model<Shair>("Shair", ShairSchema);

export default ShairModel;