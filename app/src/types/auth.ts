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
  starterPackId?: string | null;
}

export interface UsageStats {
  tier: Tier;
  monthlyAiCalls: number;
  monthlyLimit: number;
  remainingCalls: number;
  resetAt: string;
}

// Starter Pack types
export interface StarterRecipe {
  name: string;
  metadata: {
    prepTime?: number;
    assemblyTime?: number;
    ingredientCost?: number;
    menuPrice?: number;
    tags: string[];
  };
  ingredients: { raw: string; item: string; quantity?: string }[];
  description: string;
  instructions: string;
  notes?: string;
}

export interface StarterMenu {
  name: string;
  recipeNames: string[]; // References to recipes by name
}

export interface StarterBox {
  name: string;
  recipeNames: string[]; // References to recipes by name
}

export interface StarterPack {
  id: string;
  name: string;
  description?: string;
  recipes: StarterRecipe[];
  boxes: StarterBox[];
  menus: StarterMenu[];
}
