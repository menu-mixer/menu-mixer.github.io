export type DietaryTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'nut-free' | 'dairy-free';

export interface RecipeMetadata {
  prepTime?: number;
  assemblyTime?: number;
  ingredientCost?: number;
  menuPrice?: number;
  tags: DietaryTag[];
}

export interface Ingredient {
  raw: string;
  quantity?: string;
  item: string;
}

export interface RecipeRecord {
  id: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  metadata: RecipeMetadata;
  ingredients: Ingredient[];
  description: string;
  instructions: string;
  notes?: string;
  raw: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeBox {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: string;
}

export interface MenuLayout {
  id: string;
  x: number;
  y: number;
}

export interface Menu {
  id: string;
  name: string;
  activeRecipeIds: string[];
  backlogRecipeIds: string[];
  layout: MenuLayout[];
  createdAt: string;
  updatedAt: string;
}

export const DIETARY_TAGS: Record<DietaryTag, { label: string; color: string; bgColor: string }> = {
  vegan: { label: 'Vegan', color: 'text-green-700', bgColor: 'bg-green-100' },
  vegetarian: { label: 'Veg', color: 'text-lime-700', bgColor: 'bg-lime-100' },
  'gluten-free': { label: 'GF', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'nut-free': { label: 'NF', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'dairy-free': { label: 'DF', color: 'text-blue-700', bgColor: 'bg-blue-100' },
};
