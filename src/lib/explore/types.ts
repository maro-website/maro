"use client";

import type { ExploreItem } from "@/lib/services/exploreService";

export const EXPLORE_SORTS = [
  { id: "recent", label: "Të rejat" },
  { id: "trending", label: "Trending" },
  { id: "featured", label: "Featured" },
  { id: "liked", label: "Më të pëlqyerat" },
  { id: "saved", label: "Më të ruajturat" },
  { id: "viewed", label: "Më të shikuarat" },
] as const;

export type ExploreSort = (typeof EXPLORE_SORTS)[number]["id"];

export interface ExploreItemExtended extends ExploreItem {
  username?: string | null;
  saved?: boolean;
  save_count?: number;
  view_count?: number;
  show_prompt?: boolean;
  show_settings?: boolean;
  selections?: Record<string, string>;
  deleted_at?: string | null;
  slug?: string | null;
  like_count?: number;
  remix_count?: number;
  featured?: boolean;
  remix_of?: string | null;
  user_id?: string | null;
  liked?: boolean;
}

export interface ChallengeItem {
  id: string;
  slug: string;
  title: string;
  prompt_hint: string;
  tool_id: string;
  reward_credits: number;
  ends_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  author: string;
  score: number;
}
