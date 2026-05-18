import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/domain";
import { LoadingSpinner } from "../components/LoadingSpinner";

const roles: UserRole[] = ["student", "employer", "issuer", "developer"];
const landingFor = (role: UserRole) => (role === "issuer" ? "/issuer" : role === "student" ? "/student" : role === "employer" ? "/employer" : role === "admin" ? "/admin" : "/developer");

export const RegisterPage = () => {
  const [role, setRole] = useState<UserRole>("student");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await register({ name, organization, email, password, role });
      if (result.requiresApproval) {
        navigate("/login");
        return;
      }
      navigate(landingFor(role));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-dark bg-[size:34px_34px] p-5 text-white">
      <div className="absolute inset-0 bg-radial-blue" />
      <div className="relative mx-auto flex min-h-screen max-w-2xl items-center justify-center">
        <form onSubmit={submit} className="w-full rounded-[2rem] border border-white/10 bg-white/[0.055] p-7 shadow-2xl backdrop-blur-xl">
          <Link to="/" className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-3"><ShieldCheck className="h-6 w-6" /></div>
            <div><p className="font-serif text-2xl font-bold">TrustChain Docs</p><p className="text-xs text-slate-500">Create live backend identity</p></div>
          </Link>
          <h1 className="font-serif text-4xl font-bold">Register account</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roles.map((item) => (
              <button key={item} type="button" onClick={() => setRole(item)} className={`rounded-2xl border px-3 py-3 text-sm font-bold capitalize ${role === item ? "border-blue-300/40 bg-blue-500/20" : "border-white/10 bg-white/[0.03] text-slate-400"}`}>{item}</button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-400/20" />
            <input placeholder="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-400/20" />
            <input required placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-400/20" />
            <input required placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-400/20" />
          </div>
          <button disabled={loading} className="mt-6 flex w-full justify-center rounded-2xl bg-blue-600 px-4 py-4 font-black text-white hover:bg-blue-500 disabled:opacity-60">
            {loading ? <LoadingSpinner label="Creating account" /> : "Create account"}
          </button>
          <p className="mt-5 text-center text-sm text-slate-400">Already registered? <Link to="/login" className="font-bold text-blue-200">Login</Link></p>
        </form>
      </div>
    </div>
  );
};
