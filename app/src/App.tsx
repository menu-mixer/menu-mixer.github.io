import { useEffect, useState } from 'react';
import { Search, MessageCircle, Sparkles, BarChart3, Plus } from 'lucide-react';
import { useAuthStore, useRecipeStore, useMenuStore, useUIStore } from '@/stores';
import type { ParsedRecipe } from '@/lib/ai/client';

import { Sidebar } from '@/components/sidebar/Sidebar';
import { InviteCodeModal } from '@/components/auth/InviteCodeModal';
import { UsageBadge } from '@/components/auth/UsageBadge';
import { MenuEditor } from '@/components/menu/MenuEditor';
import { Backlog } from '@/components/menu/Backlog';
import { DropZone } from '@/components/import/DropZone';
import { ImportPreview } from '@/components/import/ImportPreview';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OptimizationPanel } from '@/components/optimization/OptimizationPanel';
import { ThemePanel } from '@/components/theming/ThemePanel';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { RecipeEditForm } from '@/components/recipe/RecipeEditForm';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';

type View = 'editor' | 'dashboard';

function App() {
  const { isAuthenticated, isLoading: authLoading, initialize: initAuth } = useAuthStore();
  const { loadRecipes } = useRecipeStore();
  const { loadMenus, loadRecipeBoxes } = useMenuStore();
  const { searchQuery, setSearchQuery, activeModal, closeModal, openModal, addToast } = useUIStore();

  const [view, setView] = useState<View>('editor');
  const [showChat, setShowChat] = useState(false);
  const [pendingImport, setPendingImport] = useState<ParsedRecipe[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Initialize auth and load data
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecipes();
      loadMenus();
      loadRecipeBoxes();
    }
  }, [isAuthenticated, loadRecipes, loadMenus, loadRecipeBoxes]);

  const handleRecipesParsed = (recipes: ParsedRecipe[]) => {
    setPendingImport(recipes);
    openModal('recipe-import');
  };

  const handleImportConfirm = async (recipes: ParsedRecipe[]) => {
    setIsImporting(true);
    try {
      const { addRecipes } = useRecipeStore.getState();
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
      closeModal();
      setPendingImport([]);
    } catch (err) {
      addToast('error', 'Failed to import recipes');
    } finally {
      setIsImporting(false);
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show invite code modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Menu Mixer</h1>
            <p className="text-gray-600 mb-8">
              Recipe management and menu planning for bakers, cafes, and caterers.
              Import recipes from anywhere, organize them into menus, and optimize with AI.
            </p>
          </div>
        </div>
        <InviteCodeModal isOpen={true} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('editor')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'editor' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  view === 'dashboard' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                }`}
              >
                <BarChart3 size={14} />
                Dashboard
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Action buttons */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('optimization')}
            >
              <Sparkles size={16} className="mr-1" />
              Optimize
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openModal('theme')}
            >
              Re-theme
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle size={16} className="mr-1" />
              Chat
            </Button>

            <div className="w-px h-6 bg-gray-200" />

            <UsageBadge />
          </div>
        </header>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            {view === 'editor' ? (
              <>
                {/* Menu Editor */}
                <div className="flex-1 min-h-0">
                  <MenuEditor />
                </div>

                {/* Backlog */}
                <div className="h-72 border-t border-gray-200 bg-white overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-700">Recipe Backlog</h3>
                    <Button size="sm" variant="secondary" onClick={() => openModal('recipe-edit')}>
                      <Plus size={14} className="mr-1" />
                      Add Recipe
                    </Button>
                  </div>
                  <Backlog />
                </div>

                {/* Drop Zone */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <DropZone onRecipesParsed={handleRecipesParsed} />
                </div>
              </>
            ) : (
              <Dashboard />
            )}
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="w-80 flex-shrink-0">
              <ChatPanel onClose={() => setShowChat(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'recipe-import'}
        onClose={() => {
          closeModal();
          setPendingImport([]);
        }}
        title="Import Recipes"
        size="lg"
      >
        <ImportPreview
          recipes={pendingImport}
          onImport={handleImportConfirm}
          onCancel={() => {
            closeModal();
            setPendingImport([]);
          }}
          isLoading={isImporting}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'recipe-edit'}
        onClose={closeModal}
        title="Add Recipe"
        size="lg"
      >
        <RecipeEditForm
          onSave={async (data) => {
            const { addRecipe } = useRecipeStore.getState();
            await addRecipe(data as any);
            addToast('success', 'Recipe added');
            closeModal();
          }}
          onCancel={closeModal}
        />
      </Modal>

      {activeModal === 'optimization' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10">
            <OptimizationPanel onClose={closeModal} />
          </div>
        </div>
      )}

      {activeModal === 'theme' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10">
            <ThemePanel onClose={closeModal} />
          </div>
        </div>
      )}

      <SettingsModal isOpen={activeModal === 'settings'} onClose={closeModal} />

      <ToastContainer />
    </div>
  );
}

export default App;
