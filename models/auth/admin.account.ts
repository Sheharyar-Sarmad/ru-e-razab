import { Schema, models, model } from "mongoose";

interface AdminAccount {
  accountname: string;
  firstname: string;
  lastname: string;
  password: string;
  phonenumber: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAccountSchema = new Schema<AdminAccount>(
  {
    accountname: {
      type: String,
      required: [true, "Account name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Account name must be at least 3 characters"],
      maxlength: [50, "Account name cannot exceed 50 characters"],
      lowercase: true,
      match: [
        /^[a-z0-9_]+$/,
        "Account name can only contain lowercase letters, numbers, and underscores",
      ],
    },

    firstname: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
      match: [
        /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/,
        "First name contains invalid characters",
      ],
    },

    lastname: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
      match: [
        /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/,
        "Last name contains invalid characters",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [100, "Password cannot exceed 100 characters"],
      select: false, // Exclude password from query results by default

      validate: {
        validator: function (password: string) {
          return (
            /[A-Z]/.test(password) && // uppercase
            /[a-z]/.test(password) && // lowercase
            /[0-9]/.test(password) && // number
            /[^A-Za-z0-9]/.test(password) // special character
          );
        },
        message:
          "Password must contain uppercase, lowercase, number, and special character",
      },
    },

    phonenumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,

      // E.164 format
      match: [
        /^\+[1-9]\d{7,14}$/,
        "Phone number must be in international format, e.g. +923001234567",
      ],
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
        "Please enter a valid email address",
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries on unique fields
AdminAccountSchema.index({ accountname: 1 }, { unique: true });
AdminAccountSchema.index({ email: 1 }, { unique: true });
AdminAccountSchema.index({ phonenumber: 1 }, { unique: true });

const AdminAccountModel =
  models.AdminAccount ||
  model<AdminAccount>("AdminAccount", AdminAccountSchema);

export default AdminAccountModel;
