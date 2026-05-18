
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Award, CheckCircle2, FileCheck2, MailCheck, PlugZap, UploadCloud } from "lucide-react";
import { UploadCard } from "../components/UploadCard";
import { StatsCard } from "../components/StatsCard";
import { BlockchainPanel } from "../components/BlockchainPanel";
import { QRCard } from "../components/QRCard";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ReissueCredentialModal } from "../components/ReissueCredentialModal";
import { useBlockchainWallet } from "../hooks/useBlockchainWallet";
import { useTrustChain } from "../context/TrustChainContext";
import { compactHash, formatDateTime } from "../utils/format";
import type { Credential } from "../types/domain";

interface FormState {
  studentName: string;
  enrollmentNumber: string;
  rollNumber: string;
  studentEmail: string;
  degreeTitle: string;
  course: string;
  department: string;
  graduationYear: string;
}

const initialForm: FormState = {
  studentName: "Alex Jain",
  enrollmentNumber: "NIDL-2021-CS-1042",
  rollNumber: "21CS1042",
  studentEmail: "alex.jain@student.edu",
  degreeTitle: "Bachelor of Technology",
  course: "Computer Science and Engineering",
  department: "Computer Science",
  graduationYear: "2026"
};

export const IssuerDashboard = () => {
  const { credentials, issueCredential, reissueCredential, loading, error } = useTrustChain();
  const { wallet, connect } = useBlockchainWallet();
  const [form, setForm] = useState<FormState>(initialForm);
  const [file, setFile] = useState<File | undefined>();
  const [hash, setHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<Credential | null>(null);
  const [reissuing, setReissuing] = useState<Credential | null>(null);

  const complete = useMemo(() => Object.values(form).every(Boolean) && hash, [form, hash]);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) {
      toast.error("Upload a degree and complete all metadata fields.");
      return;
    }
    setSubmitting(true);
    try {
      const credential = await issueCredential({ ...form, documentHash: hash, file });
      setIssued(credential);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to issue credential.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Issuer Dashboard</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-white">Degree issuance command center</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Upload degree PDFs, encrypt them, hash locally, anchor proof, and reissue corrected versions without overwriting history.</p>
        </div>
        <button onClick={() => void connect()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white hover:bg-white/10">
          <PlugZap className="h-5 w-5 text-emerald-200" /> {wallet.connected ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} · ${wallet.network}` : wallet.connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-amber-100">{error}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        <StatsCard icon={Award} label="Documents Uploaded" value={credentials.length} detail="Synced from backend" tone="blue" />
        <StatsCard icon={CheckCircle2} label="Blockchain Confirmed" value={credentials.filter((c) => c.txHash).length} detail="Credential tx hashes" tone="emerald" />
        <StatsCard icon={MailCheck} label="Secure Storage" value="AES + GCS" detail="Encrypted at rest" tone="violet" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[.92fr_1.08fr]">
        <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-200"><UploadCloud className="h-6 w-6" /></div>
            <div><h2 className="text-xl font-black text-white">Upload Degree</h2><p className="text-sm text-slate-400">Required issuer fields + local SHA-256 hash + backend encrypted storage</p></div>
          </div>
          <UploadCard onFileReady={(nextFile, nextHash) => { setFile(nextFile); setHash(nextHash); }} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(Object.keys(form) as Array<keyof FormState>).map((key) => (
              <label key={key} className="text-sm font-semibold text-slate-300">
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                <input value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-blue-400/20" />
              </label>
            ))}
          </div>
          <button disabled={!complete || submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-glow hover:bg-blue-500 disabled:opacity-50">
            {submitting ? <LoadingSpinner label="Issuing credential" /> : <><FileCheck2 className="h-5 w-5" /> Anchor Degree on Blockchain</>}
          </button>
        </form>

        <div className="space-y-5">
          {issued ? (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-6 shadow-emerald">
              <div className="flex items-start gap-4">
                <div className="rounded-3xl bg-emerald-400/15 p-4 text-emerald-200"><CheckCircle2 className="h-8 w-8" /></div>
                <div><p className="text-sm uppercase tracking-[0.25em] text-emerald-100">Upload successful</p><h2 className="mt-2 text-3xl font-black text-white">Degree issued and QR generated</h2><p className="mt-2 text-slate-300">Backend response mapped into encrypted storage + blockchain proof UI.</p></div>
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
                <BlockchainPanel txHash={issued.txHash} blockNumber={issued.blockNumber} gasUsed={issued.gasUsed} network={issued.network} timestamp={issued.createdAt} />
                <QRCard value={issued.qrUrl || `${window.location.origin}/verify/${issued.id}`} />
              </div>
            </motion.div>
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">Upload and issue a degree to see blockchain success animation, QR proof and transaction receipt here.</div>
          )}

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Recent Uploads</h2><p className="text-sm text-slate-400">Student Name · Enrollment No · Hash · Version · Status · Timestamp</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.2em] text-slate-500"><tr><th className="p-4">Student</th><th className="p-4">Enrollment</th><th className="p-4">Hash</th><th className="p-4">Version</th><th className="p-4">Status</th><th className="p-4">Timestamp</th><th className="p-4">Action</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={7} className="p-5"><LoadingSpinner label="Loading uploads" /></td></tr>}
                  {credentials.map((credential) => (
                    <tr key={credential.id} className="border-t border-white/10">
                      <td className="p-4 font-semibold text-white">{credential.studentName}</td>
                      <td className="p-4 text-slate-300">{credential.enrollmentNumber}</td>
                      <td className="p-4 font-mono text-xs text-slate-400">{compactHash(credential.documentHash)}</td>
                      <td className="p-4 text-slate-300">v{credential.version || 1}</td>
                      <td className="p-4"><StatusBadge status={credential.status} /></td>
                      <td className="p-4 text-slate-400">{formatDateTime(credential.createdAt)}</td>
                      <td className="p-4"><button onClick={() => setReissuing(credential)} className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-500/20">Edit / Reissue</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {reissuing && (
        <ReissueCredentialModal
          credential={reissuing}
          onClose={() => setReissuing(null)}
          onSubmit={async (input) => { const next = await reissueCredential(input); setIssued(next); }}
        />
      )}
    </div>
  );
};
