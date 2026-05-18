import { NavLink } from "react-router-dom";
import { Bell, Building2, Code2, FileSearch, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/domain";

const links: Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }> = [
  { to: "/issuer", label: "Issuer Console", icon: Building2, roles: ["issuer", "developer"] },
  { to: "/student", label: "Student Vault", icon: GraduationCap, roles: ["student", "developer"] },
  { to: "/employer", label: "Employer Verify", icon: FileSearch, roles: ["employer", "developer"] },
  { to: "/notifications", label: "Consent Center", icon: Bell, roles: ["student", "developer"] },
  { to: "/developer", label: "Developer Ops", icon: Code2, roles: ["developer"] },
  { to: "/admin", label: "Admin Approval", icon: UserRoundCheck, roles: ["developer", "admin"] }
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const visibleLinks = links.filter((link) => user && link.roles.includes(user.role));
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-slate-950/95 p-5 text-white lg:block">
      <NavLink to="/" className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-3 shadow-glow">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="font-serif text-xl font-bold">TrustChain</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live Portal</p>
        </div>
      </NavLink>

      <nav className="mt-8 grid gap-2">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive ? "bg-blue-600 text-white shadow-glow" : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-200">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
};
