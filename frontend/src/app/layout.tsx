import type { Metadata } from "next";
import "./globals.css";
import KeyboardShortcutsProvider from "@/components/KeyboardShortcutsProvider";

export const metadata: Metadata = {
  title: "StellarKraal — Livestock Micro-Lending",
  description: "Livestock-backed micro-lending on Stellar/Soroban",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-brown min-h-screen">
        <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
      </body>
    </html>
  );
}
