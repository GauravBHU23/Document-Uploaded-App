"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  onChange?: (hasInk: boolean) => void;
};

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
};

export default function SignaturePad({
  onChange,
  padRef,
}: SignaturePadProps & { padRef: React.RefObject<SignaturePadHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [dprReady, setDprReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#16161d";
    }
    setDprReady(true);
  }, []);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    lastPoint.current = getPoint(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const point = getPoint(e);
    if (!ctx || !lastPoint.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;

    if (!hasInk.current) {
      hasInk.current = true;
      onChange?.(true);
    }
  }

  function handlePointerUp() {
    drawing.current = false;
    lastPoint.current = null;
  }

  useEffect(() => {
    if (!padRef) return;
    padRef.current = {
      clear() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasInk.current = false;
        onChange?.(false);
      },
      isEmpty() {
        return !hasInk.current;
      },
      toBlob() {
        return new Promise((resolve) => {
          canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
        });
      },
    };
  }, [padRef, onChange]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-white dark:border-zinc-600"
    >
      {dprReady && (
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 touch-none"
        />
      )}
      <div className="pointer-events-none absolute bottom-6 left-6 right-6 border-b border-dashed border-zinc-300" />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-400">
        Sign above the line
      </p>
    </div>
  );
}
