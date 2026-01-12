import { useState } from 'react';
import { Clock, DollarSign, ChevronDown, ChevronUp, Trash2, Edit2, Plus, X } from 'lucide-react';
import type { RecipeDisplayData } from '@/types';
import { DietaryBadge } from '@/components/ui/Badge';

interface RecipeCardProps {
  recipe: RecipeDisplayData;
  onEdit?: (recipe: RecipeDisplayData) => void;
  onDelete?: (id: string) => void;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClick?: () => void;
  draggable?: boolean;
  isInMenu?: boolean;
}

export function RecipeCard({
  recipe,
  onEdit,
  onDelete,
  onAdd,
  onRemove,
  onClick,
  draggable = false,
  isInMenu = false,
}: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (isInMenu) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('recipe-id', recipe.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const cardClasses = `
    bg-white border rounded-lg overflow-hidden transition-all
    ${isInMenu
      ? 'border-gray-100 opacity-50 cursor-default'
      : 'border-gray-200 hover:shadow-md cursor-pointer'}
    ${isExpanded ? 'shadow-md' : ''}
  `;

  return (
    <div
      className={cardClasses}
      draggable={draggable && !isInMenu}
      onDragStart={handleDragStart}
    >
      {/* Collapsed Header - Always Visible */}
      <div className="p-3 group" onClick={handleClick}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${isInMenu ? 'text-gray-500' : 'text-gray-900'}`}>
              {recipe.name}
            </h3>

            {/* Tags */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {recipe.metadata.tags.slice(0, 3).map((tag) => (
                <DietaryBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>

            {/* Compact Metrics */}
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              {recipe.metadata.prepTime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {recipe.metadata.prepTime}m
                </span>
              )}
              {recipe.metadata.ingredientCost && (
                <span className="flex items-center gap-1">
                  <DollarSign size={12} />
                  ${recipe.metadata.ingredientCost.toFixed(2)}
                </span>
              )}
              {recipe.ingredients.length > 0 && (
                <span>{recipe.ingredients.length} ingredients</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(recipe);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
            )}
            {onAdd && !isInMenu && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(recipe.id);
                }}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Add to menu"
              >
                <Plus size={16} />
              </button>
            )}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(recipe.id);
                }}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                title="Remove from menu"
              >
                <X size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recipe.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                title="Delete recipe"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-gray-600">{recipe.description}</p>
          )}

          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Ingredients
              </h4>
              <ul className="text-sm text-gray-600 space-y-0.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{ing.raw}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Instructions
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{recipe.instructions}</p>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Notes
              </h4>
              <p className="text-sm text-gray-500 italic">{recipe.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
