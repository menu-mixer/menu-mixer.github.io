import { useState } from 'react';
import { Layers, Package, Salad, DollarSign } from 'lucide-react';
import { optimizeRecipes } from '@/lib/ai/client';
import { useRecipeStore, useMenuStore, useAuthStore, useUIStore } from '@/stores';
import { Button } from '@/components/ui/Button';

type OptimizationType = 'dedupe' | 'ingredients' | 'dietary' | 'cost';

const TABS: { id: OptimizationType; label: string; icon: React.ReactNode }[] = [
  { id: 'dedupe', label: 'Duplicates', icon: <Layers size={16} /> },
  { id: 'ingredients', label: 'Ingredients', icon: <Package size={16} /> },
  { id: 'dietary', label: 'Dietary', icon: <Salad size={16} /> },
  { id: 'cost', label: 'Cost', icon: <DollarSign size={16} /> },
];

interface OptimizationPanelProps {
  onClose: () => void;
}

export function OptimizationPanel({ onClose }: OptimizationPanelProps) {
  const [activeTab, setActiveTab] = useState<OptimizationType>('ingredients');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const { recipes } = useRecipeStore();
  const { getActiveMenu } = useMenuStore();
  const { updateLimits } = useAuthStore();
  const { addToast } = useUIStore();

  const runOptimization = async (type: OptimizationType) => {
    const activeMenu = getActiveMenu();
    const recipesToAnalyze = activeMenu
      ? recipes.filter((r) => activeMenu.activeRecipeIds.includes(r.id))
      : recipes;

    if (recipesToAnalyze.length < 2) {
      addToast('info', 'Need at least 2 recipes in the active menu to optimize');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await optimizeRecipes(type, recipesToAnalyze);
      updateLimits({ remainingAiCalls: response.remaining });
      setResult(response.result);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: OptimizationType) => {
    setActiveTab(tab);
    setResult(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Menu Optimization</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center mb-6">
          <p className="text-gray-600 text-sm">
            {activeTab === 'dedupe' && 'Find duplicate or similar recipes to merge.'}
            {activeTab === 'ingredients' && 'Analyze shared ingredients and suggest additions.'}
            {activeTab === 'dietary' && 'Check dietary coverage and identify gaps.'}
            {activeTab === 'cost' && 'Find cost optimization opportunities.'}
          </p>
          <Button
            onClick={() => runOptimization(activeTab)}
            className="mt-4"
            isLoading={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>

        {result !== null && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
