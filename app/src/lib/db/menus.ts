import { v4 as uuid } from 'uuid';
import { getDB } from './schema';
import type { Menu, MenuItem, Recipe } from '@/types';

export const menuDB = {
  async getAll(): Promise<Menu[]> {
    const db = await getDB();
    const menus = await db.getAll('menus');
    // Migrate old menus that don't have items array
    return menus.map(menu => ({
      ...menu,
      items: menu.items || [],
    }));
  },

  async getById(id: string): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', id);
    if (!menu) return undefined;
    // Migrate old menu format
    return {
      ...menu,
      items: menu.items || [],
    };
  },

  async create(name: string): Promise<Menu> {
    const db = await getDB();
    const now = new Date().toISOString();
    const menu: Menu = {
      id: uuid(),
      name,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.put('menus', menu);
    return menu;
  },

  async update(id: string, updates: Partial<Menu>): Promise<Menu | undefined> {
    const db = await getDB();
    const existing = await db.get('menus', id);
    if (!existing) return undefined;

    const updated: Menu = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('menus', id);
  },

  async addItem(menuId: string, recipe: Recipe): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const items = menu.items || [];
    // Check if already in menu by sourceRecipeId
    if (items.some(item => item.sourceRecipeId === recipe.id)) {
      return { ...menu, items };
    }

    const menuItem: MenuItem = {
      id: uuid(),
      sourceRecipeId: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      notes: recipe.notes,
      ingredients: [...recipe.ingredients],
      metadata: { ...recipe.metadata },
      addedAt: new Date().toISOString(),
    };

    const updated: Menu = {
      ...menu,
      items: [...items, menuItem],
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async removeItem(menuId: string, itemId: string): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const items = menu.items || [];
    const updated: Menu = {
      ...menu,
      items: items.filter(item => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async updateItem(menuId: string, itemId: string, updates: Partial<MenuItem>): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const items = menu.items || [];
    const updated: Menu = {
      ...menu,
      items: items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async clearItems(menuId: string): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const updated: Menu = {
      ...menu,
      items: [],
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },
};
