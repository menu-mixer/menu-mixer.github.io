import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { X, Clock, DollarSign } from 'lucide-react';
import type { Recipe } from '@/types';
import { DietaryBadge } from '@/components/ui/Badge';

interface RecipeNodeData {
  recipe?: Recipe;
  onRemove: () => void;
}

export const RecipeNode = memo(({ data }: NodeProps) => {
  const { recipe, onRemove } = data as unknown as RecipeNodeData;

  if (!recipe) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 w-60">
        <p className="text-gray-500 text-sm">Recipe not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-60 overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-primary-500" />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 text-sm leading-tight">{recipe.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-1 mt-1.5 flex-wrap">
          {recipe.metadata.tags.slice(0, 3).map((tag) => (
            <DietaryBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>

        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          {recipe.metadata.prepTime && (
            <div className="flex items-center gap-0.5">
              <Clock size={12} />
              <span>{recipe.metadata.prepTime}m</span>
            </div>
          )}
          {recipe.metadata.ingredientCost && (
            <div className="flex items-center gap-0.5">
              <DollarSign size={12} />
              <span>${recipe.metadata.ingredientCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary-500" />
    </div>
  );
});

RecipeNode.displayName = 'RecipeNode';
