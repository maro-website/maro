import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { LoginAd, PublicLoginAd } from "./types";

type LoginAdRow = {
  id: string;
  image_url: string;
  image_path: string;
  external_url: string;
  weight: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const LOGIN_AD_COLUMNS =
  "id, image_url, image_path, external_url, weight, active, created_at, updated_at";

function mapLoginAd(row: LoginAdRow): LoginAd {
  return {
    id: row.id,
    imageUrl: row.image_url,
    imagePath: row.image_path,
    externalUrl: row.external_url,
    weight: row.weight,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLoginAds(): Promise<LoginAd[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("login_ads")
    .select(LOGIN_AD_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LoginAdRow[]).map(mapLoginAd);
}

export async function getLoginAd(id: string): Promise<LoginAd | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("login_ads")
    .select(LOGIN_AD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLoginAd(data as LoginAdRow) : null;
}

export async function selectPublicLoginAd(): Promise<PublicLoginAd | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("login_ads")
    .select(LOGIN_AD_COLUMNS)
    .eq("active", true);
  if (error) throw new Error(error.message);

  const ads = ((data ?? []) as LoginAdRow[]).filter((row) => row.weight > 0);
  if (!ads.length) return null;
  const totalWeight = ads.reduce((sum, ad) => sum + ad.weight, 0);
  let cursor = Math.random() * totalWeight;
  const selected =
    ads.find((ad) => {
      cursor -= ad.weight;
      return cursor < 0;
    }) ?? ads[ads.length - 1];

  return {
    id: selected.id,
    imageUrl: selected.image_url,
    externalUrl: selected.external_url,
  };
}

export async function upsertLoginAd(input: {
  id?: string;
  imageUrl: string;
  imagePath: string;
  externalUrl: string;
  weight: number;
  active: boolean;
  createdBy: string;
}): Promise<LoginAd> {
  const payload = {
    image_url: input.imageUrl,
    image_path: input.imagePath,
    external_url: input.externalUrl,
    weight: input.weight,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? getSupabaseAdmin().from("login_ads").update(payload).eq("id", input.id)
    : getSupabaseAdmin()
        .from("login_ads")
        .insert({ ...payload, created_by: input.createdBy });
  const { data, error } = await query.select(LOGIN_AD_COLUMNS).single();
  if (error) throw new Error(error.message);
  return mapLoginAd(data as LoginAdRow);
}

export async function deleteLoginAd(id: string): Promise<LoginAd | null> {
  const existing = await getLoginAd(id);
  if (!existing) return null;
  const { error } = await getSupabaseAdmin().from("login_ads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return existing;
}
