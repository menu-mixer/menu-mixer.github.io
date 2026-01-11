import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ParsedRecipe } from '@/lib/ai/client';
import { Button } from '@/components/ui/Button';
import { DietaryBadge } from '@/components/ui/Badge';
import type { DietaryTag } from '@/types';

interface ImportPreviewProps {
  recipes: ParsedRecipe[];
  onImport: (recipes: ParsedRecipe[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ImportPreview({ recipes, onImport, onCancel, isLoading }: ImportPreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(recipes.map((_, i) => i)));

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const selectAll = () => setSelected(new Set(recipes.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());

  const handleImport = () => {
    const selectedRecipes = recipes.filter((_, i) => selected.has(i));
    onImport(selectedRecipes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Found {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}. Select which to import.
        </p>
        <div className="flex gap-2 text-sm">
          <button onClick={selectAll} className="text-primary-600 hover:underline">
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={selectNone} className="text-primary-600 hover:underline">
            Select none
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {recipes.map((recipe, index) => (
          <div
            key={index}
            onClick={() => toggleSelection(index)}
            className={`
              p-4 border rounded-lg cursor-pointer transition-colors
              ${selected.has(index) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  ${selected.has(index) ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}
                `}
              >
                {selected.has(index) && <Check size={14} className="text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{recipe.name}</h4>
                  <span className="text-xs text-gray-400">
                    {Math.round(recipe.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="flex gap-1 mt-1 flex-wrap">
                  {recipe.tags.map((tag) => (
                    <DietaryBadge key={tag} tag={tag as DietaryTag} size="sm" />
                  ))}
                </div>

                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {recipe.ingredients.length} ingredients
                  {recipe.prepTime && ` • ${recipe.prepTime}m prep`}
                </p>

                {recipe.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recipe.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={selected.size === 0} isLoading={isLoading}>
          Import {selected.size} Recipe{selected.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
