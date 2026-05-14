"use client";
import dynamic from "next/dynamic";

// Terminal pulls in lightweight-charts, framer-motion, and zustand
// hooks. Render it client-only to avoid any SSR window/document
// access during build or first request on the deploy platform.
const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center text-text-mid text-sm">
      booting Crypto Intelligence Terminal…
    </div>
  ),
});

export default function Page() {
  return <Terminal />;
}
