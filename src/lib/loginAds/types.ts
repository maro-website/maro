export interface LoginAd {
  id: string;
  imageUrl: string;
  imagePath: string;
  externalUrl: string;
  weight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicLoginAd {
  id: string;
  imageUrl: string;
  externalUrl: string;
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

