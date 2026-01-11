import { useState } from 'react';
import { MenuSelector } from './MenuSelector';
import { ActiveMenuGrid } from './ActiveMenuGrid';
import { MenuMutateRibbon } from './MenuMutateRibbon';
import { RecipeBox } from '@/components/recipe/RecipeBox';
import { ImportPreview } from '@/components/import/ImportPreview';
import { Modal } from '@/components/ui/Modal';
import { useRecipeStore, useUIStore } from '@/stores';
import type { ParsedRecipe } from '@/lib/ai/client';

export function MenuArea() {
  const { addRecipes } = useRecipeStore();
  const { addToast } = useUIStore();

  const [pendingImport, setPendingImport] = useState<ParsedRecipe[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleRecipesParsed = (recipes: ParsedRecipe[]) => {
    setPendingImport(recipes);
  };

  const handleImportConfirm = async (recipes: ParsedRecipe[]) => {
    setIsImporting(true);
    try {
      const created = await addRecipes(
        recipes.map((r) => ({
          name: r.name,
          description: r.description || '',
          instructions: r.instructions,
          ingredients: r.ingredients.map((i) => ({
            raw: i.quantity ? `${i.quantity} ${i.item}`.trim() : i.item,
            quantity: i.quantity || '',
            item: i.item,
          })),
          metadata: {
            tags: r.tags.filter((t): t is any =>
              ['vegan', 'vegetarian', 'gluten-free', 'nut-free', 'dairy-free'].includes(t)
            ),
            prepTime: r.prepTime,
            assemblyTime: r.assemblyTime,
            ingredientCost: r.cost,
          },
        }))
      );
      addToast('success', `Imported ${created.length} recipe(s)`);
      setPendingImport([]);
    } catch (err) {
      addToast('error', 'Failed to import recipes');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Menu Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200">
        <MenuSelector />
      </div>

      {/* Active Menu Grid */}
      <div className="flex-1 min-h-0">
        <ActiveMenuGrid />
      </div>

      {/* Menu Mutate Ribbon */}
      <MenuMutateRibbon />

      {/* Recipe Box */}
      <div className="h-72 min-h-0">
        <RecipeBox onRecipesParsed={handleRecipesParsed} />
      </div>

      {/* Import Preview Modal */}
      <Modal
        isOpen={pendingImport.length > 0}
        onClose={() => setPendingImport([])}
        title="Import Recipes"
        size="lg"
      >
        <ImportPreview
          recipes={pendingImport}
          onImport={handleImportConfirm}
          onCancel={() => setPendingImport([])}
          isLoading={isImporting}
        />
      </Modal>
    </div>
  );
}
