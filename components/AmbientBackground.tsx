// Fixed, full-viewport animated mesh-gradient background shared by
// every page. Pointer-events-none and behind everything, so it never
// interferes with clicks/scroll. Respects prefers-reduced-motion (see
// .animate-drift-* / .animate-hue rules in globals.css).
//
// Built from several large, saturated, overlapping color fields (a
// "mesh gradient") rather than a couple of faint corner blobs, so
// color reaches every part of the viewport instead of fading to flat
// background in the middle/edges. A subtle grain layer on top adds
// the tactile, non-flat look premium dark UIs use instead of pure
// flat color.
export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--background)]"
    >
      <div className="absolute inset-0">
        <div className="animate-drift-a absolute left-[-10%] top-[-15%] h-[55rem] w-[55rem] rounded-full bg-indigo-500/50 blur-[110px] dark:bg-indigo-500/45" />
        <div className="animate-drift-b absolute right-[-15%] top-[-5%] h-[50rem] w-[50rem] rounded-full bg-violet-500/45 blur-[110px] dark:bg-violet-500/40" />
        <div className="animate-drift-c absolute bottom-[-20%] left-[5%] h-[52rem] w-[52rem] rounded-full bg-fuchsia-500/35 blur-[110px] dark:bg-fuchsia-500/32" />
        <div
          className="animate-drift-b absolute bottom-[-18%] right-[0%] h-[46rem] w-[46rem] rounded-full bg-sky-400/35 blur-[110px] dark:bg-sky-500/32"
          style={{ animationDelay: "-16s" }}
        />
        <div
          className="animate-drift-a absolute left-[30%] top-[30%] h-[40rem] w-[40rem] rounded-full bg-purple-400/30 blur-[120px] dark:bg-purple-400/28"
          style={{ animationDelay: "-24s" }}
        />
        <div
          className="animate-drift-c absolute right-[25%] top-[55%] h-[36rem] w-[36rem] rounded-full bg-indigo-300/25 blur-[120px] dark:bg-indigo-300/20"
          style={{ animationDelay: "-10s" }}
        />
      </div>

      {/* Grain texture: tiny repeating SVG noise, kept extremely
          subtle (low opacity) so it reads as texture, not static. */}
      <div
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Soft vignette so content areas (center-ish) stay readable
          while the mesh gradient stays vivid at the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_95%)] opacity-60" />
    </div>
  );
}
