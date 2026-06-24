"use server";

import dbConnect from "../../lib/db";
import User from "../../models/User";
import Category from "../../models/Category";
import MaintenanceTicket from "../../models/MaintenanceTicket";
import TaskAllocation from "../../models/TaskAllocation";
import LifecycleAudit from "../../models/LifecycleAudit";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key_at_least_32_characters_long"
);

// Helper to sign JWT
async function signSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

// Helper to retrieve current user from cookie
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: string;
      email: string;
      role: string;
      fullName: string;
    };
  } catch (err) {
    return null;
  }
}

// Helper to clear cookies
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  revalidatePath("/");
  return { success: true };
}

/**
 * 1. Register User
 */
export async function registerUser(formData: FormData) {
  await dbConnect();

  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "Admin" | "FieldTechnician" | "Requestor";

  if (!fullName || !email || !password || !role) {
    return { success: false, error: "All fields are required" };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return { success: false, error: "Email is already registered" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    const payload = {
      userId: (newUser._id as string).toString(),
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
    };

    const token = await signSessionToken(payload);
    const cookieStore = await cookies();

    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return { success: true, user: payload };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed" };
  }
}

/**
 * 2. Authenticate User
 */
export async function authenticateUser(formData: FormData) {
  await dbConnect();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: "Invalid credentials" };
    }

    const payload = {
      userId: (user._id as string).toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = await signSessionToken(payload);
    const cookieStore = await cookies();

    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return { success: true, user: payload };
  } catch (err: any) {
    return { success: false, error: err.message || "Authentication failed" };
  }
}

/**
 * 3. File Maintenance Ticket
 */
export async function fileMaintenanceTicket(formData: FormData) {
  await dbConnect();

  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized access" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("category") as string;
  const priority = formData.get("priority") as "Routine" | "Elevated" | "Critical" | "Emergency";

  if (!title || !description || !categoryId || !priority) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    // Verify category exists
    const categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return { success: false, error: "Invalid category selected" };
    }

    let attachmentUrl = "";
    const file = formData.get("attachment") as File | null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const storageDir = path.join(process.cwd(), "public", "storage");
      await mkdir(storageDir, { recursive: true });

      const safeName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(storageDir, safeName);
      
      await writeFile(filePath, buffer);
      attachmentUrl = `/storage/${safeName}`;
    }

    const ticket = await MaintenanceTicket.create({
      title,
      description,
      category: categoryId,
      status: "Submitted",
      priority,
      attachmentUrl: attachmentUrl || undefined,
      loggedBy: user.userId,
    });

    // Write initial Audit log row
    await LifecycleAudit.create({
      ticketId: ticket._id,
      actionedBy: user.userId,
      previousState: undefined,
      newState: "Submitted",
    });

    revalidatePath("/dashboard");
    return { success: true, ticketId: (ticket._id as string).toString() };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit ticket" };
  }
}

/**
 * 4. Allocate Technician (Admin only)
 */
