import type { Metadata } from "next";
import { Showreel } from "@/components/showreel/Showreel";
import "./fonts.css";

export const metadata: Metadata = {
  title: "Index",
  description: "A continuous sequence of brand, product, and editorial websites.",
  robots: { index: false, follow: false },
};

export default function ShowreelPage() {
  return <Showreel />;
}
