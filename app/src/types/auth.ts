export type Tier = 'free' | 'pro' | 'beta';

export interface TierLimits {
  maxRecipes: number;
  maxAiCalls: number;
  remainingAiCalls: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  tier: Tier | null;
  limits: TierLimits | null;
}

export interface UsageStats {
  tier: Tier;
  monthlyAiCalls: number;
  monthlyLimit: number;
  remainingCalls: number;
  resetAt: string;
}
