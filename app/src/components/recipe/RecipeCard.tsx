import { useState } from 'react';
import { Clock, DollarSign, ChevronDown, ChevronUp, Trash2, Edit2 } from 'lucide-react';
import type { Recipe } from '@/types';
import { DietaryBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface RecipeCardProps {
  recipe: Recipe;
  isExpanded?: boolean;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  draggable?: boolean;
  compact?: boolean;
}

export function RecipeCard({
  recipe,
  isExpanded: initialExpanded = false,
  onEdit,
  onDelete,
  onClick,
  draggable = false,
  compact = false,
}: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('recipe-id', recipe.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  if (compact) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
        draggable={draggable}
        onDragStart={handleDragStart}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 truncate">{recipe.name}</h3>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(recipe.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {recipe.metadata.tags.slice(0, 3).map((tag) => (
            <DietaryBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {recipe.metadata.tags.map((tag) => (
            <DietaryBadge key={tag} tag={tag} />
          ))}
        </div>

        {/* Metrics */}
        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          {recipe.metadata.prepTime && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{recipe.metadata.prepTime}m prep</span>
            </div>
          )}
          {recipe.metadata.ingredientCost && (
            <div className="flex items-center gap-1">
              <DollarSign size={14} />
              <span>${recipe.metadata.ingredientCost.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Ingredients */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Ingredients</h4>
            <ul className="text-sm text-gray-600 space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>• {ing.raw}</li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Instructions</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{recipe.instructions}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onEdit && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(recipe)}>
                <Edit2 size={14} className="mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(recipe.id)}>
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
