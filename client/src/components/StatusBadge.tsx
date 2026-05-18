import { CheckCircle2, Clock3, ShieldAlert, XCircle } from "lucide-react";
import type { CredentialStatus, VerificationStatus } from "../types/domain";

type Status = CredentialStatus | VerificationStatus | "blockchain confirmed";

const styleForStatus = (status: Status) => {
  const normalized = status.toLowerCase();
  if (["verified", "approved", "issued", "blockchain confirmed"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (["tampered", "revoked", "rejected"].includes(normalized)) {
    return "border-red-400/30 bg-red-500/10 text-red-200";
  }
  return "border-amber-300/30 bg-amber-300/10 text-amber-100";
};

const Icon = ({ status }: { status: Status }) => {
  const normalized = status.toLowerCase();
  if (["verified", "approved", "issued", "blockchain confirmed"].includes(normalized)) return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (["tampered", "revoked"].includes(normalized)) return <ShieldAlert className="h-3.5 w-3.5" />;
  if (normalized === "rejected") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock3 className="h-3.5 w-3.5" />;
};

export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styleForStatus(status)}`}>
    <Icon status={status} />
    {status}
  </span>
);
