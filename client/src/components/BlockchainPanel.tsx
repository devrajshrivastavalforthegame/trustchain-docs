import { Blocks, Cpu, Fuel, Network, Timer, WalletCards } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { compactHash, formatDateTime } from "../utils/format";

interface BlockchainPanelProps {
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  network?: string;
  timestamp?: string;
  compact?: boolean;
}

export const BlockchainPanel = ({ txHash, blockNumber, gasUsed, network, timestamp, compact = false }: BlockchainPanelProps) => {
  const rows = [
    { icon: WalletCards, label: "Transaction", value: compactHash(txHash, 14, 10) },
    { icon: Blocks, label: "Block", value: blockNumber || "Pending confirmation" },
    { icon: Fuel, label: "Gas", value: gasUsed || "Estimated by backend" },
    { icon: Network, label: "Network", value: network || "Polygon Amoy" },
    { icon: Timer, label: "Timestamp", value: formatDateTime(timestamp) }
  ];
  return (
    <GlassCard hover={false} className="overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-400/10 p-2 text-emerald-200">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Blockchain Proof Layer</p>
            <p className="text-xs text-slate-400">Immutable transaction evidence from your backend smart contract.</p>
          </div>
        </div>
      </div>
      <div className={compact ? "grid gap-3 p-4" : "grid gap-3 p-5 sm:grid-cols-2"}>
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <row.icon className="h-3.5 w-3.5" />
              {row.label}
            </div>
            <p className="mt-2 break-all font-mono text-sm text-slate-100">{row.value}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
