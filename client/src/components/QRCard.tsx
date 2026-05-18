import { QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard } from "./GlassCard";

interface QRCardProps {
  value: string;
  title?: string;
  subtitle?: string;
}

export const QRCard = ({ value, title = "QR Proof", subtitle = "Scan to open public verification page." }: QRCardProps) => {
  const canvasId = `qr-${btoa(value).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;

  const download = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "trustchain-qr-proof.png";
    link.click();
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Verification link copied.");
    } catch {
      toast.error("Unable to copy link.");
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <a href={value} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 p-2 text-slate-300 hover:bg-white/10">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="mt-5 flex justify-center rounded-3xl border border-white/10 bg-white p-5">
        <QRCodeCanvas id={canvasId} value={value} size={164} level="H" includeMargin />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={download} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">
          <Download className="mr-2 inline h-4 w-4" /> Download
        </button>
        <button onClick={share} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          <Share2 className="mr-2 inline h-4 w-4" /> Share
        </button>
      </div>
    </GlassCard>
  );
};
