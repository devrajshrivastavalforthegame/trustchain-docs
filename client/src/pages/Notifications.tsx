import toast from "react-hot-toast";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTrustChain } from "../context/TrustChainContext";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../utils/format";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const Notifications = () => {
  const { requests, resolveRequest, loading } = useTrustChain();
  const [processing, setProcessing] = useState("");

  const resolve = async (id: string, approved: boolean) => {
    setProcessing(id);
    try {
      await resolveRequest(id, approved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setProcessing("");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Consent Center</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-white">Live approval requests</h1>
        <p className="mt-2 text-slate-400">Every employer verification attempt appears here before private student data is disclosed.</p>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-500/15 p-3 text-blue-200"><BellRing className="h-6 w-6" /></div><h2 className="text-2xl font-black text-white">Request Queue</h2></div>
          {loading && <LoadingSpinner label="Syncing" />}
        </div>
        <div className="grid gap-4">
          {requests.length === 0 && <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-8 text-center text-slate-400">No notifications yet.</div>}
          {requests.map((request) => (
            <div key={request.id} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-lg font-bold text-white">{request.company}</p>
                  <p className="mt-1 text-sm text-slate-400">{request.requesterName} wants to verify {request.enrollmentNumber || "a credential hash"}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(request.createdAt)}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              {request.status === "pending" && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button disabled={processing === request.id} onClick={() => void resolve(request.id, false)} className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 font-bold text-red-100 hover:bg-red-500/20 disabled:opacity-50">Reject</button>
                  <button disabled={processing === request.id} onClick={() => void resolve(request.id, true)} className="rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50">Approve</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
