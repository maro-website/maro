"use client";

import * as React from "react";
import { ToolComposer } from "@/components/app/ToolComposer";

/** Results-first image workspace — masonry gallery + floating prompt dock. */
export function ImageStudio({ toolId }: { toolId: string }) {
  return <ToolComposer toolId={toolId} layout="gallery" />;
}
