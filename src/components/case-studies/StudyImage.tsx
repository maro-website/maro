"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { StudyAsset } from "@/data/case-studies/types";
import s from "./CaseStudies.module.css";

export function StudyImage({ asset, sizes, priority = false, original = false, className = "" }: {
  asset: StudyAsset; sizes: string; priority?: boolean; original?: boolean; className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === asset.src) return <span className={`${s.imageFallback} ${className}`} role="img" aria-label={`${asset.alt} — imazhi mungon`}><ImageOff size={24} /><span>Imazhi nuk është i disponueshëm</span><small>{asset.src.split("/").pop()}</small></span>;
  return <Image src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} sizes={sizes} priority={priority} unoptimized={original} quality={85} className={className} onError={() => setFailedSource(asset.src)} />;
}
