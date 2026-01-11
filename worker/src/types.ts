export interface Env {
  INVITE_CODES: KVNamespace;
  SESSIONS: KVNamespace;
  USAGE: KVNamespace;
  OPENAI_API_KEY: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export type Tier = 'free' | 'pro' | 'beta';

export interface InviteCode {
  code: string; // Hashed
  tier: Tier;
  email?: string;
  createdAt: string;
  expiresAt?: string;
  maxUsage?: number;
  currentUsage: number;
  isActive: boolean;
}

export interface Session {
  token: string;
  inviteCodeHash: string;
  tier: Tier;
  createdAt: string;
  expiresAt: string;
}

export interface MonthlyUsage {
  aiCalls: number;
  tokensUsed: number;
  lastCall: string;
}

export interface JWTPayload {
  sub: string; // Invite code hash
  tier: Tier;
  iat: number;
  exp: number;
}

export const TIER_LIMITS = {
  free: {
    maxRecipes: 20,
    monthlyAiCalls: 50,
    requestsPerMinute: 10,
  },
  pro: {
    maxRecipes: -1,
    monthlyAiCalls: 500,
    requestsPerMinute: 30,
  },
  beta: {
    maxRecipes: -1,
    monthlyAiCalls: -1,
    requestsPerMinute: 60,
  },
} as const;

// API Request/Response types
export interface ValidateRequest {
  inviteCode: string;
}

export interface ValidateResponse {
  success: boolean;
  token?: string;
  tier?: Tier;
  limits?: {
    maxRecipes: number;
    maxAiCalls: number;
    remainingAiCalls: number;
  };
  error?: string;
}

export interface ParseRequest {
  content: string;
  contentType: 'text' | 'image' | 'pdf';
}

export interface ParsedRecipe {
  name: string;
  ingredients: { item: string; quantity: string }[];
  instructions: string;
  prepTime?: number;
  assemblyTime?: number;
  cost?: number;
  tags: string[];
  description?: string;
  confidence: number;
}

export interface OptimizeRequest {
  type: 'dedupe' | 'ingredients' | 'dietary' | 'cost';
  recipes: ParsedRecipe[];
  activeMenuIds?: string[];
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  context?: {
    recipes: ParsedRecipe[];
    activeMenu: string[];
  };
}

export interface ThemeRequest {
  recipes: ParsedRecipe[];
  theme: string;
}
