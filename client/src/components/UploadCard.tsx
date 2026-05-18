import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileCheck2, FileUp, ShieldCheck } from "lucide-react";
import { sha256FromFile } from "../utils/hash";
import { compactHash } from "../utils/format";
import { LoadingSpinner } from "./LoadingSpinner";
import { env } from "../config/env";

interface UploadCardProps {
  title?: string;
  subtitle?: string;
  onFileReady: (file: File, hash: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export const UploadCard = ({
  title = "Drop degree PDF",
  subtitle = "SHA-256 is generated locally before anything touches the API.",
  onFileReady,
  accept = "*",
  maxSizeMB = env.maxUploadMB
}: UploadCardProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [hash, setHash] = useState("");

  const processFile = async (file?: File) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum allowed size is ${maxSizeMB}MB.`);
      return;
    }
    setHashing(true);
    try {
      const nextHash = await sha256FromFile(file);
      setFileName(file.name);
      setHash(nextHash);
      onFileReady(file, nextHash);
    } finally {
      setHashing(false);
    }
  };

  return (
    <motion.div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void processFile(event.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      whileHover={{ scale: 1.01 }}
      className={`cursor-pointer rounded-3xl border border-dashed p-8 text-center transition ${
        dragging ? "border-blue-300 bg-blue-500/15 shadow-glow" : "border-white/15 bg-white/[0.04] hover:border-blue-300/60"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void processFile(event.target.files?.[0])} />
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/60 text-blue-200">
        {hash ? <FileCheck2 className="h-8 w-8 text-emerald-300" /> : <FileUp className="h-8 w-8" />}
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{hash ? fileName : title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{hash ? "Document fingerprint has been generated and is ready for blockchain anchoring." : subtitle}</p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">
        {hashing ? <LoadingSpinner label="Generating SHA-256" /> : hash ? compactHash(hash, 20, 18) : `Drag & drop or click to upload · Max ${maxSizeMB}MB`}
      </div>
      {hash && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Client-side hash ready
        </div>
      )}
    </motion.div>
  );
};
