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
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.6 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const spanRef = useRef<HTMLSpanElement>(null);

  // The span's text is ALWAYS written imperatively (never through JSX
  // children) -- mixing a React-rendered text child with direct
  // textContent writes doesn't work: as soon as any state update here
  // triggers a re-render, React reconciles the JSX child back over
  // whatever was just written to the DOM, clobbering it. That was the
  // bug behind stat tiles going permanently blank whenever the real
  // value was 0 (people?.length ?? 0 etc. render 0 on the very first,
  // pre-hydration pass too, so there was no value CHANGE for the
  // animation to key off of, and the only text that ever reached the
  // DOM -- "0" from the server-rendered pass -- got wiped by the
  // mounted-flag re-render that followed it).
  useEffect(() => {
    motionValue.set(value);
    if (spanRef.current) spanRef.current.textContent = value.toLocaleString();
  }, [value, motionValue]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (spanRef.current) spanRef.current.textContent = v;
    });
  }, [display]);

  return <motion.span ref={spanRef} className={className} suppressHydrationWarning />;
}
