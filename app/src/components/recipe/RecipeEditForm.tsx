import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Recipe, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RecipeEditFormProps {
  recipe?: Recipe;
  sourceRecipeId?: string | null;
  onSave: (data: Partial<Recipe>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RecipeEditForm({ recipe, sourceRecipeId, onSave, onCancel, isLoading }: RecipeEditFormProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const [ingredients, setIngredients] = useState<string[]>(
    recipe?.ingredients.map((i) => i.raw) || ['']
  );
  const [tags, setTags] = useState<DietaryTag[]>(recipe?.metadata.tags || []);
  const [prepTime, setPrepTime] = useState(recipe?.metadata.prepTime?.toString() || '');
  const [cost, setCost] = useState(recipe?.metadata.ingredientCost?.toString() || '');
  const [price, setPrice] = useState(recipe?.metadata.menuPrice?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      name,
      description,
      instructions,
      ingredients: ingredients.filter(Boolean).map((raw) => ({ raw, item: raw })),
      metadata: {
        tags,
        prepTime: prepTime ? parseInt(prepTime, 10) : undefined,
        ingredientCost: cost ? parseFloat(cost) : undefined,
        menuPrice: price ? parseFloat(price) : undefined,
      },
    });
  };

  const addIngredient = () => setIngredients([...ingredients, '']);

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: DietaryTag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <>
      {sourceRecipeId && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Note:</strong> This is a menu item. Changes here will only affect this menu and won't update the original recipe.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Recipe Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Customer-facing menu description"
        />
      </div>

      {/* Dietary Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIETARY_TAGS) as DietaryTag[]).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                tags.includes(tag)
                  ? `${DIETARY_TAGS[tag].bgColor} ${DIETARY_TAGS[tag].color}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {DIETARY_TAGS[tag].label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Prep Time (min)"
          type="number"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
        />
        <Input
          label="Cost ($)"
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <Input
          label="Price ($)"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      {/* Ingredients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={ing}
                onChange={(e) => updateIngredient(index, e.target.value)}
                placeholder="e.g., 2 cups flour"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          <Plus size={16} /> Add ingredient
        </button>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Step-by-step preparation instructions"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {recipe ? 'Save Changes' : 'Add Recipe'}
        </Button>
      </div>
    </form>
    </>
  );
}
