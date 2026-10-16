"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CameraCaptureProps = {
  onCapture: (file: File) => void;
  /** "user" = front/selfie camera, "environment" = back camera (documents/signatures) */
  defaultFacing?: "user" | "environment";
};

export default function CameraCapture({ onCapture, defaultFacing = "environment" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">(defaultFacing);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setError(null);
      setReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setError(
            "Could not access the camera. Check that you've allowed camera permission for this site.",
          );
        }
      }
    }

    if (!capturedUrl) startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facing, capturedUrl]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
  }

  function handleUse() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-zinc-900 shadow-lg">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-zinc-500">
              <path fillRule="evenodd" d="M1.5 6.375c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 17.625V6.375zm1.5 10.75v-10a.125.125 0 01.125-.125h16.75a.125.125 0 01.125.125v10a.125.125 0 01-.125.125H3.125A.125.125 0 013 17.125z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-zinc-300">{error}</p>
          </div>
        ) : capturedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: URL, not a remote image
          <img src={capturedUrl} alt="Captured" className="h-full w-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-8 w-8 animate-spin text-white/70" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <AnimatePresence mode="wait">
        {!capturedUrl ? (
          <motion.div
            key="controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex items-center gap-4"
          >
            <button
              type="button"
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="rounded-full border border-zinc-300 p-3 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
              aria-label="Switch camera"
              title="Switch camera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 002.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0112.888 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
            </button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleCapture}
              disabled={!ready}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg ring-2 ring-zinc-300 transition-opacity disabled:opacity-40 dark:ring-zinc-700"
              aria-label="Take photo"
            >
              <span className="accent-gradient h-12 w-12 rounded-full" />
            </motion.button>
            <div className="w-11" />
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex w-full max-w-sm gap-3"
          >
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleUse}
              className="accent-gradient flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95"
            >
              Use photo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
