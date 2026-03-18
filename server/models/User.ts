import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "staff" | "user" | "accounting_manager" | "hr_manager" | "sales_person" | "accounting_person" | "payroll_manager" | "procurement_manager";
  jobTitle?: string;
  avatar?: string;
  // Auth0 integration field
  auth0Id?: string;
  // Pending password change fields (email-confirmation flow)
  pendingPasswordHash?: string;
  pendingPasswordToken?: string;
  pendingPasswordExpires?: Date;
  // Phone number and verification
  phone?: string;
  phoneVerified?: boolean;
  pendingPhone?: string;
  pendingPhoneToken?: string;
  pendingPhoneExpires?: Date;
  // Email verification
  emailVerified?: boolean;
  // timestamp when sessions for this user were last invalidated
  lastSessionInvalidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function(this: IUser) {
        // Password is required unless it's an Auth0 user
        return !this.auth0Id;
      },
      minlength: 4,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user", "accounting_manager", "hr_manager", "sales_person", "accounting_person", "payroll_manager", "procurement_manager"],
      default: "user",
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    auth0Id: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple users without auth0Id
    },
    phone: { type: String, unique: true, sparse: true },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    pendingPhone: { type: String },
    pendingPhoneToken: { type: String },
    pendingPhoneExpires: { type: Date },
    pendingPasswordHash: { type: String },
    pendingPasswordToken: { type: String },
    pendingPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
