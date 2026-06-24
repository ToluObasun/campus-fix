import { getSessionUser } from "./actions/main";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex flex-col justify-center items-center p-4 bg-brand-bg md:p-8 min-h-screen">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch my-8">
        
        {/* Left Side: CampusFix Brutalist Hero Banner */}
        <div className="md:col-span-5 brutalist-card bg-brand-dark text-white p-6 md:p-8 flex flex-col justify-between select-none">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-brand-accent font-bold mb-4">
              [ INFRASTRUCTURE CORE ]
            </div>
            <h1 className="font-mono text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-none mb-4">
              CAMPUS<br/>FIX
            </h1>
            <p className="font-sans text-sm text-slate-300 leading-relaxed max-w-xs">
              Deterministic infrastructure maintenance portal for request dispatch, service task allocation, and state machine lifecycle audits.
            </p>
          </div>
          
          <div className="font-mono text-xs text-slate-400 mt-8 border-t border-slate-700 pt-4 flex flex-col gap-1">
            <div>DATABASE_STATUS: CONNECTED</div>
            <div>DISPATCH_ROUTINE: ACTIVE</div>
            <div>RELEASE_TAG: PROD-1.0.2</div>
          </div>
        </div>

        {/* Right Side: Interactive Authentication Form */}
        <div className="md:col-span-7 brutalist-card bg-white p-6 md:p-8 flex flex-col justify-center">
          <AuthForm />
        </div>

      </div>
    </main>
  );
}
