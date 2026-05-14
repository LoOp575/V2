import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIT - Crypto Intelligence Terminal",
  description: "Quant-grade crypto intelligence: CPI, interaction matrix, accumulation/distribution detection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-0 text-text-hi">{children}</body>
    </html>
  );
}
