export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayClarity",
  description: "Know exactly where your money goes every paycheck.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PayClarity",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider signInFallbackRedirectUrl="/overview" afterSignOutUrl="/">
      <html lang="en">
        <body className="bg-slate-950 text-slate-50 antialiased overflow-x-hidden">{children}</body>
      </html>
    </ClerkProvider>
  );
}
