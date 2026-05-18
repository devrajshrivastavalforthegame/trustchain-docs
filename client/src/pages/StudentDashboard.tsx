import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Clock3, FileBadge2, Fingerprint, ShieldCheck } from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { QRCard } from "../components/QRCard";
import { StatusBadge } from "../components/StatusBadge";
import { NotificationModal } from "../components/NotificationModal";
import { BlockchainPanel } from "../components/BlockchainPanel";
import { useTrustChain } from "../context/TrustChainContext";
import { useAuth } from "../context/AuthContext";
import { compactHash, formatDateTime } from "../utils/format";

export const StudentDashboard = () => {
  const { user } = useAuth();
  const { credentials, requests, resolveRequest, loading, error } = useTrustChain();
  const [processingId, setProcessingId] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const pending = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const activePopup = !dismissed ? pending[0] : undefined;

  const resolve = async (id: string, approved: boolean) => {
    setProcessingId(id);
    try {
      await resolveRequest(id, approved);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to resolve request.");
    } finally {
      setProcessingId("");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Student Vault</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-white">Welcome, {user?.name}</h1>
        <p className="mt-2 text-slate-400">Your verified academic credentials, QR proofs, verification history and employer approval queue.</p>
      </div>

      {error && <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-amber-100">{error}</div>}

      <div className="grid gap-5 md:grid-cols-4">
        <StatsCard icon={FileBadge2} label="Documents Issued" value={credentials.length} detail="Backend credential records" tone="blue" />
        <StatsCard icon={BellRing} label="Verification Requests" value={pending.length} detail="Need your approval" tone={pending.length ? "red" : "violet"} />
        <StatsCard icon={ShieldCheck} label="Blockchain Verified" value={credentials.filter((c) => c.txHash).length} detail="Confirmed proofs" tone="emerald" />
        <StatsCard icon={Clock3} label="Last Accessed" value="Live" detail="Polling enabled" tone="violet" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_.9fr]">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-white">My Credentials</h2>
            {loading && <span className="text-sm text-slate-400">Syncing...</span>}
          </div>
          {credentials.length === 0 && <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-400">No degree has been issued to this student email yet.</div>}
          {credentials.map((credential) => (
            <div key={credential.id} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status="blockchain confirmed" />
                    <StatusBadge status={credential.status} />
                  </div>
                  <h3 className="mt-5 font-serif text-3xl font-bold text-white">{credential.degreeTitle}</h3>
                  <p className="mt-2 text-lg font-semibold text-slate-200">{credential.course}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Info label="Name" value={credential.studentName} />
                    <Info label="Graduation Year" value={credential.graduationYear} />
                    <Info label="Department" value={credential.department} />
                    <Info label="Enrollment No" value={credential.enrollmentNumber} />
                    <Info label="Roll No" value={credential.rollNumber} />
                    <Info label="University" value={credential.university} />
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500"><Fingerprint className="h-4 w-4" /> Document Hash</div>
                    <p className="break-all font-mono text-xs text-slate-300">{compactHash(credential.documentHash, 32, 28)}</p>
                  </div>
                </div>
                <QRCard value={credential.qrUrl || `${window.location.origin}/verify/${credential.id}`} />
              </div>
              <div className="mt-5">
                <BlockchainPanel compact txHash={credential.txHash} blockNumber={credential.blockNumber} gasUsed={credential.gasUsed} network={credential.network} timestamp={credential.createdAt} />
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-2xl font-black text-white">Approval Requests</h2><p className="mt-1 text-sm text-slate-400">Employer consent queue</p></div>
            <div className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-bold text-blue-100">{pending.length} pending</div>
          </div>
          <div className="mt-5 grid gap-4">
            {requests.length === 0 && <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-slate-400">No verification requests yet.</div>}
            {requests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{request.company}</p>
                    <p className="mt-1 text-sm text-slate-400">{request.requesterName} · {request.requesterEmail}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(request.createdAt)}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-4 break-all rounded-2xl bg-slate-900 p-3 font-mono text-xs text-slate-300">{request.enrollmentNumber || request.documentHash || "Credential access request"}</p>
                {request.status === "pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => void resolve(request.id, false)} disabled={processingId === request.id} className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-2 font-bold text-red-100 hover:bg-red-500/20">Reject</button>
                    <button onClick={() => void resolve(request.id, true)} disabled={processingId === request.id} className="rounded-2xl bg-emerald-500 px-4 py-2 font-bold text-white hover:bg-emerald-400">Approve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <NotificationModal
        request={activePopup}
        loading={Boolean(processingId)}
        onApprove={() => activePopup && void resolve(activePopup.id, true)}
        onReject={() => activePopup && void resolve(activePopup.id, false)}
        onClose={() => setDismissed(true)}
      />
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-2 font-semibold text-white">{value}</p>
  </div>
);
