"use client";
import * as React from "react";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
export async function adminRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: await adminAuthHeaders(body !== undefined), cache: "no-store", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Request failed"); return data;
}
export const inputClass = "w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink";
export function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-4 rounded-2xl border border-line bg-surface p-5"><h2 className="text-lg font-bold text-ink">{title}</h2>{children}</section>; }
export function Action({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button type="button" {...props} className="rounded-xl border border-line bg-canvas px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-hover disabled:opacity-40">{children}</button>; }
export function Labeled({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1 text-sm text-ink-2"><span>{label}</span>{children}</label>; }
