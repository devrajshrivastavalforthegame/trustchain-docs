import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, Blocks, FileCheck2, ShieldCheck } from "lucide-react";

const valueProps = [
  {
    icon: ShieldCheck,
    title: "Consent-first verification",
    text: "Every employer check is routed through student approval before any credential result is revealed.",
  },
  {
    icon: Blocks,
    title: "Blockchain anchored",
    text: "Degree hashes are prepared for tamper-proof Web3 anchoring with transaction metadata.",
  },
  {
    icon: FileCheck2,
    title: "SHA-256 integrity",
    text: "Documents are verified by cryptographic fingerprints instead of exposing original files.",
  },
];

const SplitAuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.22),transparent_35%)]" />
        <div className="relative flex h-full flex-col justify-between px-12 py-10">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10">
              <BadgeCheck className="h-6 w-6 text-emerald-300" />
            </span>
            <span className="text-lg font-semibold tracking-tight">TrustChain Docs</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-xl"
          >
            <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
              Institutional Web3 Identity
            </p>
            <h1 className="font-serif text-5xl leading-tight tracking-tight text-white">
              A secure credential layer for universities, students, and employers.
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Login as any demo stakeholder and test the complete async approval workflow from
              document submission to student consent and blockchain-backed verification.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {valueProps.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * index, duration: 0.45 }}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur"
              >
                <div className="flex gap-4">
                  <item.icon className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-xl">{children}</div>
      </section>
    </main>
  );
};

export default SplitAuthLayout;
