"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type AnimatedNumberProps = {
  value: number;
  className?: string;
};

/** Counts up to `value` with a spring, instead of just snapping to a
 * new number -- the kind of small motion-design detail that makes a
 * stat tile feel alive rather than static. Starts at 0 on first mount
 * (matching the server-rendered "0"/"–" state) and animates to the
 * real value post-hydration; subsequent value changes animate from
 * wherever the spring currently is. */
export default function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.6 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    motionValue.set(value);
    // Animating from 0 to a value that's ALSO 0 (e.g. "0 documents")
    // never fires the spring's "change" event below -- nothing moved --
    // so the span would be left showing the empty string from the
    // `mounted ? "" : "0"` render below forever. Seed it directly so a
    // genuine zero still displays as "0".
    if (spanRef.current) spanRef.current.textContent = value.toLocaleString();
  }, [value, motionValue]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (spanRef.current) spanRef.current.textContent = v;
    });
  }, [display]);

  return (
    <motion.span ref={spanRef} className={className}>
      {mounted ? "" : "0"}
    </motion.span>
  );
}
