import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  role: "Admin" | "FieldTechnician" | "Requestor";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "FieldTechnician", "Requestor"],
      default: "Requestor",
    },
  },
  { timestamps: true }
);

export default models.User || model<IUser>("User", UserSchema);
