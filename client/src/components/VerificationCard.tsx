import { motion } from "framer-motion";
import { AlertTriangle, BrainCircuit, CheckCircle2, Gauge, ListChecks, ShieldCheck } from "lucide-react";
import type { VerificationResult } from "../types/domain";
import { compactHash, formatDateTime, percent } from "../utils/format";
import { BlockchainPanel } from "./BlockchainPanel";

export const VerificationCard = ({ result }: { result: VerificationResult }) => {
  const verified = result.status === "verified" && result.authentic;
  const rejected = result.status === "rejected";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`overflow-hidden rounded-[2rem] border shadow-2xl ${
        verified
          ? "border-emerald-300/20 bg-emerald-500/10 shadow-emerald"
          : "border-red-300/20 bg-red-500/10 shadow-danger"
      }`}
    >
      <div className={`p-7 ${verified ? "bg-emerald-400/10" : "bg-red-500/10"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-3xl p-4 ${verified ? "bg-emerald-400/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
              {verified ? <CheckCircle2 className="h-10 w-10" /> : <AlertTriangle className="h-10 w-10" />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Verification result</p>
              <h2 className="mt-1 text-3xl font-black text-white">{verified ? "VERIFIED" : rejected ? "DISCLOSURE REJECTED" : "TAMPER DETECTED"}</h2>
            </div>
          </div>
          <div className={`rounded-3xl border px-5 py-3 ${verified ? "border-emerald-300/30 bg-emerald-400/10" : "border-red-300/30 bg-red-400/10"}`}>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Gauge className="h-4 w-4" /> AI Integrity Score
            </div>
            <p className="mt-1 text-3xl font-black text-white">{percent(result.aiIntegrityScore ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-100">
            <ShieldCheck className="h-5 w-5 text-blue-200" /> Credential Evidence
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Student</dt>
              <dd className="mt-1 font-semibold text-white">{result.studentName || "Not disclosed"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Course</dt>
              <dd className="mt-1 font-semibold text-white">{result.course || result.degreeTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">University</dt>
              <dd className="mt-1 font-semibold text-white">{result.university || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Document Hash</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-200">{compactHash(result.documentHash, 28, 20)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Timestamp</dt>
              <dd className="mt-1 font-semibold text-white">{formatDateTime(result.timestamp)}</dd>
            </div>
            {result.uploadedHash && result.uploadedHash !== result.documentHash && (
              <div>
                <dt className="text-slate-500">Uploaded File Hash</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-200">{compactHash(result.uploadedHash, 28, 20)}</dd>
              </div>
            )}
            {result.reason && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300">
                {result.reason}
              </div>
            )}
          </dl>
        </div>
        <div className="space-y-5">
          <BlockchainPanel txHash={result.txHash} blockNumber={result.blockNumber} gasUsed={result.gasUsed} timestamp={result.timestamp} />
          <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100">
              <BrainCircuit className="h-5 w-5 text-blue-200" /> AI Integrity Explanation
            </div>
            <div className="grid gap-3 text-sm text-slate-300">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verified ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-red-300/30 bg-red-400/10 text-red-200"}`}>
                  Risk: {(result.riskLevel || (verified ? "low" : "high")).toUpperCase()}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-200">
                  AI score is explanatory, hash match is final proof
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${result.aiServiceConnected ? "border-blue-300/30 bg-blue-400/10 text-blue-200" : "border-amber-300/30 bg-amber-400/10 text-amber-200"}`}>
                  {result.aiServiceConnected ? (result.llmUsed ? "Ollama LLM used" : "FastAPI rule engine") : "Backend fallback AI"}
                  {result.aiProvider ? ` · ${result.aiProvider}` : ""}
                  {result.aiModel ? ` · ${result.aiModel}` : ""}
                </span>
              </div>

              {result.aiSummary && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 leading-6 text-slate-200">
                  {result.aiSummary}
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-2">
                {Boolean(result.matchedFields?.length) && (
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/5 p-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Matched signals</p>
                    <p className="text-slate-300">{result.matchedFields?.join(", ")}</p>
                  </div>
                )}
                {Boolean(result.mismatchedFields?.length) && (
                  <div className="rounded-2xl border border-red-300/15 bg-red-400/5 p-3">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-red-200">Mismatched signals</p>
                    <p className="text-slate-300">{result.mismatchedFields?.join(", ")}</p>
                  </div>
                )}
              </div>

              {Boolean(result.riskFactors?.length) && (
                <div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                    <ListChecks className="h-4 w-4" /> Risk factors
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-slate-400">
                    {result.riskFactors?.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {Boolean(result.aiExplanation?.length) && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Employer-facing AI explanation</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-400">
                    {result.aiExplanation?.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {Boolean((result.aiDecisionTrace?.length || result.aiThoughtOutput?.length)) && (
                <div className="rounded-2xl border border-blue-300/15 bg-blue-400/5 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">AI audit output</p>
                  <ol className="list-decimal space-y-1 pl-5 text-slate-400">
                    {(result.aiDecisionTrace?.length ? result.aiDecisionTrace : result.aiThoughtOutput)?.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
