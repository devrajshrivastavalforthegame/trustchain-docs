import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className = "", hover = true }: GlassCardProps) => (
  <motion.div
    whileHover={hover ? { y: -4, scale: 1.005 } : undefined}
    transition={{ type: "spring", stiffness: 260, damping: 22 }}
    className={`rounded-3xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
  >
    {children}
  </motion.div>
);
