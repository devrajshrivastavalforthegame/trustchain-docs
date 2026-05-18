import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "violet" | "red";
}

const toneMap = {
  blue: "from-blue-500/20 to-cyan-400/10 text-blue-200 border-blue-300/20",
  emerald: "from-emerald-500/20 to-teal-400/10 text-emerald-200 border-emerald-300/20",
  violet: "from-violet-500/20 to-fuchsia-400/10 text-violet-200 border-violet-300/20",
  red: "from-red-500/20 to-orange-400/10 text-red-200 border-red-300/20"
};

export const StatsCard = ({ label, value, detail, icon: Icon, tone = "blue" }: StatsCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-3xl border bg-gradient-to-br p-5 shadow-2xl shadow-black/20 backdrop-blur-xl ${toneMap[tone]}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-sm text-slate-400">{detail}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </motion.div>
);
