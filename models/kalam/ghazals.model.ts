import { Schema, models, model, Types } from "mongoose";

interface Comment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
}

interface Shair {
  lines: string[];
}

interface Ghazal {
  takhallus: string;
  slug: string;
  content: Shair[];
  category: string[];
  coverImage: string;
  likes: Types.ObjectId[];
  comments: Comment[];
}

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
  },
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
  },
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
  },
);

// Indexes
// 1. For pagination sorting
GhazalSchema.index(
  { createdAt: -1 },
  { name: "created_at_desc_idx" }
);

// 2. For search by first line (CRITICAL for your API!)
GhazalSchema.index(
  { "content.0.lines.0": 1 },
  { name: "first_line_search_idx" }
);

// 3. For search + pagination (Compound Index)
GhazalSchema.index(
  { "content.0.lines.0": 1, createdAt: -1 },
  { name: "search_pagination_idx" }
);

// 4. For takhallus search + sorting
GhazalSchema.index(
  { takhallus: 1, createdAt: -1 },
  { name: "takhallus_created_at_idx" }
);

// 5. For count queries
GhazalSchema.index(
  { createdAt: -1 },
  { 
    name: "count_idx",
    sparse: true 
  }
);

// 6. For category filtering
GhazalSchema.index(
  { category: 1, createdAt: -1 },
  { name: "category_created_at_idx" }
);

// 7. For popular ghazals (by likes)
GhazalSchema.index(
  { likes: 1, createdAt: -1 },
  { name: "likes_created_at_idx" }
);

// 8. For most commented ghazals
GhazalSchema.index(
  { "comments": 1, createdAt: -1 },
  { name: "comments_created_at_idx" }
);

// Automatically generate slug from the first line
// of the first shair
GhazalSchema.pre("validate", function () {
  if (this.content?.[0]?.lines?.[0]) {
    this.slug = this.content[0].lines[0]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

const GhazalModel =
  models.Ghazal ||
  model<Ghazal>("Ghazal", GhazalSchema);

export default GhazalModel;