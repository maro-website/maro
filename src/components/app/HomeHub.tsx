"use client";

import { HubLanding } from "@/components/hub-landing/HubLanding";

/** Main Hub content; account identity is read from the existing Maro provider. */
export function HomeHub(_props: { firstName?: string }) {
  return <HubLanding />;
}
