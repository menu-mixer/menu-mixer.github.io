import { useEffect, useState } from 'react';
import { useAuthStore, useRecipeStore, useMenuStore, useUIStore } from '@/stores';

import { Sidebar } from '@/components/sidebar/Sidebar';
import { InviteCodeModal } from '@/components/auth/InviteCodeModal';
import { UsageBadge } from '@/components/auth/UsageBadge';
import { MenuArea } from '@/components/menu/MenuArea';
import { OptimizationPanel } from '@/components/optimization/OptimizationPanel';
import { ThemePanel } from '@/components/theming/ThemePanel';
import { RecipeEditForm } from '@/components/recipe/RecipeEditForm';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Modal } from '@/components/ui/Modal';
import { ToastContainer } from '@/components/ui/Toast';
import { getStarterPack, loadStarterPack } from '@/lib/starterPack';

function App() {
  const { isAuthenticated, isLoading: authLoading, initialize: initAuth, isFirstLogin, clearFirstLogin, starterPackId } = useAuthStore();
  const { loadRecipes, addRecipe } = useRecipeStore();
  const { loadMenus, loadRecipeBoxes } = useMenuStore();
  const { activeModal, closeModal, addToast, hasCompletedOnboarding, completeOnboarding } = useUIStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Show onboarding for first-time users
  useEffect(() => {
    if (isFirstLogin && !hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, [isFirstLogin, hasCompletedOnboarding]);

  const handleOnboardingComplete = async () => {
    // If there's a starter pack and user hasn't loaded data yet, load it
    if (starterPackId) {
      const pack = getStarterPack(starterPackId);
      if (pack) {
        try {
          await loadStarterPack(pack);
        } catch (err) {
          console.error('Failed to load starter pack:', err);
        }
      }
    }

    completeOnboarding();
    clearFirstLogin();
    setShowOnboarding(false);

    // Reload to refresh all data
    window.location.reload();
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
      {/* Sidebar (Dashboard) */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end">
          <UsageBadge />
        </header>

        {/* Menu Area */}
        <MenuArea />
      </div>

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'recipe-edit'}
        onClose={closeModal}
        title="Add Recipe"
        size="lg"
      >
        <RecipeEditForm
          onSave={async (data) => {
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

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        hasStarterPack={!!starterPackId}
      />

      <ToastContainer />
    </div>
  );
}

export default App;
