"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Lightweight top-of-page loading bar. Next.js App Router doesn't fire
// explicit "navigation started/finished" events we can subscribe to
// from a client component, so this approximates it: a route/search
// params change means a navigation just completed, and clicks on
// internal links are used as the "started" signal (with a short
// minimum visible duration so it doesn't just flash for fast loads).
export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Route changed -> navigation finished; hide shortly after so the
    // bar is visible for at least a beat even on instant navigations.
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setVisible(false), 200);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = (event.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || target.target === "_blank") {
        return;
      }
      setVisible(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 1.2, ease: "easeOut" } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.25 } }}
          className="accent-gradient fixed left-0 top-0 z-[60] h-[3px] w-full origin-left"
          style={{ transformOrigin: "left" }}
        />
      )}
    </AnimatePresence>
  );
}
