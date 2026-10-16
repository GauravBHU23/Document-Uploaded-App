"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";

const TOOLS = [
  {
    href: "/tools/merge-pdf",
    title: "Merge PDF",
    description: "Combine images and PDFs into one file, reorder pages as you like.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
        <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
      </svg>
    ),
    gradient: "from-indigo-400 to-violet-500",
  },
  {
    href: "/tools/resize-image",
    title: "Resize Image",
    description: "Shrink photos to the exact size forms ask for — passport photo, signature, and more.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
      </svg>
    ),
    gradient: "from-sky-400 to-blue-500",
  },
  {
    href: "/tools/signature",
    title: "Signature",
    description: "Draw a signature, or photograph one on paper with the background cleaned up.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M3.75 3a.75.75 0 00-.75.75v16.5c0 .414.336.75.75.75H20.25a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75H3.75zM6 15.26c2.07-2.956 4.573-4.52 7.5-4.52a.75.75 0 010 1.5c-2.414 0-4.546 1.263-6.372 3.76h1.372a.75.75 0 010 1.5H5a.75.75 0 01-.75-.75v-3.5a.75.75 0 011.5 0v2.01z" />
      </svg>
    ),
    gradient: "from-fuchsia-400 to-pink-500",
  },
];

export default function ToolsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Tools" subtitle="Everything you need, without leaving the app" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-4xl">
          <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool, i) => (
              <motion.li
                key={tool.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                whileHover={{ y: -3 }}
                className="flex"
              >
                <Link
                  href={tool.href}
                  className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-indigo-900/10 dark:border-zinc-800/80 dark:bg-zinc-950/60"
                >
                  <div
                    className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${tool.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`}
                  />
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.gradient} text-white shadow-md`}
                  >
                    {tool.icon}
                  </div>
                  <h2 className="relative mt-4 font-semibold text-zinc-900 dark:text-zinc-50">
                    {tool.title}
                  </h2>
                  <p className="relative mt-1 flex-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tool.description}
                  </p>
                  <p className="relative mt-3 flex items-center gap-1 text-sm font-medium text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                    Open
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </p>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
