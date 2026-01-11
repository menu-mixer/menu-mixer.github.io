import { v4 as uuid } from 'uuid';
import { getDB } from './schema';
import type { Menu, MenuLayout } from '@/types';

export const menuDB = {
  async getAll(): Promise<Menu[]> {
    const db = await getDB();
    return db.getAll('menus');
  },

  async getById(id: string): Promise<Menu | undefined> {
    const db = await getDB();
    return db.get('menus', id);
  },

  async create(name: string): Promise<Menu> {
    const db = await getDB();
    const now = new Date().toISOString();
    const menu: Menu = {
      id: uuid(),
      name,
      activeRecipeIds: [],
      backlogRecipeIds: [],
      layout: [],
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

  async addToActive(menuId: string, recipeId: string, position?: { x: number; y: number }): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    if (menu.activeRecipeIds.includes(recipeId)) return menu;

    const newLayout: MenuLayout = {
      id: recipeId,
      x: position?.x ?? (menu.layout.length % 4) * 280,
      y: position?.y ?? Math.floor(menu.layout.length / 4) * 200,
    };

    const updated: Menu = {
      ...menu,
      activeRecipeIds: [...menu.activeRecipeIds, recipeId],
      backlogRecipeIds: menu.backlogRecipeIds.filter(id => id !== recipeId),
      layout: [...menu.layout, newLayout],
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async removeFromActive(menuId: string, recipeId: string): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const updated: Menu = {
      ...menu,
      activeRecipeIds: menu.activeRecipeIds.filter(id => id !== recipeId),
      backlogRecipeIds: [...menu.backlogRecipeIds, recipeId],
      layout: menu.layout.filter(l => l.id !== recipeId),
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },

  async updateLayout(menuId: string, layout: MenuLayout[]): Promise<Menu | undefined> {
    const db = await getDB();
    const menu = await db.get('menus', menuId);
    if (!menu) return undefined;

    const updated: Menu = {
      ...menu,
      layout,
      updatedAt: new Date().toISOString(),
    };

    await db.put('menus', updated);
    return updated;
  },
};
