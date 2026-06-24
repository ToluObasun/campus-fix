import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ILifecycleAudit extends Document {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  actionedBy: mongoose.Types.ObjectId;
  previousState?: string;
  newState: string;
  timestamp: Date;
}

const LifecycleAuditSchema = new Schema<ILifecycleAudit>({
  ticketId: { type: Schema.Types.ObjectId, ref: "MaintenanceTicket", required: true },
  actionedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  previousState: { type: String },
  newState: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
});

export default models.LifecycleAudit || model<ILifecycleAudit>("LifecycleAudit", LifecycleAuditSchema);
