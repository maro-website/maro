import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ error: "purchases_unavailable" }, { status: 404 }); }
