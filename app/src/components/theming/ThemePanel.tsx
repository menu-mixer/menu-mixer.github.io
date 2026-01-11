import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { themeRecipes } from '@/lib/ai/client';
import { useRecipeStore, useMenuStore, useAuthStore, useUIStore } from '@/stores';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const PRESET_THEMES = [
  { name: 'Halloween', description: 'Spooky, fun names with dark/autumn colors' },
  { name: 'Christmas', description: 'Festive, warm, traditional holiday naming' },
  { name: 'Summer', description: 'Light, fresh, tropical vibes' },
  { name: 'Valentine\'s', description: 'Romantic, heart-themed, pink and red' },
  { name: 'Minimalist', description: 'Simple, elegant, ingredient-focused' },
];

interface ThemePanelProps {
  onClose: () => void;
}

export function ThemePanel({ onClose }: ThemePanelProps) {
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ original: string; themed: { name: string; description: string } }[]>([]);

  const { recipes, updateRecipe } = useRecipeStore();
  const { getActiveMenu } = useMenuStore();
  const { updateLimits } = useAuthStore();
  const { addToast } = useUIStore();

  const runTheming = async () => {
    const theme = customTheme || selectedTheme;
    if (!theme) {
      addToast('info', 'Please select or enter a theme');
      return;
    }

    const activeMenu = getActiveMenu();
    const menuItems = activeMenu?.items || [];
    // Use menu items directly (they have full recipe data) or fall back to all recipes
    const recipesToTheme = menuItems.length > 0 ? menuItems : recipes;

    if (recipesToTheme.length === 0) {
      addToast('info', 'No recipes to theme');
      return;
    }

    setIsLoading(true);

    try {
      const response = await themeRecipes(recipesToTheme, theme);
      updateLimits({ remainingAiCalls: response.remaining });
      setResults(response.themedRecipes);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Theming failed');
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = async (index: number) => {
    const result = results[index];
    const recipe = recipes.find((r) => r.name === result.original);
    if (recipe) {
      await updateRecipe(recipe.id, {
        name: result.themed.name,
        description: result.themed.description,
      });
      addToast('success', `Updated "${result.original}" to "${result.themed.name}"`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary-500" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Re-Theme Menu</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {results.length === 0 ? (
          <>
            <p className="text-gray-600 text-sm mb-4">
              Transform your recipe names and descriptions to match a theme.
            </p>

            {/* Preset themes */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => {
                    setSelectedTheme(theme.name);
                    setCustomTheme('');
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedTheme === theme.name
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{theme.name}</p>
                  <p className="text-xs text-gray-500">{theme.description}</p>
                </button>
              ))}
            </div>

            {/* Custom theme */}
            <div className="mb-4">
              <Input
                label="Or enter a custom theme"
                value={customTheme}
                onChange={(e) => {
                  setCustomTheme(e.target.value);
                  setSelectedTheme('');
                }}
                placeholder="e.g., Retro Diner, French Bistro, Space Adventure"
              />
            </div>

            <Button
              onClick={runTheming}
              className="w-full"
              isLoading={isLoading}
              disabled={!selectedTheme && !customTheme}
            >
              Generate Themed Names
            </Button>
          </>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-4">
              Preview themed names. Click "Apply" to update each recipe.
            </p>

            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 line-through">{result.original}</p>
                      <p className="font-medium text-gray-900">{result.themed.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{result.themed.description}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => applyTheme(index)}>
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              onClick={() => setResults([])}
              className="w-full mt-4"
            >
              Back to Theme Selection
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
