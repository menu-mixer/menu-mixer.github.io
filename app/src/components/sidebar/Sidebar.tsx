import { useState } from 'react';
import {
  ChefHat,
  FolderOpen,
  Plus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMenuStore, useAuthStore, useUIStore } from '@/stores';
import { Button } from '@/components/ui/Button';

export function Sidebar() {
  const { menus, activeMenuId, setActiveMenu, createMenu, recipeBoxes, createRecipeBox } = useMenuStore();
  const { logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, openModal } = useUIStore();
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    const menu = await createMenu(newMenuName.trim());
    setActiveMenu(menu.id);
    setNewMenuName('');
    setIsCreatingMenu(false);
  };

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

      {/* Menus */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Menus
          </h3>
          <div className="space-y-1">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setActiveMenu(menu.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${activeMenuId === menu.id
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                {menu.name}
                <span className="text-xs text-gray-400 ml-1">
                  ({menu.activeRecipeIds.length})
                </span>
              </button>
            ))}
          </div>

          {isCreatingMenu ? (
            <div className="mt-2 flex gap-1">
              <input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
                placeholder="Menu name"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
              <Button size="sm" onClick={handleCreateMenu}>
                Add
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingMenu(true)}
              className="w-full mt-2 flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Plus size={16} /> New Menu
            </button>
          )}
        </div>

        {/* Recipe Boxes */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Collections
          </h3>
          <div className="space-y-1">
            {recipeBoxes.map((box) => (
              <button
                key={box.id}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FolderOpen size={16} />
                {box.name}
                <span className="text-xs text-gray-400">({box.recipeIds.length})</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => createRecipeBox('New Collection')}
            className="w-full mt-2 flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Plus size={16} /> New Collection
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
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
