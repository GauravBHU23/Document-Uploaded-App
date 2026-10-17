export default function AppFooter() {
  return (
    <footer className="border-t border-zinc-200/70 px-4 py-5 sm:px-6 lg:px-10 2xl:px-16 dark:border-zinc-800/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Developed by <span className="font-medium text-zinc-700 dark:text-zinc-200">Gaurav Kumar</span>
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Department of Computer Science, IIT BHU Varanasi
        </p>
      </div>
    </footer>
  );
}
