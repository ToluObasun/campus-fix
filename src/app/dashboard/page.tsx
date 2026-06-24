import { redirect } from "next/navigation";
import { getSessionUser, getTickets, getCategories, getFieldTechnicians } from "../actions/main";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  // Server-side database fetching
  const tickets = await getTickets();
  const categories = await getCategories();
  const technicians = await getFieldTechnicians();

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-brand-bg text-brand-dark">
      {/* Header Bar */}
      <header className="border-b-2 border-brand-dark bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xl font-extrabold uppercase tracking-tighter border-2 border-brand-dark px-2 bg-brand-dark text-white select-none">
              CAMPUS_FIX //
            </span>
            <span className="hidden md:inline font-mono text-xs uppercase tracking-widest bg-yellow-100 text-yellow-800 px-2 py-0.5 border border-yellow-300 font-bold">
              AUTH_ROLE: {user.role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-sans text-xs font-bold leading-none">{user.fullName}</div>
              <span className="font-mono text-[10px] text-slate-500 uppercase">{user.email}</span>
            </div>
            
            {/* Logout button handled in sub-component */}
            <form action="/api/auth/logout" method="POST" className="inline-block">
              {/* Fallback link or client handle, we can just supply log out in DashboardView */}
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardView 
          user={user} 
          tickets={tickets} 
          categories={categories} 
          technicians={technicians} 
        />
      </div>
    </main>
  );
}
