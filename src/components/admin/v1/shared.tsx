"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { Button } from "@/components/ui/Button";
export async function adminRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: await adminAuthHeaders(body !== undefined), cache: "no-store", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Request failed"); return data;
}
export const inputClass = "maro-input min-h-11 text-sm";
export function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-5 rounded-maro20 border border-line bg-surface p-5 sm:p-6"><h2 className="text-xl font-bold text-ink">{title}</h2>{children}</section>; }
export function Action({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <Button variant="secondary" {...props}>{children}</Button>; }
export function Labeled({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1 text-sm text-ink-2"><span>{label}</span>{children}</label>; }
