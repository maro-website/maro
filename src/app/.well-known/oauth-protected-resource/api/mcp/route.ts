import { NextResponse } from "next/server";
import { getMaroProtectedResourceMetadata } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const metadata = getMaroProtectedResourceMetadata();
  if (!metadata.authorization_servers.length) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json(metadata, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
