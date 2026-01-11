import { useMemo } from 'react';
import { useMenuStore, useRecipeStore, useUIStore } from '@/stores';
import { RecipeCard } from '@/components/recipe/RecipeCard';

export function Backlog() {
  const { getActiveMenu } = useMenuStore();
  const { recipes, deleteRecipe } = useRecipeStore();
  const { searchQuery, addToast } = useUIStore();

  const activeMenu = getActiveMenu();

  const backlogRecipes = useMemo(() => {
    if (!activeMenu) return recipes;

    const activeIds = new Set(activeMenu.activeRecipeIds);
    let filtered = recipes.filter((r) => !activeIds.has(r.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.ingredients.some((i) => i.item.toLowerCase().includes(query)) ||
          r.metadata.tags.some((t) => t.includes(query))
      );
    }

    return filtered;
  }, [activeMenu, recipes, searchQuery]);

  if (backlogRecipes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? (
          <p>No recipes match "{searchQuery}"</p>
        ) : recipes.length === 0 ? (
          <p>No recipes yet. Import some to get started!</p>
        ) : (
          <p>All recipes are in the active menu</p>
        )}
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    await deleteRecipe(id);
    addToast('success', 'Recipe deleted');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {backlogRecipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          draggable
          compact
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
