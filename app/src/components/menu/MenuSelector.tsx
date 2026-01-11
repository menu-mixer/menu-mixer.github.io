import { useState } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useMenuStore } from '@/stores';

export function MenuSelector() {
  const { menus, activeMenuId, setActiveMenu, createMenu } = useMenuStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  const handleCreateMenu = async () => {
    if (!newMenuName.trim()) return;
    const menu = await createMenu(newMenuName.trim());
    setActiveMenu(menu.id);
    setNewMenuName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">
          {activeMenu?.name || 'Select Menu'}
        </span>
        <span className="text-xs text-gray-500">
          ({activeMenu?.items?.length || 0} recipes)
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-1">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => {
                    setActiveMenu(menu.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded text-left
                    ${menu.id === activeMenuId ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className="font-medium">{menu.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {menu.items?.length || 0} recipes
                    </span>
                    {menu.id === activeMenuId && <Check size={16} className="text-primary-600" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 p-2">
              {isCreating ? (
                <div className="flex gap-1">
                  <input
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateMenu()}
                    placeholder="Menu name..."
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateMenu}
                    className="px-2 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  <Plus size={16} />
                  New Menu
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
