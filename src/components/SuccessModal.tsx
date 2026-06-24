"use client";

import React from "react";
import { X, Check } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketTitle: string;
  elapsedTimeMs: number;
}

export default function SuccessModal({ isOpen, onClose, ticketTitle, elapsedTimeMs }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 backdrop-blur-xs p-4">
      <div className="brutalist-card w-full max-w-md bg-white p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 border-2 border-brand-dark hover:bg-red-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-brand-dark" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {/* Brutalist bounce animated checkmark container */}
          <div className="w-16 h-16 rounded-none bg-green-200 border-4 border-brand-dark flex items-center justify-center mb-4 relative animate-bounce">
            <Check className="w-10 h-10 text-brand-dark stroke-[3px]" />
          </div>

          <h3 className="font-mono text-xl font-bold tracking-tight uppercase mb-2">
            Ticket Submitted
          </h3>
          <p className="font-sans text-sm text-gray-600 mb-6 max-w-xs">
            &quot;{ticketTitle}&quot; has been recorded in the campus maintenance system.
          </p>

          {/* Performance Analytics Block */}
          <div className="w-full bg-brand-bg border-2 border-brand-dark p-3 text-left font-mono text-xs">
            <div className="font-bold border-b border-brand-dark pb-1 mb-2 uppercase tracking-wide">
              ⚡ System Audit Analytics
            </div>
            <div className="flex justify-between py-0.5">
              <span>Status:</span>
              <span className="text-green-700 font-bold">SUCCESS (201)</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>State Audit Logged:</span>
              <span>TRUE</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Network Action Execution:</span>
              <span>{Math.round(elapsedTimeMs)} ms</span>
            </div>
            <div className="flex justify-between py-0.5 font-bold border-t border-brand-dark mt-2 pt-1">
              <span>Total Response Time:</span>
              <span>{(elapsedTimeMs / 1000).toFixed(3)}s</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="brutalist-button w-full py-2.5 mt-6 font-mono text-sm uppercase tracking-wider bg-brand-dark text-white hover:bg-brand-dark/95"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
