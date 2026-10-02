"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { AssetsLibrary } from "@/components/app/AssetsLibrary";
function LibraryPage() {
  const search = useSearchParams();
  return <AssetsLibrary initialCategory={search.get("category") === "saved" ? "saved" : "made"} />;
}
export default function KrijimetPage() {
  return <AppShell><React.Suspense fallback={null}><LibraryPage /></React.Suspense></AppShell>;
}
