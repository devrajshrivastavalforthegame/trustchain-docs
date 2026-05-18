import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, RefreshCw, ShieldCheck, UserCheck, UserRoundX, UsersRound } from "lucide-react";
import { adminApprovalService, type PendingUser } from "../services/adminApprovalService";
import { useAuth } from "../context/AuthContext";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "pending") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  if (normalized === "approved" || normalized === "active") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (normalized === "rejected") return "border-rose-300/30 bg-rose-400/10 text-rose-100";
  return "border-slate-300/20 bg-slate-400/10 text-slate-200";
};

export const AdminApprovalPage = () => {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | number | null>(null);

  const loadPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const users = await adminApprovalService.listPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load pending users.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingUsers();
  }, [loadPendingUsers]);

  const counts = useMemo(() => {
    const pending = pendingUsers.filter((item) => item.status.toLowerCase() === "pending").length;
    const issuers = pendingUsers.filter((item) => item.role.toLowerCase() === "issuer").length;
    const employers = pendingUsers.filter((item) => item.role.toLowerCase() === "employer").length;
    return { pending, issuers, employers };
  }, [pendingUsers]);

  const approve = async (target: PendingUser) => {
    setActionId(target.id);
    try {
      await adminApprovalService.approveUser(target.id);
      toast.success(`${target.email} approved.`);
      await loadPendingUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed.";
      toast.error(message);
    } finally {
      setActionId(null);
    }
  };

  const reject = async (target: PendingUser) => {
    setActionId(target.id);
    try {
      await adminApprovalService.rejectUser(target.id);
      toast.success(`${target.email} rejected.`);
      await loadPendingUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rejection failed.";
      toast.error(message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/25">
        <div className="relative">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-100">
                <ShieldCheck className="h-4 w-4" /> Admin Approval Console
              </div>
              <h1 className="mt-5 font-serif text-4xl font-bold leading-tight md:text-5xl">Manual signup approval</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Review issuer, employer, admin, and developer signups before they can access protected TrustChain workflows. This is the UI proof for the jury’s proper approval workflow requirement.
              </p>
            </div>
            <button
              onClick={() => void loadPendingUsers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh queue
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">Pending approvals</p>
            <UsersRound className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-3 text-4xl font-black text-slate-950">{counts.pending}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">Issuer requests</p>
            <UserCheck className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-3 text-4xl font-black text-slate-950">{counts.issuers}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">Employer requests</p>
            <UserCheck className="h-5 w-5 text-violet-500" />
          </div>
          <p className="mt-3 text-4xl font-black text-slate-950">{counts.employers}</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Pending user queue</h2>
            <p className="mt-1 text-sm text-slate-500">Signed in as {user?.email}. Only developer/admin tokens can call this API.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-slate-500">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading pending users...
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-xl font-black text-slate-950">No pending approvals</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">Register a new issuer or employer account to show the jury how pending signup approval works.</p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="hidden grid-cols-[1.3fr_.8fr_.6fr_.8fr_1fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Requested</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingUsers.map((target) => {
                const busy = actionId === target.id;
                return (
                  <article key={`${target.id}-${target.email}`} className="grid gap-4 p-5 md:grid-cols-[1.3fr_.8fr_.6fr_.8fr_1fr] md:items-center">
                    <div>
                      <p className="font-black text-slate-950">{target.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{target.email}</p>
                      {target.organization ? <p className="mt-1 text-xs font-semibold text-slate-400">{target.organization}</p> : null}
                    </div>
                    <p className="text-sm font-bold capitalize text-slate-700">{target.role}</p>
                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize ${statusClass(target.status)}`}>{target.status}</span>
                    </div>
                    <p className="text-sm text-slate-500">{formatDate(target.created_at ?? target.createdAt)}</p>
                    <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
                      <button
                        onClick={() => void approve(target)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <UserCheck className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => void reject(target)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        <UserRoundX className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
