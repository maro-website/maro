"use client";

import { HubVision } from "@/components/hub-vision/HubVision";

/** Main Hub content; account identity is read from the existing Maro provider. */
export function HomeHub(_props: { firstName?: string }) {
  return <HubVision embedded />;
}
