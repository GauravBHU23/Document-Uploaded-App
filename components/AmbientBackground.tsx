// Fixed, full-viewport animated background blobs shared by every page.
// Pointer-events-none and behind everything (negative z-index via
// placement in the DOM + fixed positioning), so it never interferes
// with clicks/scroll. Respects prefers-reduced-motion (see
// .animate-drift-* rules in globals.css).
export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--background)]"
    >
      <div className="animate-drift-a absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-indigo-500/40 blur-[90px] dark:bg-indigo-500/35" />
      <div className="animate-drift-b absolute -right-32 top-[10%] h-[36rem] w-[36rem] rounded-full bg-violet-500/35 blur-[90px] dark:bg-violet-500/30" />
      <div className="animate-drift-c absolute bottom-[-14rem] left-[20%] h-[38rem] w-[38rem] rounded-full bg-fuchsia-400/25 blur-[90px] dark:bg-fuchsia-500/25" />
      <div
        className="animate-drift-b absolute right-[10%] bottom-[-10rem] h-[32rem] w-[32rem] rounded-full bg-sky-400/20 blur-[90px] dark:bg-sky-500/20"
        style={{ animationDelay: "-14s" }}
      />
      <div
        className="animate-drift-a absolute left-[35%] top-[35%] h-[30rem] w-[30rem] rounded-full bg-indigo-400/15 blur-[100px] dark:bg-indigo-400/15"
        style={{ animationDelay: "-20s" }}
      />
    </div>
  );
}
