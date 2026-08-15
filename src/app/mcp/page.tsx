"use client";

import { AppShell } from "@/components/app/AppShell";
import { Terminal } from "lucide-react";
import Link from "next/link";

/** MCP & CLI stub — full build deferred. */
export default function McpPage() {
  return (
    <AppShell>
      <div className="grid h-full place-items-center px-6">
        <div className="max-w-lg rounded-maro16 border border-line bg-surface px-8 py-16 text-center">
          <Terminal className="mx-auto h-12 w-12 text-brand" />
          <h1 className="mt-4 text-[22px] font-bold tracking-brand text-ink">maro MCP & CLI</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Integro maro në workflow-et e tua me MCP dhe CLI. API publike dhe dokumentacion vijnë së shpejti.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-xl bg-canvas px-4 py-3 text-left text-[13px] text-ink-2">
            {`# Coming soon\npnpm dlx @maro/cli generate \\\n  --tool imazh \\\n  --prompt "..."`}
          </pre>
          <Link
            href="/contact"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-white"
          >
            Na kontakto për akses të hershëm
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
