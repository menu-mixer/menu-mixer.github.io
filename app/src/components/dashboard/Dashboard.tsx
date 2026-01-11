import { useMemo } from 'react';
import { DollarSign, ChefHat, Package, PieChart } from 'lucide-react';
import { useRecipeStore, useMenuStore } from '@/stores';
import type { DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/types';

export function Dashboard() {
  const { recipes } = useRecipeStore();
  const { getActiveMenu } = useMenuStore();

  const activeMenu = getActiveMenu();

  const stats = useMemo(() => {
    const menuRecipes = activeMenu
      ? recipes.filter((r) => activeMenu.activeRecipeIds.includes(r.id))
      : [];

    // Total cost
    const totalCost = menuRecipes.reduce(
      (sum, r) => sum + (r.metadata.ingredientCost || 0),
      0
    );

    // Unique ingredients
    const ingredients = new Map<string, number>();
    menuRecipes.forEach((r) => {
      r.ingredients.forEach((ing) => {
        const key = ing.item.toLowerCase();
        ingredients.set(key, (ingredients.get(key) || 0) + 1);
      });
    });

    // Dietary coverage
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
        .slice(0, 10),
      dietaryCounts,
    };
  }, [activeMenu, recipes]);

  if (!activeMenu || stats.recipeCount === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Add recipes to your menu to see analytics</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          icon={<ChefHat size={20} />}
          label="Recipes"
          value={stats.recipeCount.toString()}
        />
        <MetricCard
          icon={<DollarSign size={20} />}
          label="Total Cost"
          value={`$${stats.totalCost.toFixed(2)}`}
        />
        <MetricCard
          icon={<Package size={20} />}
          label="Ingredients"
          value={stats.ingredientCount.toString()}
        />
      </div>

      {/* Dietary coverage */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <PieChart size={18} />
          Dietary Coverage
        </h3>
        <div className="space-y-2">
          {(Object.keys(DIETARY_TAGS) as DietaryTag[]).map((tag) => {
            const count = stats.dietaryCounts[tag];
            const percent = (count / stats.recipeCount) * 100;
            return (
              <div key={tag} className="flex items-center gap-3">
                <span className={`text-sm w-20 ${DIETARY_TAGS[tag].color}`}>
                  {DIETARY_TAGS[tag].label}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${DIETARY_TAGS[tag].bgColor.replace('bg-', 'bg-')}`}
                    style={{ width: `${percent}%`, backgroundColor: getTagColor(tag) }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-16">
                  {count} items
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top ingredients */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Package size={18} />
          Top Ingredients
        </h3>
        <div className="space-y-1">
          {stats.ingredients.map(([ingredient, count]) => (
            <div key={ingredient} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">{ingredient}</span>
              <span className="text-xs text-gray-500">{count} recipes</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
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
