import { useMemo } from 'react';
import {
  ChefHat,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Package,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { useMenuStore, useRecipeStore, useAuthStore, useUIStore } from '@/stores';
import type { DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/types';

export function Sidebar() {
  const { logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, openModal } = useUIStore();
  const { recipes } = useRecipeStore();
  const { getActiveMenu } = useMenuStore();

  const activeMenu = getActiveMenu();

  const stats = useMemo(() => {
    const menuRecipes = activeMenu
      ? recipes.filter((r) => activeMenu.activeRecipeIds.includes(r.id))
      : [];

    const totalCost = menuRecipes.reduce(
      (sum, r) => sum + (r.metadata.ingredientCost || 0),
      0
    );

    const ingredients = new Map<string, number>();
    menuRecipes.forEach((r) => {
      r.ingredients.forEach((ing) => {
        const key = ing.item.toLowerCase();
        ingredients.set(key, (ingredients.get(key) || 0) + 1);
      });
    });

    const dietaryCounts: Record<DietaryTag, number> = {
      vegan: 0,
      vegetarian: 0,
      'gluten-free': 0,
      'nut-free': 0,
      'dairy-free': 0,
    };

    menuRecipes.forEach((r) => {
      r.metadata.tags.forEach((tag) => {
        if (tag in dietaryCounts) {
          dietaryCounts[tag]++;
        }
      });
    });

    return {
      recipeCount: menuRecipes.length,
      totalCost,
      ingredientCount: ingredients.size,
      ingredients: Array.from(ingredients.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
      dietaryCounts,
    };
  }, [activeMenu, recipes]);

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button onClick={toggleSidebar} className="p-2 text-gray-500 hover:text-gray-700">
          <ChevronRight size={20} />
        </button>
        <div className="mt-4">
          <ChefHat size={24} className="text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat size={24} className="text-primary-600" />
          <span className="font-semibold text-gray-900">Menu Mixer</span>
        </div>
        <button onClick={toggleSidebar} className="p-1 text-gray-400 hover:text-gray-600">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Stats */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Menu Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<ChefHat size={14} />} label="Recipes" value={stats.recipeCount} />
            <StatCard icon={<Package size={14} />} label="Ingredients" value={stats.ingredientCount} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <DollarSign size={14} />
              <span>Total Cost</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">${stats.totalCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Dietary Coverage */}
        {stats.recipeCount > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <PieChart size={12} />
              Dietary Coverage
            </h3>
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
              {(Object.keys(DIETARY_TAGS) as DietaryTag[]).map((tag) => {
                const count = stats.dietaryCounts[tag];
                const percent = stats.recipeCount > 0 ? (count / stats.recipeCount) * 100 : 0;
                return (
                  <div key={tag} className="flex items-center gap-2">
                    <span className={`text-xs w-16 truncate ${DIETARY_TAGS[tag].color}`}>
                      {DIETARY_TAGS[tag].label}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: getTagColor(tag) }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Ingredients */}
        {stats.ingredients.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Package size={12} />
              Top Ingredients
            </h3>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="space-y-1">
                {stats.ingredients.map(([ingredient, count]) => (
                  <div key={ingredient} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 truncate">{ingredient}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Optimize Button */}
        <button
          onClick={() => openModal('optimization')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Sparkles size={16} />
          Optimize Menu
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <button
          onClick={() => openModal('settings')}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <Settings size={16} /> Settings
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-1 text-gray-500 text-xs mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function getTagColor(tag: DietaryTag): string {
  const colors = {
    vegan: '#22c55e',
    vegetarian: '#84cc16',
    'gluten-free': '#f59e0b',
    'nut-free': '#f97316',
    'dairy-free': '#3b82f6',
  };
  return colors[tag];
}
