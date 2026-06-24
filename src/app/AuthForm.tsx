"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authenticateUser, registerUser } from "./actions/main";
import { Shield, Hammer, User as UserIcon } from "lucide-react";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "FieldTechnician" | "Requestor">("Requestor");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      if (isLogin) {
        const result = await authenticateUser(formData);
        if (result.success) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(result.error || "Authentication failed");
        }
      } else {
        formData.append("fullName", fullName);
        formData.append("role", role);
        const result = await registerUser(formData);
        if (result.success) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(result.error || "Registration failed");
        }
      }
    });
  };

  return (
    <div>
      {/* Brutalist Tab Selector */}
      <div className="flex border-2 border-brand-dark mb-6">
        <button
          type="button"
          onClick={() => {
            setIsLogin(true);
            setError(null);
          }}
          className={`flex-1 py-2.5 font-mono text-sm uppercase tracking-wider transition-colors border-r-2 border-brand-dark font-bold ${
            isLogin ? "bg-brand-dark text-white" : "bg-white text-brand-dark hover:bg-slate-100"
          }`}
        >
          LOG IN
        </button>
        <button
          type="button"
          onClick={() => {
            setIsLogin(false);
            setError(null);
          }}
          className={`flex-1 py-2.5 font-mono text-sm uppercase tracking-wider transition-colors font-bold ${
            !isLogin ? "bg-brand-dark text-white" : "bg-white text-brand-dark hover:bg-slate-100"
          }`}
        >
          REGISTER
        </button>
      </div>

      <h2 className="font-mono text-lg font-extrabold uppercase tracking-wide mb-4">
        {isLogin ? "AUTHENTICATE CREDENTIALS" : "REGISTER SYSTEM ACCESS"}
      </h2>

      {error && (
        <div className="border-2 border-brand-dark bg-red-100 p-3 mb-4 font-mono text-xs text-red-700 font-bold uppercase tracking-wide shadow-brutalist-sm">
          ⚠️ ERROR: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wide text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="brutalist-input w-full"
              placeholder="e.g. Timeyin Egbe"
              required={!isLogin}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs font-bold uppercase tracking-wide text-slate-700">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="brutalist-input w-full"
            placeholder="operator@campus.edu"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs font-bold uppercase tracking-wide text-slate-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="brutalist-input w-full"
            placeholder="••••••••"
            required
          />
        </div>

        {!isLogin && (
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs font-bold uppercase tracking-wide text-slate-700">
              System Authorization Role
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("Requestor")}
                className={`border-2 border-brand-dark p-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 uppercase transition-all shadow-brutalist-sm hover:bg-slate-100 ${
                  role === "Requestor"
                    ? "bg-slate-200"
                    : "bg-white"
                }`}
              >
                <UserIcon className="w-4 h-4 text-brand-dark" />
                <span>Requestor</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole("FieldTechnician")}
                className={`border-2 border-brand-dark p-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 uppercase transition-all shadow-brutalist-sm hover:bg-slate-100 ${
                  role === "FieldTechnician"
                    ? "bg-slate-200"
                    : "bg-white"
                }`}
              >
                <Hammer className="w-4 h-4 text-brand-dark" />
                <span>Technician</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("Admin")}
                className={`border-2 border-brand-dark p-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 uppercase transition-all shadow-brutalist-sm hover:bg-slate-100 ${
                  role === "Admin"
                    ? "bg-slate-200"
                    : "bg-white"
                }`}
              >
                <Shield className="w-4 h-4 text-brand-dark" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="brutalist-button w-full py-3 bg-brand-dark text-white font-bold uppercase tracking-wide mt-4 flex items-center justify-center gap-2 hover:bg-brand-dark/95 disabled:opacity-50"
        >
          {isPending ? (
            <span className="font-mono text-xs animate-pulse">PROCESSING_RECORDS...</span>
          ) : isLogin ? (
            "ESTABLISH_SESSION"
          ) : (
            "COMMIT_REGISTRATION"
          )}
        </button>
      </form>
    </div>
  );
}
