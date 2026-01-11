import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { RecipeRecord, RecipeBox, Menu } from '@/types';

interface MenuMixerDB extends DBSchema {
  recipes: {
    key: string;
    value: RecipeRecord;
    indexes: { 'by-updated': string };
  };
  recipeBoxes: {
    key: string;
    value: RecipeBox;
  };
  menus: {
    key: string;
    value: Menu;
  };
  settings: {
    key: string;
    value: { theme?: string; activeMenuId?: string };
  };
}

let dbPromise: Promise<IDBPDatabase<MenuMixerDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<MenuMixerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MenuMixerDB>('menu-mixer', 1, {
      upgrade(db) {
        const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' });
        recipeStore.createIndex('by-updated', 'updatedAt');

        db.createObjectStore('recipeBoxes', { keyPath: 'id' });
        db.createObjectStore('menus', { keyPath: 'id' });
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}
