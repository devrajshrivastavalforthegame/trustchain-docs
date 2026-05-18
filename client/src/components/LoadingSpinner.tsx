import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ label = "Processing" }: { label?: string }) => (
  <div className="inline-flex items-center gap-2 text-sm text-slate-300">
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
);
