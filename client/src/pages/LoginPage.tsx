import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Code2, GraduationCap, LockKeyhole, ShieldCheck, UserRoundCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/domain";
import { LoadingSpinner } from "../components/LoadingSpinner";

const roles: Array<{ role: UserRole; label: string; icon: typeof GraduationCap; email: string; password: string }> = [
  { role: "student", label: "Student", icon: GraduationCap, email: "alex.jain@student.edu", password: "student123" },
  { role: "employer", label: "Employer", icon: UserRoundCheck, email: "verify@acme.com", password: "employer123" },
  { role: "issuer", label: "Issuer", icon: Building2, email: "registrar@university.edu", password: "issuer123" },
  { role: "developer", label: "Developer", icon: Code2, email: "admin@trustchain.edu", password: "admin123" }
];

const landingFor = (role: UserRole) => (role === "issuer" ? "/issuer" : role === "student" ? "/student" : role === "employer" ? "/employer" : role === "admin" ? "/admin" : "/developer");

export const LoginPage = () => {
  const [activeRole, setActiveRole] = useState<UserRole>("student");
  const active = roles.find((item) => item.role === activeRole) ?? roles[0];
  const [email, setEmail] = useState(active.email);
  const [password, setPassword] = useState(active.password);
  const { login, loading, apiMode } = useAuth();
  const navigate = useNavigate();

  const chooseRole = (role: UserRole) => {
    const next = roles.find((item) => item.role === role) ?? roles[0];
    setActiveRole(role);
    setEmail(next.email);
    setPassword(next.password);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login({ email, password, role: activeRole });
      navigate(landingFor(activeRole));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-grid-dark bg-[size:34px_34px] p-12 lg:block">
        <div className="absolute inset-0 bg-radial-blue" />
        <div className="relative flex h-full flex-col justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-3 shadow-glow"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="font-serif text-2xl font-bold">TrustChain Docs</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live API Auth</p>
            </div>
          </Link>
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-100">Institutional Identity Layer</p>
            <h1 className="mt-5 font-serif text-6xl font-bold leading-tight">Secure login for every verification stakeholder.</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">JWT authentication, role protected routing, backend API integration and an offline fallback only when explicitly enabled.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["JWT", "Consent", "Blockchain"].map((item) => <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-center font-bold">{item}</div>)}
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center p-5">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-blue-200">Sign in</p>
              <h2 className="mt-2 font-serif text-4xl font-bold text-white">Access portal</h2>
            </div>
            <div className={`rounded-full border px-3 py-1.5 text-xs font-bold ${apiMode.online ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200" : "border-amber-300/30 bg-amber-500/10 text-amber-100"}`}>
              {apiMode.online ? "Live API" : apiMode.fallback ? "Fallback" : "Backend Offline"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roles.map((item) => (
              <button key={item.role} type="button" onClick={() => chooseRole(item.role)} className={`rounded-2xl border p-3 text-sm font-bold transition ${activeRole === item.role ? "border-blue-300/40 bg-blue-500/20 text-white shadow-glow" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/10"}`}>
                <item.icon className="mx-auto mb-2 h-5 w-5" /> {item.label}
              </button>
            ))}
          </div>

          <label className="mt-6 block text-sm font-semibold text-slate-300">Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400/30 focus:ring-4" />
          <label className="mt-4 block text-sm font-semibold text-slate-300">Password</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400/30 focus:ring-4" />

          <button disabled={loading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-glow hover:bg-blue-500 disabled:opacity-60">
            {loading ? <LoadingSpinner label="Authenticating" /> : <><LockKeyhole className="h-5 w-5" /> Login with JWT</>}
          </button>
          <p className="mt-5 text-center text-sm text-slate-400">New user? <Link to="/register" className="font-bold text-blue-200 hover:text-blue-100">Create account</Link></p>
        </motion.form>
      </section>
    </div>
  );
};
