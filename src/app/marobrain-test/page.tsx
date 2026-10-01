import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrainExperiment } from "@/components/marobrain-test/BrainExperiment";

export const metadata: Metadata = {
  title: "maroBrain · Intelligence Lab",
  robots: { index: false, follow: false },
};

export default function MaroBrainTestPage() {
  // This experiment is intentionally unavailable in production builds.
  if (process.env.NODE_ENV !== "development") notFound();
  return <BrainExperiment />;
}
