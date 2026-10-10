export interface AnalyticsOverview {
  usersTotal: number; usersCreators: number; generationsTotal: number; generationsLast7d: number;
  ordersPaid: number; revenueEur: number; creditsSpentLast7d: number; excludedPaidOrders: number;
  receiptsByCurrency: Array<{ currency: string; orders: number; amount: number }>;
}
export interface AnalyticsSnapshot {
  updatedAt: string; timezone: string; dayStartsAt: string; overview: AnalyticsOverview;
  byTool: Array<{ tool: string; count: number; attempts: number; credits: number }>;
  byMonth: Array<{ month: string; currency: string; orders: number; amount: number }>;
  daily: Array<{ day: string; signups: number; attempts: number; completed: number }>;
  today: { revenueEur: number; generations: number; completed: number; terminal: number; activeUsers: number; aiCostUsd: number; costMissing: number; attention: number };
}
