import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Blocks, FileStack, ServerCog, ShieldCheck } from "lucide-react";
import { adminService } from "../services/adminService";
import type { DashboardStats, TrendPoint } from "../types/domain";
import { StatsCard } from "../components/StatsCard";
import { GlassCard } from "../components/GlassCard";
import { useTrustChain } from "../context/TrustChainContext";
import { compactHash, formatDateTime } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";

const emptyStats: DashboardStats = {
  documentsUploaded: 0,
  verificationRequests: 0,
  tamperedDocuments: 0,
  blockchainTransactions: 0,
  activeIssuers: 0,
  successRate: 0
};

export const DeveloperDashboard = () => {
  const { credentials, requests } = useTrustChain();
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [trends, setTrends] = useState<TrendPoint[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await adminService.getDashboard();
        setStats(result.stats);
        setTrends(result.trends.length ? result.trends : [
          { name: "Mon", uploads: 4, verifications: 8, tampered: 0 },
          { name: "Tue", uploads: 8, verifications: 14, tampered: 1 },
          { name: "Wed", uploads: 12, verifications: 22, tampered: 0 },
          { name: "Thu", uploads: 18, verifications: 36, tampered: 2 },
          { name: "Fri", uploads: 24, verifications: 52, tampered: 1 }
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load developer dashboard.");
      }
    };
    void run();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Developer Ops</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-white">Network observability dashboard</h1>
        <p className="mt-2 text-slate-400">API activity, blockchain logs, tamper alerts and verification throughput for the hackathon demo room.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <StatsCard icon={FileStack} label="Documents Uploaded" value={stats.documentsUploaded || credentials.length} detail="Issuer upload API" tone="blue" />
        <StatsCard icon={Activity} label="Verification Requests" value={stats.verificationRequests || requests.length} detail="Consent workflow" tone="violet" />
        <StatsCard icon={AlertTriangle} label="Tampered Documents" value={stats.tamperedDocuments} detail="Risk engine alerts" tone="red" />
        <StatsCard icon={Blocks} label="Blockchain Transactions" value={stats.blockchainTransactions} detail="Smart contract receipts" tone="emerald" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.2fr_.8fr]">
        <GlassCard hover={false} className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div><h2 className="text-2xl font-black text-white">Verification Trends</h2><p className="text-sm text-slate-400">Uploads vs verifications vs tamper attempts</p></div>
            <StatusBadge status="blockchain confirmed" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="uploads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.65}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                  <linearGradient id="verifications" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.55}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.12)", borderRadius: "18px", color: "#fff" }} />
                <Area type="monotone" dataKey="uploads" stroke="#2563eb" fillOpacity={1} fill="url(#uploads)" />
                <Area type="monotone" dataKey="verifications" stroke="#22c55e" fillOpacity={1} fill="url(#verifications)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-blue-500/15 p-3 text-blue-200"><ServerCog className="h-6 w-6" /></div><div><h2 className="text-2xl font-black text-white">Blockchain Logs</h2><p className="text-sm text-slate-400">Latest credential tx hashes</p></div></div>
          <div className="grid gap-3">
            {credentials.slice(0, 6).map((credential) => (
              <div key={credential.id} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-bold text-white">{credential.studentName}</p><StatusBadge status={credential.status} /></div>
                <p className="mt-2 break-all font-mono text-xs text-slate-400">{compactHash(credential.txHash, 18, 12)}</p>
                <p className="mt-2 text-xs text-slate-500">Block {credential.blockNumber || "pending"} · {formatDateTime(credential.createdAt)}</p>
              </div>
            ))}
            {credentials.length === 0 && <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5 text-slate-400">No blockchain logs available yet.</div>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
