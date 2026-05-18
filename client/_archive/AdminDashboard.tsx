import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Database,
  FileCheck2,
  LogOut,
  ServerCog,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useVerification } from "../context/VerificationContext";

const trendData = [
  { day: "Mon", verifications: 18, uploads: 9 },
  { day: "Tue", verifications: 32, uploads: 14 },
  { day: "Wed", verifications: 26, uploads: 12 },
  { day: "Thu", verifications: 44, uploads: 18 },
  { day: "Fri", verifications: 58, uploads: 25 },
  { day: "Sat", verifications: 47, uploads: 19 },
  { day: "Sun", verifications: 63, uploads: 28 },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { credentials, requests, resetDemoState } = useVerification();

  const stats = useMemo(() => {
    const tamperAlerts = requests.filter(
      (request) => request.result?.outcome === "tampered",
    ).length;

    return [
      {
        label: "Total Uploads",
        value: credentials.length.toString(),
        icon: FileCheck2,
        text: "Issued credential records",
      },
      {
        label: "Tamper Alerts",
        value: tamperAlerts.toString(),
        icon: AlertTriangle,
        text: "Failed hash comparisons",
      },
      {
        label: "Active Issuers",
        value: "12",
        icon: Users,
        text: "University nodes online",
      },
      {
        label: "Verification Requests",
        value: requests.length.toString(),
        icon: Activity,
        text: "Consent-gated checks",
      },
    ];
  }, [credentials.length, requests]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <main className="dashboard-shell">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="hidden min-h-screen bg-slate-950 p-6 text-white lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-emerald-300">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">TrustChain Docs</p>
              <p className="text-xs text-slate-400">Developer Console</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {( [
              ["Network Analytics", Activity],
              ["Issuer Registry", Database],
              ["Security Events", ShieldCheck],
              ["System Settings", ServerCog],
            ] satisfies Array<[string, LucideIcon]> ).map(([label, Icon]) => (
              <a
                key={label}
                href="#admin"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <section id="admin" className="min-h-screen">
          <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Admin Dashboard
                </p>
                <h1 className="mt-2 font-serif text-4xl tracking-tight text-slate-950">
                  Trust network observability.
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={resetDemoState} className="trust-button-secondary">
                  Reset Demo State
                </button>
                <button type="button" onClick={handleLogout} className="trust-button-secondary">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-8 p-5 lg:p-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <motion.article
                  key={stat.label}
                  whileHover={{ y: -4 }}
                  className="trust-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-emerald-300">
                      <stat.icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Live
                    </span>
                  </div>
                  <p className="mt-5 text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{stat.text}</p>
                </motion.article>
              ))}
            </div>

            <section className="trust-card p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Verification Trends
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-slate-950">
                    Weekly trust activity
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  Recharts AreaChart
                </span>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="verifications" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.10)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="verifications"
                      stroke="#0f766e"
                      strokeWidth={3}
                      fill="url(#verifications)"
                    />
                    <Area
                      type="monotone"
                      dataKey="uploads"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={0.08}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="trust-card p-6">
                <h2 className="font-serif text-3xl text-slate-950">Security posture</h2>
                <div className="mt-5 space-y-3">
                  {["SHA-256 hashing active", "Consent queue operational", "Issuer keys healthy"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                      <ShieldCheck className="h-4 w-4" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="trust-card p-6">
                <h2 className="font-serif text-3xl text-slate-950">Recent events</h2>
                <div className="mt-5 space-y-3">
                  {requests.slice(0, 4).map((request) => (
                    <div key={request.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {request.requesterOrganization} requested {request.source} verification
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(request.createdAt).toLocaleString()} • {request.status}
                      </p>
                    </div>
                  ))}
                  {requests.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No employer verification events have been created yet.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
