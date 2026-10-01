import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as React from "react";
import { HubBitsLab } from "@/components/hub-bits/HubBitsLab";

export const metadata: Metadata = {
  title: "Hub · React Bits",
  robots: { index: false, follow: false },
};

export default function HubBitsPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <React.Suspense fallback={null}>
      <HubBitsLab />
    </React.Suspense>
  );
}
