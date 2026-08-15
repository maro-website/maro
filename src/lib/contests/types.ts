export interface ContestItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  prize_label: string;
  prize_credits: number;
  cover_url: string | null;
  status: "open" | "announced" | "closed";
  starts_at: string;
  ends_at: string;
}

export interface ContestSubmission {
  id: string;
  contest_id: string;
  user_id: string;
  url: string;
  prompt: string;
  author: string | null;
  winner: boolean;
  created_at: string;
}
