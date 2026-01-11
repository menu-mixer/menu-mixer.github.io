import { create } from 'zustand';
import type { Recipe } from '@/types';
import { recipeDB } from '@/lib/db';

interface RecipeStore {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;

  loadRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'raw'>) => Promise<Recipe>;
  addRecipes: (recipes: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'raw'>[]) => Promise<Recipe[]>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipeById: (id: string) => Recipe | undefined;
  searchRecipes: (query: string) => Recipe[];
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,

  loadRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipes = await recipeDB.getAll();
      set({ recipes, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load recipes',
        isLoading: false,
      });
    }
  },

  addRecipe: async (recipeData) => {
    const recipe = await recipeDB.create(recipeData);
    set(state => ({ recipes: [...state.recipes, recipe] }));
    return recipe;
  },

  addRecipes: async (recipesData) => {
    const recipes = await recipeDB.bulkCreate(recipesData);
    set(state => ({ recipes: [...state.recipes, ...recipes] }));
    return recipes;
  },

  updateRecipe: async (id, updates) => {
    const updated = await recipeDB.update(id, updates);
    if (updated) {
      set(state => ({
        recipes: state.recipes.map(r => (r.id === id ? updated : r)),
      }));
    }
  },

  deleteRecipe: async (id) => {
    await recipeDB.delete(id);
    set(state => ({
      recipes: state.recipes.filter(r => r.id !== id),
    }));
  },

  getRecipeById: (id) => {
    return get().recipes.find(r => r.id === id);
  },

  searchRecipes: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().recipes.filter(
      r =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery) ||
        r.ingredients.some(i => i.item.toLowerCase().includes(lowerQuery))
    );
  },
}));
