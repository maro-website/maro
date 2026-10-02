"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { AssetsLibrary } from "@/components/app/AssetsLibrary";
function LibraryPage() {
  const search = useSearchParams();
  const category = search.get("category");
  return <AssetsLibrary initialCategory={category === "saved" || category === "published" || category === "uploaded" ? category : "made"} />;
}
export default function KrijimetPage() {
  return <AppShell><React.Suspense fallback={null}><LibraryPage /></React.Suspense></AppShell>;
}
