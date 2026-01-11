import { create } from 'zustand';

type ModalType = 'invite-code' | 'recipe-edit' | 'recipe-import' | 'optimization' | 'theme' | 'chat' | 'settings' | null;

const ONBOARDING_COMPLETE_KEY = 'menu-mixer-onboarding-complete';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIStore {
  // Modals
  activeModal: ModalType;
  modalData: unknown;
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;
  hasCompletedOnboarding: () => boolean;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Selected recipe for editing
  selectedRecipeId: string | null;
  setSelectedRecipe: (id: string | null) => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;

  // Import preview
  importPreviewRecipes: unknown[];
  setImportPreviewRecipes: (recipes: unknown[]) => void;
  clearImportPreview: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Drag state
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (type, data) => set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Onboarding
  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  completeOnboarding: () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    set({ showOnboarding: false });
  },
  hasCompletedOnboarding: () => {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  selectedRecipeId: null,
  setSelectedRecipe: (id) => set({ selectedRecipeId: id }),

  toasts: [],
  addToast: (type, message) => {
    const id = `toast-${++toastCounter}`;
    set(state => ({ toasts: [...state.toasts, { id, type, message }] }));
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  importPreviewRecipes: [],
  setImportPreviewRecipes: (recipes) => set({ importPreviewRecipes: recipes }),
  clearImportPreview: () => set({ importPreviewRecipes: [] }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),
}));
