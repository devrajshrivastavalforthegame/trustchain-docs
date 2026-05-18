import { Link, NavLink } from "react-router-dom";
import { Activity, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navbar = () => {
  const { user, apiMode } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3 text-white">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-2 shadow-glow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold">TrustChain Docs</p>
            <p className="hidden text-xs text-slate-500 sm:block">Academic Verification Network</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          <NavLink to="/employer" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">Verify Degree</NavLink>
          <NavLink to="/issuer" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">Issuer Portal</NavLink>
          <NavLink to="/developer" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">Ops</NavLink>
          <NavLink to="/admin" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">Admin</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold sm:flex ${apiMode.online ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200" : "border-amber-300/25 bg-amber-500/10 text-amber-100"}`}>
            <Activity className="h-3.5 w-3.5" /> {apiMode.online ? "Live API" : apiMode.fallback ? "Fallback API" : "Backend Offline"}
          </div>
          {user ? (
            <Link to={user.role === "issuer" ? "/issuer" : user.role === "student" ? "/student" : user.role === "employer" ? "/employer" : user.role === "admin" ? "/admin" : "/developer"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-blue-50">Dashboard</Link>
          ) : (
            <Link to="/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">Sign In</Link>
          )}
          <button className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
