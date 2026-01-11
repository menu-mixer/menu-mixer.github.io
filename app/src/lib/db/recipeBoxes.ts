import { v4 as uuid } from 'uuid';
import { getDB } from './schema';
import type { RecipeBox } from '@/types';

export const recipeBoxDB = {
  async getAll(): Promise<RecipeBox[]> {
    const db = await getDB();
    return db.getAll('recipeBoxes');
  },

  async getById(id: string): Promise<RecipeBox | undefined> {
    const db = await getDB();
    return db.get('recipeBoxes', id);
  },

  async create(name: string): Promise<RecipeBox> {
    const db = await getDB();
    const box: RecipeBox = {
      id: uuid(),
      name,
      recipeIds: [],
      createdAt: new Date().toISOString(),
    };

    await db.put('recipeBoxes', box);
    return box;
  },

  async update(id: string, updates: Partial<RecipeBox>): Promise<RecipeBox | undefined> {
    const db = await getDB();
    const existing = await db.get('recipeBoxes', id);
    if (!existing) return undefined;

    const updated: RecipeBox = {
      ...existing,
      ...updates,
      id,
    };

    await db.put('recipeBoxes', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('recipeBoxes', id);
  },

  async addRecipe(boxId: string, recipeId: string): Promise<RecipeBox | undefined> {
    const db = await getDB();
    const box = await db.get('recipeBoxes', boxId);
    if (!box) return undefined;

    if (box.recipeIds.includes(recipeId)) return box;

    const updated: RecipeBox = {
      ...box,
      recipeIds: [...box.recipeIds, recipeId],
    };

    await db.put('recipeBoxes', updated);
    return updated;
  },

  async removeRecipe(boxId: string, recipeId: string): Promise<RecipeBox | undefined> {
    const db = await getDB();
    const box = await db.get('recipeBoxes', boxId);
    if (!box) return undefined;

    const updated: RecipeBox = {
      ...box,
      recipeIds: box.recipeIds.filter(id => id !== recipeId),
    };

    await db.put('recipeBoxes', updated);
    return updated;
  },
};
