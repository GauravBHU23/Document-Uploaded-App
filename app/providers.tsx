"use client";

import { Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import TopLoadingBar from "@/components/TopLoadingBar";
import ConfirmDialogProvider from "@/components/ConfirmDialogProvider";
import OfflineOverlay from "@/components/OfflineOverlay";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app works fully without the service worker,
        // it just loses the offline fallback and install prompt.
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        {children}
        <Toaster richColors position="top-center" />
        <OfflineOverlay />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
