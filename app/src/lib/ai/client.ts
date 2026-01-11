import type { AuthState, RecipeDisplayData } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://menu-mixer-api.workers.dev';

class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

class AuthExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'AuthExpiredError';
  }
}

class RateLimitError extends Error {
  remaining: number;
  resetAt: string;

  constructor(data: { remaining: number; resetAt: string }) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.remaining = data.remaining;
    this.resetAt = data.resetAt;
  }
}

// Auth storage
const AUTH_STORAGE_KEY = 'menu-mixer-auth';

export function loadAuth(): AuthState | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function persistAuth(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// API methods
export async function validateInviteCode(code: string): Promise<AuthState> {
  const response = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode: code }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Invalid invite code');
  }

  const authState: AuthState = {
    isAuthenticated: true,
    token: data.token,
    tier: data.tier,
    limits: data.limits,
    starterPackId: data.starterPackId || null,
  };

  persistAuth(authState);
  return authState;
}

export async function refreshToken(): Promise<AuthState> {
  const auth = loadAuth();
  if (!auth?.token) throw new AuthRequiredError();

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (response.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to refresh token');
  }

  const authState: AuthState = {
    isAuthenticated: true,
    token: data.token,
    tier: data.tier,
    limits: data.limits,
  };

  persistAuth(authState);
  return authState;
}

export async function getUsage() {
  const auth = loadAuth();
  if (!auth?.token) throw new AuthRequiredError();

  const response = await fetch(`${API_BASE}/auth/usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (response.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }

  return response.json();
}

// AI methods
async function aiRequest<T>(endpoint: string, body: unknown): Promise<T & { remaining: number }> {
  const auth = loadAuth();
  if (!auth?.token) throw new AuthRequiredError();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }

  if (response.status === 429) {
    const data = await response.json();
    throw new RateLimitError(data);
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'AI request failed');
  }

  return response.json();
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

export async function parseRecipe(
  content: string,
  contentType: 'text' | 'image' | 'pdf'
): Promise<{ recipes: ParsedRecipe[]; remaining: number }> {
  return aiRequest('/ai/parse', { content, contentType });
}

export async function optimizeRecipes(
  type: 'dedupe' | 'ingredients' | 'dietary' | 'cost',
  recipes: RecipeDisplayData[]
): Promise<{ result: unknown; remaining: number }> {
  const simplifiedRecipes = recipes.map(r => ({
    name: r.name,
    ingredients: r.ingredients,
    tags: r.metadata.tags,
    cost: r.metadata.ingredientCost,
    description: r.description,
  }));
  return aiRequest('/ai/optimize', { type, recipes: simplifiedRecipes });
}

export async function themeRecipes(
  recipes: RecipeDisplayData[],
  theme: string
): Promise<{ themedRecipes: { original: string; themed: { name: string; description: string } }[]; remaining: number }> {
  const simplifiedRecipes = recipes.map(r => ({
    name: r.name,
    description: r.description,
  }));
  return aiRequest('/ai/theme', { recipes: simplifiedRecipes, theme });
}

export async function chat(
  messages: { role: string; content: string }[],
  context?: { recipes: RecipeDisplayData[]; activeMenu: string[] }
): Promise<{ response: string; remaining: number }> {
  const simplifiedContext = context
    ? {
        recipes: context.recipes.map(r => ({
          name: r.name,
          ingredients: r.ingredients,
          tags: r.metadata.tags,
          description: r.description,
        })),
        activeMenu: context.activeMenu,
      }
    : undefined;
  return aiRequest('/ai/chat', { messages, context: simplifiedContext });
}

export { AuthRequiredError, AuthExpiredError, RateLimitError };
