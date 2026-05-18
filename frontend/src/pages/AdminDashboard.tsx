import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

type PendingUser = { id: number | string; name: string; email: string; role: string; status: string; createdAt?: string; created_at?: string };

export default function AdminDashboard() {
  const { user, hasAnyPermission } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canApproveUsers = useMemo(() => hasAnyPermission('users:approve', 'admin:manage_users', 'admin:*'), [hasAnyPermission]);

  async function loadPendingUsers() {
    try { setLoading(true); setError(null); const r = await api.get('/admin/users/pending'); setPendingUsers(r.data?.pendingUsers || []); }
    catch (e: any) { setError(e.response?.data?.message || 'Failed to load pending sign-ups.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadPendingUsers(); }, []);

  async function approveUser(userId: number | string) {
    try { setActionLoadingId(userId); setError(null); setSuccessMessage(null); await api.patch(`/admin/users/${userId}/approve`); setSuccessMessage('User approved successfully.'); setPendingUsers(users => users.filter(u => String(u.id) !== String(userId))); }
    catch (e: any) { setError(e.response?.data?.message || 'Failed to approve user.'); }
    finally { setActionLoadingId(null); }
  }

  async function rejectUser(userId: number | string) {
    const reason = window.prompt('Reason for rejection:', 'Rejected by administrator');
    if (reason === null) return;
    try { setActionLoadingId(userId); setError(null); setSuccessMessage(null); await api.patch(`/admin/users/${userId}/reject`, { reason }); setSuccessMessage('User rejected successfully.'); setPendingUsers(users => users.filter(u => String(u.id) !== String(userId))); }
    catch (e: any) { setError(e.response?.data?.message || 'Failed to reject user.'); }
    finally { setActionLoadingId(null); }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-sm text-teal-200"><ShieldCheck className="h-4 w-4" />Dynamic RBAC Admin Control</div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Pending Sign-ups</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Issuers, employers, and sensitive roles stay pending until an authorized admin approves them. Approved users receive dynamic permissions from the database instead of hardcoded frontend roles.</p>
            </div>
            <button onClick={loadPendingUsers} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-teal-400/40 hover:bg-teal-400/10 hover:text-teal-100"><RefreshCw className="h-4 w-4" />Refresh</button>
          </div>
        </section>

        {user && !canApproveUsers && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Your account is authenticated as <strong>{user.role}</strong>, but it does not currently have the dynamic permission required to approve users.</div>}
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
        {successMessage && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{successMessage}</div>}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-4"><div className="flex items-center gap-2 text-slate-200"><Clock3 className="h-5 w-5 text-teal-300" /><h2 className="text-lg font-semibold">Accounts Awaiting Approval</h2><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{pendingUsers.length}</span></div></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Requested Role</th><th className="px-6 py-4">Submitted</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {loading ? <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Loading pending users...</td></tr> : pendingUsers.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No pending sign-ups right now.</td></tr> : pendingUsers.map(p => {
                  const busy = actionLoadingId === p.id; const createdAt = p.createdAt || p.created_at;
                  return <tr key={p.id} className="transition hover:bg-white/[0.03]"><td className="px-6 py-4"><div className="font-medium text-white">{p.name}</div><div className="text-xs text-slate-500">ID: {p.id}</div></td><td className="px-6 py-4 text-sm text-slate-300">{p.email}</td><td className="px-6 py-4"><span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase text-teal-200">{p.role}</span></td><td className="px-6 py-4 text-sm text-slate-400">{createdAt ? new Date(createdAt).toLocaleString() : '—'}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button disabled={!canApproveUsers || busy} onClick={() => approveUser(p.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Approve</button><button disabled={!canApproveUsers || busy} onClick={() => rejectUser(p.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"><XCircle className="h-4 w-4" />Reject</button></div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
