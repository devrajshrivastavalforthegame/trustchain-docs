import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Award, ExternalLink, FileBadge2, ShieldCheck, University } from "lucide-react";
import { verificationService } from "../services/verificationService";
import type { VerificationResult } from "../types/domain";
import { VerificationCard } from "../components/VerificationCard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { QRCard } from "../components/QRCard";
import { StatusBadge } from "../components/StatusBadge";
import { env } from "../config/env";

export const PublicVerify = () => {
  const { id = "" } = useParams();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const next = await verificationService.publicVerify(id);
        setResult(next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to verify public credential.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-dark bg-[size:34px_34px] p-5 text-white">
      <div className="absolute inset-0 bg-radial-blue" />
      <div className="relative mx-auto max-w-6xl py-10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-3 shadow-glow"><ShieldCheck className="h-6 w-6" /></div>
            <div><p className="font-serif text-2xl font-bold">TrustChain Docs</p><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Public Verification</p></div>
          </Link>
          <StatusBadge status={result?.status === "verified" ? "blockchain confirmed" : "pending"} />
        </header>

        <main className="mt-12">
          {loading && <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-10 text-center"><LoadingSpinner label="Reading blockchain proof" /></div>}
          {!loading && result && (
            <div className="grid gap-7 xl:grid-cols-[1fr_340px]">
              <div className="space-y-7">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl">
                  <div className="bg-radial-blue p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-blue-100">University seal verified</p>
                        <h1 className="mt-3 font-serif text-4xl font-bold text-white">Digital Degree Certificate</h1>
                        <p className="mt-2 text-slate-200">Public proof page opened from QR scan.</p>
                      </div>
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10">
                        <University className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-5 p-7 md:grid-cols-2">
                    <ProofItem icon={Award} label="Student" value={result.studentName || "Consent required"} />
                    <ProofItem icon={FileBadge2} label="Degree" value={result.degreeTitle || result.course || "Academic Credential"} />
                    <ProofItem icon={University} label="University" value={result.university || "Issuing Institution"} />
                    <ProofItem icon={ShieldCheck} label="Verification" value={result.status === "verified" ? "Blockchain Verified" : "Not verified"} />
                  </div>
                </section>
                <VerificationCard result={result} />
              </div>
              <aside className="space-y-5">
                <QRCard value={`${env.publicAppUrl}/verify/${id}`} title="Current QR" subtitle="Same public proof URL." />
                <a href={`${env.publicAppUrl}/verify/${id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white hover:bg-blue-500">
                  Open proof <ExternalLink className="h-5 w-5" />
                </a>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const ProofItem = ({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) => (
  <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500"><Icon className="h-4 w-4" /> {label}</div>
    <p className="mt-3 text-lg font-bold text-white">{value}</p>
  </div>
);