export async function allocateTechnician(ticketId: string, technicianId: string) {
  await dbConnect();

  const user = await getSessionUser();
  if (!user || user.role !== "Admin") {
    return { success: false, error: "Admin authorization required" };
  }

  try {
    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== "FieldTechnician") {
      return { success: false, error: "Selected user is not a Field Technician" };
    }

    const ticket = await MaintenanceTicket.findById(ticketId);
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const previousState = ticket.status;

    // Mutate state to Dispatched
    ticket.status = "Dispatched";
    await ticket.save();

    // Map allocation collection using findOneAndUpdate with upsert: true
    await TaskAllocation.findOneAndUpdate(
      { ticketId, technicianId },
      { allocatedAt: new Date(), closedAt: undefined },
      { upsert: true, new: true }
    );

    // Log the lifecycle audit record
    await LifecycleAudit.create({
      ticketId,
      actionedBy: user.userId,
      previousState,
      newState: "Dispatched",
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to allocate technician" };
  }
}

/**
 * 5. Transition Ticket State (Admin or Assigned Technician)
 */
export async function transitionTicketState(
  ticketId: string,
  targetState: "Submitted" | "Dispatched" | "Active" | "Resolved"
) {
  await dbConnect();

  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    const ticket = await MaintenanceTicket.findById(ticketId);
    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const previousState = ticket.status;

    // Check permissions: Must be Admin OR the assigned Operator
    if (user.role !== "Admin") {
      const assignment = await TaskAllocation.findOne({ ticketId, technicianId: user.userId });
      if (!assignment) {
        return { success: false, error: "You are not authorized to edit this ticket" };
      }
    }

    // Apply mutation
    ticket.status = targetState;
    await ticket.save();

    // If resolving, close the task allocation timing (closedAt)
    if (targetState === "Resolved") {
      await TaskAllocation.updateMany(
        { ticketId, closedAt: { $exists: false } },
        { $set: { closedAt: new Date() } }
      );
    }

    // Write audit ledger row
    await LifecycleAudit.create({
      ticketId,
      actionedBy: user.userId,
      previousState,
      newState: targetState,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to transition ticket" };
  }
}

/**
 * Helper: Fetch all categories
 */
export async function getCategories() {
  await dbConnect();
  try {
    const list = await Category.find({});
    return JSON.parse(JSON.stringify(list));
  } catch (err) {
    return [];
  }
}

/**
 * Helper: Fetch tickets based on user role
 */
export async function getTickets() {
  await dbConnect();
  const user = await getSessionUser();
  if (!user) return [];

  try {
    let query = {};
    if (user.role === "Requestor") {
      query = { loggedBy: user.userId };
    } else if (user.role === "FieldTechnician") {
      // Find tickets assigned to this technician OR tickets in 'Submitted' state
      const allocations = await TaskAllocation.find({ technicianId: user.userId });
      const assignedTicketIds = allocations.map((a) => a.ticketId);
      query = {
        $or: [
          { _id: { $in: assignedTicketIds } },
          { status: "Submitted" },
        ],
      };
    }
    // Admin sees all tickets

    const list = await MaintenanceTicket.find(query)
      .populate("category")
      .populate("loggedBy", "fullName email")
      .sort({ createdAt: -1 });

    // Fetch allocations and audits for these tickets
    const ticketIds = list.map((t) => t._id);
    const allocations = await TaskAllocation.find({ ticketId: { $in: ticketIds } })
      .populate("technicianId", "fullName email");
    const audits = await LifecycleAudit.find({ ticketId: { $in: ticketIds } })
      .populate("actionedBy", "fullName role")
      .sort({ timestamp: 1 });

    const formattedTickets = list.map((ticket) => {
      const ticketAllocations = allocations.filter(
        (a) => a.ticketId.toString() === ticket._id.toString()
      );
      const ticketAudits = audits.filter(
        (au) => au.ticketId.toString() === ticket._id.toString()
      );

      return {
        _id: ticket._id.toString(),
        title: ticket.title,
        description: ticket.description,
        category: ticket.category ? {
          _id: (ticket.category as any)._id.toString(),
          name: (ticket.category as any).name,
        } : null,
        status: ticket.status,
        priority: ticket.priority,
        attachmentUrl: ticket.attachmentUrl || null,
        loggedBy: ticket.loggedBy ? {
          _id: (ticket.loggedBy as any)._id.toString(),
          fullName: (ticket.loggedBy as any).fullName,
          email: (ticket.loggedBy as any).email,
        } : null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        allocations: ticketAllocations.map((a) => ({
          _id: a._id.toString(),
          technician: a.technicianId ? {
            _id: (a.technicianId as any)._id.toString(),
            fullName: (a.technicianId as any).fullName,
            email: (a.technicianId as any).email,
          } : null,
          allocatedAt: a.allocatedAt.toISOString(),
          closedAt: a.closedAt ? a.closedAt.toISOString() : null,
        })),
        audits: ticketAudits.map((au) => ({
          _id: au._id.toString(),
          actionedBy: au.actionedBy ? {
            _id: (au.actionedBy as any)._id.toString(),
            fullName: (au.actionedBy as any).fullName,
            role: (au.actionedBy as any).role,
          } : null,
          previousState: au.previousState || null,
          newState: au.newState,
          timestamp: au.timestamp.toISOString(),
        })),
      };
    });

    return formattedTickets;
  } catch (err) {
    console.error("Failed to get tickets:", err);
    return [];
  }
}

/**
 * Helper: Fetch all Field Technicians (for Admin dispatch view)
 */
export async function getFieldTechnicians() {
  await dbConnect();
  const user = await getSessionUser();
  if (!user || user.role !== "Admin") return [];

  try {
    const list = await User.find({ role: "FieldTechnician" }, "fullName email");
    return JSON.parse(JSON.stringify(list));
  } catch (err) {
    return [];
  }
}
