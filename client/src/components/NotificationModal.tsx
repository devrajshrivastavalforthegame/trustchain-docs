import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ShieldQuestion } from "lucide-react";
import type { VerificationRequest } from "../types/domain";
import { formatDateTime } from "../utils/format";

interface NotificationModalProps {
  request?: VerificationRequest;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const NotificationModal = ({ request, onApprove, onReject, onClose, loading }: NotificationModalProps) => (
  <AnimatePresence>
    {request && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-lg">
        <motion.div initial={{ scale: 0.92, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 28 }} className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/60">
          <div className="bg-radial-blue p-7">
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-blue-500/20 p-4 text-blue-100">
                <BellRing className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-blue-100/80">Live consent request</p>
                <h2 className="mt-1 font-serif text-3xl font-bold text-white">Employer wants access</h2>
              </div>
            </div>
          </div>
          <div className="p-7">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex gap-3">
                <ShieldQuestion className="mt-1 h-6 w-6 text-amber-200" />
                <div>
                  <p className="text-lg font-bold text-white">{request.company} is trying to verify your degree.</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Requested by {request.requesterName} · {formatDateTime(request.createdAt)}
                  </p>
                  <p className="mt-3 break-all rounded-2xl bg-slate-900 p-3 font-mono text-xs text-slate-300">
                    {request.enrollmentNumber || request.documentHash || "Credential verification request"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button disabled={loading} onClick={onReject} className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 font-bold text-red-100 hover:bg-red-500/20 disabled:opacity-50">
                Reject
              </button>
              <button onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-slate-300 hover:bg-white/10">
                Later
              </button>
              <button disabled={loading} onClick={onApprove} className="rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50">
                Approve
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
