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
      required: false,
      unique: true,
      sparse: true, // Important: Allows multiple null/undefined values
      trim: true,
      match: [
        /^(\+\d{1,3}[- ]?)?\d{10,14}$/, // More flexible: +92 300 1234567 or 03001234567
        "Please enter a valid phone number",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
AdminAccountSchema.index(
  { accountname: 1 },
  {
    unique: true,
    name: "idx_accountname_unique",
    background: true,
  },
);

AdminAccountSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "idx_email_unique",
    background: true,
  },
);

AdminAccountSchema.index(
  { phonenumber: 1 },
  {
    unique: true,
    name: "idx_phonenumber_unique",
    background: true,
  },
);

AdminAccountSchema.index(
  { accountname: 1, email: 1, phonenumber: 1 },
  {
    name: "login_compound_idx",
    background: true,
  },
);

// 2. Index for sorting by createdAt (for admin listing)
AdminAccountSchema.index(
  { createdAt: -1 },
  {
    name: "created_at_desc_idx",
    background: true,
  },
);

// 3. Index for sorting by updatedAt
AdminAccountSchema.index(
  { updatedAt: -1 },
  {
    name: "updated_at_desc_idx",
    background: true,
  },
);

// 4. Text index for search functionality (optional but recommended)
AdminAccountSchema.index(
  {
    accountname: "text",
    email: "text",
    firstname: "text",
    lastname: "text",
  },
  {
    name: "admin_search_text_idx",
    background: true,
    weights: {
      accountname: 10,
      email: 8,
      firstname: 5,
      lastname: 5,
    },
  },
);

// 5. Compound index for duplicate checking during signup
AdminAccountSchema.index(
  { accountname: 1, email: 1, phonenumber: 1 },
  {
    name: "duplicate_check_idx",
    background: true,
  },
);

const AdminAccountModel =
  models.AdminAccount ||
  model<AdminAccount>("AdminAccount", AdminAccountSchema);

export default AdminAccountModel;
