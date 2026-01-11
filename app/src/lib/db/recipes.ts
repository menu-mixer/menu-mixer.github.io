import { v4 as uuid } from 'uuid';
import { getDB } from './schema';
import type { RecipeRecord, Recipe } from '@/types';
import { parseRecipeMarkdown, serializeRecipe } from '@/lib/parser/markdown';

export const recipeDB = {
  async getAll(): Promise<Recipe[]> {
    const db = await getDB();
    const records = await db.getAll('recipes');
    return records.map(r => parseRecipeMarkdown(r));
  },

  async getById(id: string): Promise<Recipe | undefined> {
    const db = await getDB();
    const record = await db.get('recipes', id);
    if (!record) return undefined;
    return parseRecipeMarkdown(record);
  },

  async create(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'raw'>): Promise<Recipe> {
    const db = await getDB();
    const now = new Date().toISOString();
    const id = uuid();

    const fullRecipe: Recipe = {
      ...recipe,
      id,
      raw: '',
      createdAt: now,
      updatedAt: now,
    };

    const markdown = serializeRecipe(fullRecipe);
    fullRecipe.raw = markdown;

    const record: RecipeRecord = {
      id,
      markdown,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('recipes', record);
    return fullRecipe;
  },

  async update(id: string, updates: Partial<Recipe>): Promise<Recipe | undefined> {
    const db = await getDB();
    const existing = await db.get('recipes', id);
    if (!existing) return undefined;

    const existingRecipe = parseRecipeMarkdown(existing);
    const updatedRecipe: Recipe = {
      ...existingRecipe,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    const markdown = serializeRecipe(updatedRecipe);
    updatedRecipe.raw = markdown;

    const record: RecipeRecord = {
      id,
      markdown,
      createdAt: existing.createdAt,
      updatedAt: updatedRecipe.updatedAt,
    };

    await db.put('recipes', record);
    return updatedRecipe;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('recipes', id);
  },

  async bulkCreate(recipes: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'raw'>[]): Promise<Recipe[]> {
    const db = await getDB();
    const tx = db.transaction('recipes', 'readwrite');
    const now = new Date().toISOString();

    const createdRecipes: Recipe[] = [];

    for (const recipe of recipes) {
      const id = uuid();
      const fullRecipe: Recipe = {
        ...recipe,
        id,
        raw: '',
        createdAt: now,
        updatedAt: now,
      };

      const markdown = serializeRecipe(fullRecipe);
      fullRecipe.raw = markdown;

      const record: RecipeRecord = {
        id,
        markdown,
        createdAt: now,
        updatedAt: now,
      };

      tx.store.put(record);
      createdRecipes.push(fullRecipe);
    }

    await tx.done;
    return createdRecipes;
  },

  async search(query: string): Promise<Recipe[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return all.filter(
      r =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery) ||
        r.ingredients.some(i => i.item.toLowerCase().includes(lowerQuery))
    );
  },
};
