"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ToolHeroProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export default function ToolHero({ icon, title, description }: ToolHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] p-6 text-white shadow-lg shadow-indigo-900/20 sm:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center gap-4" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm font-medium text-white/90">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
