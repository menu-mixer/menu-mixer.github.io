import { useState, useRef, useCallback, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
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
  const [recipeBoxHeight, setRecipeBoxHeight] = useState(288); // Default 18rem
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    // Clamp between 150px and 500px
    setRecipeBoxHeight(Math.min(500, Math.max(150, newHeight)));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Attach global mouse listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
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

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-2 bg-gray-100 border-y border-gray-200 cursor-row-resize hover:bg-gray-200 flex items-center justify-center group"
      >
        <GripHorizontal size={16} className="text-gray-400 group-hover:text-gray-600" />
      </div>

      {/* Recipe Box */}
      <div style={{ height: recipeBoxHeight }} className="min-h-0 flex-shrink-0">
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
