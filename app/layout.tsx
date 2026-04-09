export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Assistant",
  description: "Personal finance assistant for paycheck planning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance",
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
    <ClerkProvider signInFallbackRedirectUrl="/" afterSignOutUrl="/sign-in">
      <html lang="en">
        <body className="bg-slate-950 text-slate-50 antialiased overflow-x-hidden">{children}</body>
      </html>
    </ClerkProvider>
  );
}
