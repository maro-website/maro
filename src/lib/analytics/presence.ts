export const PRESENCE_PULSE_MS = 45_000;
export const PRESENCE_REFRESH_MS = 30_000;

export interface OnlinePresenceSnapshot {
  total: number;
  signedIn: number;
  guests: number;
  windowSeconds: number;
  updatedAt: string;
}
