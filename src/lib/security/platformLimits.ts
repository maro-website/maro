export interface PlatformLimits {
  maxActiveJobsGlobal?: number;
  maxConcurrentFree?: number;
  maxConcurrentFort?: number;
  maxQueueSize?: number;
  hourlySpendUsd?: number;
  dailySpendUsd?: number;
  userHourlyUsd?: number;
  userDailyUsd?: number;
  warnPct?: number;
  aiPaused?: boolean;
  pausedModules?: string[];
  promptMaxChars?: number;
  disableFreeCredits?: boolean;
  providerFlags?: Record<string, boolean>;
}

export const DEFAULT_PLATFORM_LIMITS: PlatformLimits = {
  maxActiveJobsGlobal: 50,
  maxConcurrentFree: 1,
  maxConcurrentFort: 3,
  maxQueueSize: 200,
  hourlySpendUsd: 100,
  dailySpendUsd: 500,
  userHourlyUsd: 10,
  userDailyUsd: 50,
  warnPct: 80,
  aiPaused: false,
  pausedModules: [],
  promptMaxChars: 4000,
  disableFreeCredits: false,
  providerFlags: { anthropic: true, openai: true, elevenlabs: true },
};
