import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/payments/orders";

export async function GET() {
  const catalog = await getPublicCatalog();
  return NextResponse.json(catalog);
}
