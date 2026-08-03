// models/auth/user.account.model.ts
import { Schema, models, model } from "mongoose";

interface UserAccount {
  accountname: string;
  firstname: string;
  lastname: string;
  password: string;
  phonenumber: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserAccountSchema = new Schema<UserAccount>(
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
      select: false,
      validate: {
        validator: function (password: string) {
          return (
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
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
      sparse: true,
      trim: true,
      match: [
        /^(\+\d{1,3}[- ]?)?\d{10,14}$/,
        "Please enter a valid phone number",
      ],
    },

    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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
  }
);

// ============================================
// ✅ KEPT - ESSENTIAL INDEXES
// ============================================

// 1. Unique indexes (required)
UserAccountSchema.index(
  { accountname: 1 },
  {
    unique: true,
    name: "idx_accountname_unique",
    background: true,
  }
);

UserAccountSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "idx_email_unique",
    background: true,
  }
);

UserAccountSchema.index(
  { phonenumber: 1 },
  {
    unique: true,
    name: "idx_phonenumber_unique",
    background: true,
  }
);

// 2. For counting users (total, new this week)
UserAccountSchema.index(
  { createdAt: -1 },
  {
    name: "created_at_desc_idx",
    background: true,
  }
);

// 3. For active users (users with comments or likes)
UserAccountSchema.index(
  { "comments": 1 },
  { 
    name: "user_comments_idx",
    background: true,
    sparse: true 
  }
);

UserAccountSchema.index(
  { "likes": 1 },
  { 
    name: "user_likes_idx",
    background: true,
    sparse: true 
  }
);

// 4. Login compound index
UserAccountSchema.index(
  { accountname: 1, email: 1, phonenumber: 1 },
  {
    name: "login_compound_idx",
    background: true,
  }
);

// ============================================
// ❌ REMOVED - UNNECESSARY INDEXES
// ============================================

// Removed: user_search_compound_idx
// Removed: search_pagination_idx
// Removed: or_search_idx
// Removed: updated_at_desc_idx
// Removed: duplicate_check_idx
// Removed: user_active_created_idx

const UserAccountModel =
  models.UserAccount || model<UserAccount>("UserAccount", UserAccountSchema);

export default UserAccountModel;