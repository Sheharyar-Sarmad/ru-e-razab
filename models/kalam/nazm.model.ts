import { Schema, models, model, Types } from "mongoose";

interface Comment {
  user: Types.ObjectId;
  content: string;
  createdAt: Date;
}

interface Shair {
  lines: string[];
}

interface Band {
  shairs: Shair[];
}

interface Nazm {
  unwan: string;
  takhallus: string;
  content: Band[];
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
    lines: {
      type: [String],
      required: true,
      validate: [
        {
          validator: (lines: string[]) => lines.length === 2,
          message: "Each shair must contain exactly 2 lines",
        },
        {
          validator: (lines: string[]) =>
            lines.every(
              (line) =>
                line.trim().length >= 2 &&
                line.trim().length <= 300,
            ),
          message: "Each line must be between 2 and 300 characters",
        },
      ],
    },
  },
  {
    _id: false,
  },
);

const BandSchema = new Schema<Band>(
  {
    shairs: {
      type: [ShairSchema],
      required: true,
      validate: {
        validator: (shairs: Shair[]) => shairs.length === 2,
        message: "Each band must contain exactly 2 shairs",
      },
    },
  },
  {
    _id: false,
  },
);

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

    content: {
      type: [BandSchema],
      required: true,
      validate: {
        validator: (bands: Band[]) =>
          bands.length >= 1 && bands.length <= 6,
        message: "A Nazm must contain between 1 and 6 bands",
      },
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

const NazmModel =
  models.Nazm || model<Nazm>("Nazm", NazmSchema);

export default NazmModel;