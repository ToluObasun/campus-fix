"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logoutUser,
  fileMaintenanceTicket,
  allocateTechnician,
  transitionTicketState,
} from "../actions/main";
import SuccessModal from "../../components/SuccessModal";
import {
  LogOut,
  Plus,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Paperclip,
  Wrench,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DashboardViewProps {
  user: {
    userId: string;
    email: string;
    role: string;
    fullName: string;
  };
  tickets: any[];
  categories: any[];
  technicians: any[];
}

export default function DashboardView({
  user,
  tickets,
  categories,
  technicians,
}: DashboardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Create Ticket Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPriority, setFormPriority] = useState("Routine");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Success Modal states
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successTicketTitle, setSuccessTicketTitle] = useState("");
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);

  // Expanded timelines ticket IDs state
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Technician Allocation state
  const [assigningTechnician, setAssigningTechnician] = useState<{ [ticketId: string]: string }>({});

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
    router.refresh();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim() || !formDescription.trim() || !formCategory || !formPriority) {
      setFormError("All fields except attachment are required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", formTitle);
    formData.append("description", formDescription);
    formData.append("category", formCategory);
    formData.append("priority", formPriority);
    if (selectedFile) {
      formData.append("attachment", selectedFile);
    }

    const startTime = performance.now();

    startTransition(async () => {
      const result = await fileMaintenanceTicket(formData);
      const endTime = performance.now();
      
      if (result.success) {
        setSuccessTicketTitle(formTitle);
        setElapsedTimeMs(endTime - startTime);
        setIsSuccessOpen(true);

        // Reset Form
        setFormTitle("");
        setFormDescription("");
        setFormCategory("");
        setFormPriority("Routine");
        setSelectedFile(null);
        setShowCreateForm(false);
        router.refresh();
      } else {
        setFormError(result.error || "Submission failed");
      }
    });
  };

  const handleAssignTech = async (ticketId: string) => {
    const techId = assigningTechnician[ticketId];
    if (!techId) return;

    startTransition(async () => {
      const result = await allocateTechnician(ticketId, techId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Dispatch failed");
      }
    });
  };

  const handleTransitionState = async (
    ticketId: string,
    targetState: "Submitted" | "Dispatched" | "Active" | "Resolved"
  ) => {
    startTransition(async () => {
      const result = await transitionTicketState(ticketId, targetState);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "State transition failed");
      }
    });
  };

  // Filtered tickets logic
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "ALL" || ticket.category?.name === selectedCategory;

    const matchesPriority =
      selectedPriority === "ALL" || ticket.priority === selectedPriority;

    const matchesStatus =
      selectedStatus === "ALL" || ticket.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case "Routine":
        return "bg-slate-100 text-slate-800 border-slate-400";
      case "Elevated":
        return "bg-blue-100 text-blue-800 border-blue-400";
      case "Critical":
        return "bg-amber-100 text-amber-800 border-amber-400";
      case "Emergency":
        return "bg-red-100 text-red-800 border-red-400 animate-pulse";
      default:
        return "bg-slate-100 border-slate-300";
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-yellow-100 text-yellow-800 border-yellow-400";
      case "Dispatched":
        return "bg-purple-100 text-purple-800 border-purple-400";
      case "Active":
        return "bg-indigo-100 text-indigo-800 border-indigo-400";
      case "Resolved":
        return "bg-green-100 text-green-800 border-green-400";
      default:
        return "bg-slate-100 border-slate-300";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Control Deck */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-2 border-brand-dark p-4 bg-white shadow-brutalist">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold border-2 border-brand-dark px-2 py-1.5 bg-brand-bg uppercase">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </div>

          {/* Category Select */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="brutalist-input py-1 text-xs font-bold"
          >
            <option value="ALL">ALL CATEGORIES</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Priority Select */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="brutalist-input py-1 text-xs font-bold"
          >
            <option value="ALL">ALL PRIORITIES</option>
            <option value="Routine">ROUTINE</option>
            <option value="Elevated">ELEVATED</option>
            <option value="Critical">CRITICAL</option>
            <option value="Emergency">EMERGENCY</option>
          </select>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="brutalist-input py-1 text-xs font-bold"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="Submitted">SUBMITTED</option>
            <option value="Dispatched">DISPATCHED</option>
            <option value="Active">ACTIVE</option>
            <option value="Resolved">RESOLVED</option>
          </select>
        </div>

        {/* Search and Action Buttons */}
        <div className="flex items-center gap-3 flex-grow md:flex-grow-0 justify-between md:justify-end">
          <div className="relative flex-grow md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH TICKETS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="brutalist-input pl-9 py-1.5 w-full text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            {user.role === "Requestor" && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="brutalist-button px-3 py-1.5 bg-brand-accent text-white text-xs font-bold uppercase flex items-center gap-1.5 hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                FILE_TICKET
              </button>
            )}

            <button
              onClick={handleLogout}
              className="brutalist-button px-3 py-1.5 bg-red-100 text-red-800 text-xs font-bold uppercase flex items-center gap-1.5 hover:bg-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              EXIT
            </button>
          </div>
        </div>
      </div>

      {/* New Maintenance Ticket Form (Requestor only toggle) */}
      {showCreateForm && user.role === "Requestor" && (
        <div className="brutalist-card bg-white p-6 shadow-brutalist border-2 border-brand-dark animate-fade-in">
          <div className="border-b-2 border-brand-dark pb-3 mb-4 flex items-center justify-between">
            <h3 className="font-mono text-base font-extrabold uppercase tracking-tight">
              📄 NEW CAMPUS INFRASTRUCTURE SERVICE REQUEST
            </h3>
            <span className="font-mono text-xs text-slate-500 uppercase bg-slate-100 px-2 py-0.5 border border-slate-300">
              AUDIT: LOGGEDBY_{user.fullName.replace(/\s+/g, "").toUpperCase()}
            </span>
          </div>

          {formError && (
            <div className="border-2 border-brand-dark bg-red-100 p-3 mb-4 font-mono text-xs text-red-700 font-bold uppercase tracking-wide">
              ⚠️ ERROR: {formError}
            </div>
          )}

          <form onSubmit={handleCreateTicketSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="font-mono text-xs font-bold uppercase text-slate-700">Ticket Title / Short Summary</label>
              <input
                type="text"
                placeholder="e.g. Water leak in dorm room 302 bathroom ceiling"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="brutalist-input w-full"
                required
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="font-mono text-xs font-bold uppercase text-slate-700">Category Directory</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="brutalist-input w-full"
                required
              >
                <option value="">SELECT CATEGORY...</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="font-mono text-xs font-bold uppercase text-slate-700">Detailed Scope Description</label>
              <textarea
                placeholder="Please describe in detail the issue. Include dimensions, exact fixtures, safety implications, or access notes."
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="brutalist-input w-full font-sans text-sm"
                required
              />
            </div>

            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-bold uppercase text-slate-700">Priority Urgency Level</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="brutalist-input w-full"
                  required
                >
                  <option value="Routine">ROUTINE (MAINTENANCECYCLE)</option>
                  <option value="Elevated">ELEVATED (24H RESPONSE)</option>
                  <option value="Critical">CRITICAL (SAME DAY OUTAGE)</option>
                  <option value="Emergency">EMERGENCY (LIFE SAFETY / FLOOD)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-bold uppercase text-slate-700">Media Attachment (Image/Doc)</label>
                <div className="relative border-2 border-brand-dark p-2 text-center bg-brand-bg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-slate-600">
                    <Paperclip className="w-3.5 h-3.5" />
                    {selectedFile ? selectedFile.name : "ATTACH_FILE_STREAM"}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-12 flex justify-end gap-3 mt-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="brutalist-button px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 uppercase font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="brutalist-button px-5 py-2 text-xs bg-brand-dark hover:bg-brand-dark/95 text-white uppercase font-bold disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "File Ticket (Submit)"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List Workspace */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-dark pb-2">
          <h3 className="font-mono text-sm font-extrabold uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-accent animate-pulse" />
            TICKETS_LEDGER [Count: {filteredTickets.length}]
          </h3>
          <span className="font-mono text-[10px] text-slate-500">SORT: NEWEST_FIRST</span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="brutalist-card bg-white p-12 text-center font-mono text-sm text-slate-500 uppercase">
            🚨 NO SYSTEM TICKETS DETECTED IN SELECTED GRID
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTickets.map((ticket) => {
              const isAssignedToMe = ticket.allocations.some(
                (a: any) => a.technician?._id === user.userId && !a.closedAt
              );
              
              const isExpanded = expandedTicketId === ticket._id;

              return (
                <div
                  key={ticket._id}
                  className="brutalist-card bg-white overflow-hidden flex flex-col transition-all border-2 border-brand-dark"
                >
                  {/* Ticket Header Banner */}
                  <div className="bg-slate-50 border-b-2 border-brand-dark p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black border border-brand-dark bg-white px-2 py-0.5 shadow-brutalist-sm">
                        ID: {ticket._id.substring(ticket._id.length - 8).toUpperCase()}
                      </span>
                      <span className={`font-mono text-[10px] font-bold border px-2 py-0.5 rounded-none ${getPriorityBadgeStyles(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className={`font-mono text-[10px] font-bold border px-2 py-0.5 rounded-none ${getStatusBadgeStyles(ticket.status)}`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <UserIcon className="w-3 h-3" />
                        Logged By: {ticket.loggedBy?.fullName}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 flex flex-col gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                          [{ticket.category?.name || "No Category"}]
                        </span>
                        <h4 className="font-sans text-base font-extrabold text-brand-dark mt-0.5 leading-tight">
                          {ticket.title}
                        </h4>
                      </div>
                      <p className="font-sans text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {ticket.description}
                      </p>

                      {ticket.attachmentUrl && (
                        <div className="mt-2">
                          <a
                            href={ticket.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-brand-accent hover:underline border border-dashed border-brand-accent p-1.5 bg-blue-50"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            VIEW_ATTACHMENT_STREAM
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Operator/Allocation Metadata Box */}
                    <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 flex flex-col gap-2.5">
                      <div className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        Operator Status
                      </div>

                      {ticket.allocations.length > 0 ? (
                        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-300 p-2 font-mono text-xs">
                          {ticket.allocations.map((alloc: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5 border-b last:border-0 border-slate-200 pb-1.5 last:pb-0">
                              <div className="font-bold text-slate-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-brand-accent rounded-full"></span>
                                {alloc.technician?.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Allocated: {new Date(alloc.allocatedAt).toLocaleDateString()}
                              </div>
                              {alloc.closedAt ? (
                                <div className="text-[10px] text-green-700 font-bold">
                                  Closed: {new Date(alloc.closedAt).toLocaleDateString()}
                                </div>
                              ) : (
                                <div className="text-[10px] text-orange-700 font-bold animate-pulse">
                                  ACTIVE ASSIGNMENT
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-300 text-red-800 p-2 font-mono text-xs uppercase font-bold text-center">
                          ⚠️ UNASSIGNED_STATE
                        </div>
                      )}

                      {/* Admin Dispatching Actions */}
                      {user.role === "Admin" && ticket.status === "Submitted" && (
                        <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-200 pt-2">
                          <label className="font-mono text-[10px] font-bold text-slate-600 uppercase">Dispatch Tech</label>
                          <div className="flex gap-2">
                            <select
                              value={assigningTechnician[ticket._id] || ""}
                              onChange={(e) =>
                                setAssigningTechnician({
                                  ...assigningTechnician,
                                  [ticket._id]: e.target.value,
                                })
                              }
                              className="brutalist-input flex-grow py-1 text-xs"
                            >
                              <option value="">SELECT TECH...</option>
                              {technicians.map((tech) => (
                                <option key={tech._id} value={tech._id}>
                                  {tech.fullName}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignTech(ticket._id)}
                              disabled={!assigningTechnician[ticket._id]}
                              className="brutalist-button px-3 py-1 bg-brand-accent hover:bg-blue-700 text-white text-xs font-bold uppercase disabled:opacity-50"
                            >
                              Dispatch
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Operator Task Operations */}
                      <div className="flex flex-col gap-1.5 mt-2">
                        {/* If Admin OR assigned Technician, can progress state */}
                        {ticket.status !== "Resolved" && (user.role === "Admin" || isAssignedToMe) && (
                          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2">
                            {ticket.status === "Submitted" && user.role === "FieldTechnician" && (
                              <button
                                onClick={() => handleTransitionState(ticket._id, "Dispatched")}
                                className="brutalist-button flex-1 py-1 text-center bg-purple-100 text-purple-900 border-purple-800 text-xs font-bold uppercase"
                              >
                                Self Dispatch
                              </button>
                            )}

                            {ticket.status === "Dispatched" && (
                              <button
                                onClick={() => handleTransitionState(ticket._id, "Active")}
                                className="brutalist-button flex-1 py-1 text-center bg-indigo-100 text-indigo-900 border-indigo-800 text-xs font-bold uppercase"
                              >
                                Begin Repair
                              </button>
                            )}

                            {ticket.status === "Active" && (
                              <button
                                onClick={() => handleTransitionState(ticket._id, "Resolved")}
                                className="brutalist-button flex-1 py-1 text-center bg-green-100 text-green-900 border-green-800 text-xs font-bold uppercase"
                              >
                                Complete Request
                              </button>
                            )}

                            {user.role === "Admin" && (
                              <select
                                value={ticket.status}
                                onChange={(e) =>
                                  handleTransitionState(
                                    ticket._id,
                                    e.target.value as any
                                  )
                                }
                                className="brutalist-input w-full text-xs font-mono uppercase font-bold py-1 border-brand-dark bg-slate-50"
                              >
                                <option value="Submitted">SUBMITTED</option>
                                <option value="Dispatched">DISPATCHED</option>
                                <option value="Active">ACTIVE</option>
                                <option value="Resolved">RESOLVED</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit timeline expander bar */}
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedTicketId(isExpanded ? null : ticket._id)}
                      className="flex items-center gap-1 font-mono text-[10px] text-slate-500 font-bold hover:text-brand-dark transition-colors uppercase"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide Lifecycle Log
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Lifecycle Log ({ticket.audits.length})
                        </>
                      )}
                    </button>
                    
                    <span className="font-mono text-[9px] text-slate-400 uppercase">
                      LOCKED_HASH: {ticket._id.substring(0, 10)}
                    </span>
                  </div>

                  {/* Expandable Timeline ledger */}
                  {isExpanded && (
                    <div className="bg-slate-100 border-t border-slate-200 p-4 font-mono text-[11px] flex flex-col gap-2">
                      <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-300 pb-1 mb-1">
                        📋 STATE_MACHINE_LIFECYCLE_AUDIT
                      </div>
                      {ticket.audits.map((audit: any, index: number) => (
                        <div
                          key={audit._id}
                          className="flex items-start gap-2 border-l-2 border-brand-dark pl-3 py-1 relative ml-1.5"
                        >
                          <span className="absolute -left-1.5 top-2 w-2.5 h-2.5 bg-brand-dark border border-white"></span>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-brand-dark text-white px-1.5 text-[9px] font-bold">
                                STEP_{index + 1}
                              </span>
                              <span className="font-bold text-slate-800">
                                {audit.previousState ? audit.previousState.toUpperCase() : "NULL"} → {audit.newState.toUpperCase()}
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                By: {audit.actionedBy?.fullName || "SYSTEM"} ({audit.actionedBy?.role})
                              </span>
                            </div>
                            <div className="text-slate-400 text-[9px] mt-0.5">
                              {new Date(audit.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Brutalist Performance Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        ticketTitle={successTicketTitle}
        elapsedTimeMs={elapsedTimeMs}
      />
    </div>
  );
}
