import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "purchases_unavailable" }, { status: 404 }); }
