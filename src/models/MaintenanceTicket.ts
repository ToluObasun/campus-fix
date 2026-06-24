import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IMaintenanceTicket extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: mongoose.Types.ObjectId;
  status: "Submitted" | "Dispatched" | "Active" | "Resolved";
  priority: "Routine" | "Elevated" | "Critical" | "Emergency";
  attachmentUrl?: string;
  loggedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceTicketSchema = new Schema<IMaintenanceTicket>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    status: {
      type: String,
      enum: ["Submitted", "Dispatched", "Active", "Resolved"],
      default: "Submitted",
    },
    priority: {
      type: String,
      enum: ["Routine", "Elevated", "Critical", "Emergency"],
      default: "Routine",
    },
    attachmentUrl: { type: String },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default models.MaintenanceTicket || model<IMaintenanceTicket>("MaintenanceTicket", MaintenanceTicketSchema);
