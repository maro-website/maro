"use client";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
export default function AdminAnalyticsPage() {
  return <div><AdminPageHeader title="Përmbledhje e analitikave" description="Pagesat reale dhe aktiviteti i platformës. Metrikat testuese nuk shtohen te arkëtimet." actions={<Link href="/admin/analytics/presets" className="maro-button" data-variant="secondary">Statistikat e preseteve</Link>} /><AnalyticsPanel /></div>;
}
