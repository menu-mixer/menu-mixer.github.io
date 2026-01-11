import { useCallback } from 'react';
import { useMenuStore, useRecipeStore, useUIStore } from '@/stores';
import { RecipeCard } from '@/components/recipe/RecipeCard';

export function ActiveMenuGrid() {
  const { getActiveMenu, addToActiveMenu, removeFromActiveMenu } = useMenuStore();
  const { recipes } = useRecipeStore();
  const { addToast } = useUIStore();

  const activeMenu = getActiveMenu();

  // Get recipes that are in the active menu
  const menuRecipes = activeMenu
    ? recipes.filter((r) => activeMenu.activeRecipeIds.includes(r.id))
    : [];

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const recipeId = e.dataTransfer.getData('recipe-id');
      if (recipeId && activeMenu) {
        if (!activeMenu.activeRecipeIds.includes(recipeId)) {
          addToActiveMenu(recipeId);
          addToast('success', 'Added to menu');
        }
      }
    },
    [activeMenu, addToActiveMenu, addToast]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRemove = (recipeId: string) => {
    removeFromActiveMenu(recipeId);
    addToast('success', 'Removed from menu');
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
      className="flex-1 overflow-y-auto p-4 bg-gray-50"
    >
      {menuRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-lg font-medium mb-1">Empty Menu</p>
          <p className="text-sm">Drag recipes here from the box below</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {menuRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
