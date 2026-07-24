import { Schema, models, model, Types } from "mongoose";

interface Comment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
}

interface Shair {
  takhallus: string;
  slug: string;
  content: string[];
  category: string[];
  coverImage: string;
  likes: Types.ObjectId[];
  comments: Comment[];
}

const CommentSchema = new Schema<Comment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
  },
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

      set: (lines: string[]) =>
        lines.map((line) => line.trim()),

      validate: [
        {
          validator: (lines: string[]) =>
            lines.length === 2,

          message:
            "A Shair must contain exactly 2 lines",
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

    category: {
      type: [String],
      required: true,

      validate: {
        validator: (categories: string[]) =>
          categories.length >= 1 &&
          categories.length <= 10,

        message:
          "A Shair must have between 1 and 10 categories",
      },
    },

    coverImage: {
      type: String,
      required: true,
      trim: true,
    },

    likes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
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
  },
);

// Automatically generate slug from the first line
ShairSchema.pre("validate", function () {
  if (this.content?.[0]) {
    this.slug = this.content[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const ShairModel =
  models.Shair ||
  model<Shair>("Shair", ShairSchema);

export default ShairModel;