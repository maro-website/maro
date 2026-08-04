import "server-only";

export const DEFAULT_PROMPT_MAX_CHARS = 4000;
export const MAX_REFERENCE_IMAGES = 3;
export const MAX_REFERENCE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_BODY_CHARS = 500_000;

export const MODULE_LIMITS = {
  web: {
    maxPages: 5,
    maxSectionsPerPage: 12,
    maxImages: 20,
    maxAutoRetries: 1,
    timeoutMs: 870_000,
  },
  image: {
    maxImagesPerRequest: 4,
    regenCostsCredits: true,
  },
  logo: {
    maxResults: 4,
  },
  audio: {
    maxDurationSec: 120,
  },
  chat: {
    maxMessagesPerHour: 60,
  },
  edit: {
    maxEditsPerSession: 50,
  },
} as const;

export function getPromptMaxChars(platformLimits?: { promptMaxChars?: number }): number {
  return platformLimits?.promptMaxChars ?? DEFAULT_PROMPT_MAX_CHARS;
}
