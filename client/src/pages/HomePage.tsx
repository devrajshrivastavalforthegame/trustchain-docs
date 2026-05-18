import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Blocks, BrainCircuit, Building2, FileCheck2, Fingerprint, KeyRound, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { GlassCard } from "../components/GlassCard";

const features = [
  { icon: Fingerprint, title: "SHA-256 Fingerprints", text: "Every uploaded degree receives a deterministic cryptographic identity before verification." },
  { icon: UserCheck, title: "Consent-first Access", text: "Employers cannot view sensitive student data until the student approves disclosure." },
  { icon: Blocks, title: "Blockchain Anchoring", text: "Transaction hash, block number, network and gas details are shown as proof evidence." },
  { icon: BrainCircuit, title: "AI Integrity Score", text: "Risk scoring layer turns verification into a visually understandable trust signal." }
];

const portals = [
  { to: "/issuer", icon: Building2, title: "Issuer Portal", text: "Upload degree PDF, anchor document hash, generate QR and email proof." },
  { to: "/student", icon: BadgeCheck, title: "Student Vault", text: "View credentials, QR proofs, history and approve employer requests." },
  { to: "/employer", icon: FileCheck2, title: "Employer Verify", text: "Search enrollment number, upload PDF or scan QR for consent-based verification." }
];

export const HomePage = () => (
  <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
    <Navbar />
    <section className="relative bg-grid-dark bg-[size:34px_34px] px-5 py-20 sm:py-28">
      <div className="absolute inset-0 bg-radial-blue" />
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 shadow-glow">
            <ShieldCheck className="h-4 w-4" /> DigiLocker × Web3 × University Portal
          </div>
          <h1 className="mt-7 max-w-4xl font-serif text-5xl font-bold leading-[1.03] text-white sm:text-7xl">
            The institutional standard for digital degrees.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            TrustChain Docs turns academic verification into a live blockchain-backed, consent-first workflow: issuer upload, student approval, employer verification and public QR proof.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/employer" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-4 font-bold text-white shadow-glow hover:bg-blue-500">
              Verify Degree <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/issuer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-7 py-4 font-bold text-white hover:bg-white/10">
              Issuer Portal
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.55 }} className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-blue-500/20 blur-3xl" />
          <GlassCard hover={false} className="relative p-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live trust graph</p>
                  <p className="mt-1 text-xl font-black text-white">Credential Lifecycle</p>
                </div>
                <LockKeyhole className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="mt-6 grid gap-4">
                {[
                  ["Issuer", "Uploads degree + anchors hash", "bg-blue-500"],
                  ["Student", "Approves employer disclosure", "bg-violet-500"],
                  ["Employer", "Receives verified proof + AI score", "bg-emerald-500"]
                ].map(([label, text, tone], index) => (
                  <motion.div key={label} initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 + index * 0.12 }} className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone} font-black text-white`}>{index + 1}</div>
                    <div>
                      <p className="font-bold text-white">{label}</p>
                      <p className="text-sm text-slate-400">{text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 font-mono text-xs text-emerald-100">
                0xa91f2a00868f09ea2e4e...14b2ed07 · Polygon Amoy · Confirmed
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {portals.map((portal) => (
          <Link key={portal.title} to={portal.to}>
            <GlassCard className="h-full p-6">
              <portal.icon className="h-8 w-8 text-blue-200" />
              <h3 className="mt-5 text-xl font-black text-white">{portal.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{portal.text}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 pb-20">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-blue-200">Security architecture</p>
        <h2 className="mt-3 font-serif text-4xl font-bold text-white">Built to impress judges and survive real API integration.</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <GlassCard key={feature.title} className="p-6">
            <feature.icon className="h-7 w-7 text-emerald-200" />
            <h3 className="mt-5 font-bold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  </div>
);
