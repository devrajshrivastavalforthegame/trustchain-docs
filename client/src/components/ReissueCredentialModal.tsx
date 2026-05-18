
import { useState } from "react";
import toast from "react-hot-toast";
import { UploadCard } from "./UploadCard";
import type { Credential } from "../types/domain";

interface Props {
  credential: Credential;
  onClose: () => void;
  onSubmit: (input: {
    documentId: string;
    studentName: string;
    enrollmentNumber: string;
    rollNumber: string;
    studentEmail: string;
    degreeTitle: string;
    course: string;
    department: string;
    graduationYear: string;
    documentHash: string;
    reason: string;
    file?: File;
  }) => Promise<void>;
}

export const ReissueCredentialModal = ({ credential, onClose, onSubmit }: Props) => {
  const [file, setFile] = useState<File | undefined>();
  const [hash, setHash] = useState("");
  const [reason, setReason] = useState("Corrected credential and reissued by issuer.");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file || !hash) { toast.error("Upload corrected document first."); return; }
    setBusy(true);
    try {
      await onSubmit({
        documentId: credential.id,
        studentName: credential.studentName,
        enrollmentNumber: credential.enrollmentNumber,
        rollNumber: credential.rollNumber,
        studentEmail: credential.studentEmail,
        degreeTitle: credential.degreeTitle,
        course: credential.course,
        department: credential.department,
        graduationYear: credential.graduationYear,
        documentHash: hash,
        reason,
        file,
      });
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-200">Edit / Reissue</p>
            <h2 className="mt-2 text-2xl font-black text-white">Reissue credential for {credential.studentName}</h2>
            <p className="mt-2 text-sm text-slate-400">The old hash stays immutable and becomes superseded. The corrected file gets a new hash, version, and transaction proof.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/10">Close</button>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <p><b>Current version:</b> {credential.version || 1}</p>
            <p><b>Enrollment:</b> {credential.enrollmentNumber}</p>
            <p><b>Old hash:</b> <span className="font-mono text-xs">{credential.documentHash}</span></p>
            <label className="mt-4 block font-semibold">Reason for reissue</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
          </div>
          <UploadCard title="Upload corrected document" subtitle="New SHA-256 will become the reissued version." onFileReady={(nextFile, nextHash) => { setFile(nextFile); setHash(nextHash); }} />
        </div>
        <button disabled={busy || !file} onClick={() => void submit()} className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white hover:bg-emerald-500 disabled:opacity-50">
          {busy ? "Reissuing..." : "Generate New Version & Reissue"}
        </button>
      </div>
    </div>
  );
};
