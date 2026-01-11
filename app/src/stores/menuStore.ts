import { create } from 'zustand';
import type { Menu, MenuLayout, RecipeBox } from '@/types';
import { menuDB, recipeBoxDB } from '@/lib/db';

interface MenuStore {
  menus: Menu[];
  activeMenuId: string | null;
  recipeBoxes: RecipeBox[];
  isLoading: boolean;

  loadMenus: () => Promise<void>;
  loadRecipeBoxes: () => Promise<void>;

  // Menu operations
  createMenu: (name: string) => Promise<Menu>;
  deleteMenu: (id: string) => Promise<void>;
  setActiveMenu: (id: string) => void;
  getActiveMenu: () => Menu | undefined;

  // Active menu recipe operations
  addToActiveMenu: (recipeId: string, position?: { x: number; y: number }) => Promise<void>;
  removeFromActiveMenu: (recipeId: string) => Promise<void>;
  updateLayout: (layout: MenuLayout[]) => Promise<void>;

  // Recipe box operations
  createRecipeBox: (name: string) => Promise<RecipeBox>;
  deleteRecipeBox: (id: string) => Promise<void>;
  addToRecipeBox: (boxId: string, recipeId: string) => Promise<void>;
  removeFromRecipeBox: (boxId: string, recipeId: string) => Promise<void>;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menus: [],
  activeMenuId: null,
  recipeBoxes: [],
  isLoading: false,

  loadMenus: async () => {
    set({ isLoading: true });
    const menus = await menuDB.getAll();

    // Create default menu if none exist
    if (menus.length === 0) {
      const defaultMenu = await menuDB.create('My Menu');
      set({ menus: [defaultMenu], activeMenuId: defaultMenu.id, isLoading: false });
    } else {
      // Restore active menu from localStorage or use first menu
      const storedActiveId = localStorage.getItem('menu-mixer-active-menu');
      const activeId = storedActiveId && menus.some(m => m.id === storedActiveId)
        ? storedActiveId
        : menus[0].id;
      set({ menus, activeMenuId: activeId, isLoading: false });
    }
  },

  loadRecipeBoxes: async () => {
    const recipeBoxes = await recipeBoxDB.getAll();
    set({ recipeBoxes });
  },

  createMenu: async (name) => {
    const menu = await menuDB.create(name);
    set(state => ({ menus: [...state.menus, menu] }));
    return menu;
  },

  deleteMenu: async (id) => {
    await menuDB.delete(id);
    set(state => {
      const newMenus = state.menus.filter(m => m.id !== id);
      const newActiveId = state.activeMenuId === id
        ? newMenus[0]?.id || null
        : state.activeMenuId;
      return { menus: newMenus, activeMenuId: newActiveId };
    });
  },

  setActiveMenu: (id) => {
    localStorage.setItem('menu-mixer-active-menu', id);
    set({ activeMenuId: id });
  },

  getActiveMenu: () => {
    const { menus, activeMenuId } = get();
    return menus.find(m => m.id === activeMenuId);
  },

  addToActiveMenu: async (recipeId, position) => {
    const { activeMenuId } = get();
    if (!activeMenuId) return;

    const updated = await menuDB.addToActive(activeMenuId, recipeId, position);
    if (updated) {
      set(state => ({
        menus: state.menus.map(m => (m.id === activeMenuId ? updated : m)),
      }));
    }
  },

  removeFromActiveMenu: async (recipeId) => {
    const { activeMenuId } = get();
    if (!activeMenuId) return;

    const updated = await menuDB.removeFromActive(activeMenuId, recipeId);
    if (updated) {
      set(state => ({
        menus: state.menus.map(m => (m.id === activeMenuId ? updated : m)),
      }));
    }
  },

  updateLayout: async (layout) => {
    const { activeMenuId } = get();
    if (!activeMenuId) return;

    const updated = await menuDB.updateLayout(activeMenuId, layout);
    if (updated) {
      set(state => ({
        menus: state.menus.map(m => (m.id === activeMenuId ? updated : m)),
      }));
    }
  },

  createRecipeBox: async (name) => {
    const box = await recipeBoxDB.create(name);
    set(state => ({ recipeBoxes: [...state.recipeBoxes, box] }));
    return box;
  },

  deleteRecipeBox: async (id) => {
    await recipeBoxDB.delete(id);
    set(state => ({
      recipeBoxes: state.recipeBoxes.filter(b => b.id !== id),
    }));
  },

  addToRecipeBox: async (boxId, recipeId) => {
    const updated = await recipeBoxDB.addRecipe(boxId, recipeId);
    if (updated) {
      set(state => ({
        recipeBoxes: state.recipeBoxes.map(b => (b.id === boxId ? updated : b)),
      }));
    }
  },

  removeFromRecipeBox: async (boxId, recipeId) => {
    const updated = await recipeBoxDB.removeRecipe(boxId, recipeId);
    if (updated) {
      set(state => ({
        recipeBoxes: state.recipeBoxes.map(b => (b.id === boxId ? updated : b)),
      }));
    }
  },
}));
