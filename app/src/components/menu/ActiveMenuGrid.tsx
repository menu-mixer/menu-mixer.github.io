import { useCallback } from 'react';
import { useMenuStore, useRecipeStore, useUIStore } from '@/stores';
import type { MenuItem, RecipeDisplayData } from '@/types/recipe';
import { RecipeCard } from '@/components/recipe/RecipeCard';

export function ActiveMenuGrid() {
  const { getActiveMenu, addToActiveMenu, removeFromActiveMenu, updateMenuItem } = useMenuStore();
  const { recipes } = useRecipeStore();
  const { addToast, openModal } = useUIStore();

  const activeMenu = getActiveMenu();
  const menuItems = activeMenu?.items || [];

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const recipeId = e.dataTransfer.getData('recipe-id');
      if (recipeId && activeMenu) {
        // Check if recipe is already in menu by source ID
        const alreadyInMenu = menuItems.some(item => item.sourceRecipeId === recipeId);
        if (!alreadyInMenu) {
          const recipe = recipes.find(r => r.id === recipeId);
          if (recipe) {
            addToActiveMenu(recipe);
            addToast('success', 'Added to menu');
          }
        }
      }
    },
    [activeMenu, menuItems, recipes, addToActiveMenu, addToast]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRemove = (itemId: string) => {
    removeFromActiveMenu(itemId);
    addToast('success', 'Removed from menu');
  };

  const handleEdit = (item: RecipeDisplayData) => {
    openModal('recipe-edit', {
      ...item,
      isMenuItem: true,
      onSaveCallback: async (updates: Partial<MenuItem>) => {
        await updateMenuItem(item.id, updates);
        addToast('success', 'Menu item updated');
      }
    });
  };

  if (!activeMenu) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select or create a menu to get started</p>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`flex-1 overflow-y-auto p-4 bg-gray-50 ${menuItems.length === 0 ? 'flex' : ''}`}
    >
      {menuItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-lg font-medium mb-1">Empty Menu</p>
          <p className="text-sm">Drag recipes here from the box below</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {menuItems.map((item) => (
            <RecipeCard
              key={item.id}
              recipe={item}
              onRemove={handleRemove}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
