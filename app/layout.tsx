import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import AmbientBackground from "@/components/AmbientBackground";
import AppLaunchLoader from "@/components/AppLaunchLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocVault",
  description: "Admin document management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DocVault",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#6246ea",
};

// Runs before hydration so the saved theme applies on the very first
// paint -- without this, the page would flash the OS-default theme
// for a frame before React mounts and corrects it.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("docvault-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.classList.add(t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <AmbientBackground />
        <Providers>{children}</Providers>
        <AppLaunchLoader />
      </body>
    </html>
  );
}
