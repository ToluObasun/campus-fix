import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ITaskAllocation extends Document {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  technicianId: mongoose.Types.ObjectId;
  allocatedAt: Date;
  closedAt?: Date;
}

const TaskAllocationSchema = new Schema<ITaskAllocation>({
  ticketId: { type: Schema.Types.ObjectId, ref: "MaintenanceTicket", required: true },
  technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  allocatedAt: { type: Date, default: Date.now, required: true },
  closedAt: { type: Date },
});

// Enforce compound unique index on { ticketId: 1, technicianId: 1 }
TaskAllocationSchema.index({ ticketId: 1, technicianId: 1 }, { unique: true });

export default models.TaskAllocation || model<ITaskAllocation>("TaskAllocation", TaskAllocationSchema);
