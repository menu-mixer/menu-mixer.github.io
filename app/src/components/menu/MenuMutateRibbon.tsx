import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, Send, Loader2 } from 'lucide-react';
import { useRecipeStore, useMenuStore, useUIStore } from '@/stores';
import { chat } from '@/lib/ai/client';
import type { DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/types';

export function MenuMutateRibbon() {
  const { recipes } = useRecipeStore();
  const { getActiveMenu, addToActiveMenu, clearActiveMenu } = useMenuStore();
  const { addToast } = useUIStore();

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const activeMenu = getActiveMenu();
  const menuItems = activeMenu?.items || [];
  const activeSourceIds = new Set(menuItems.map(item => item.sourceRecipeId).filter(Boolean));

  // Get recipes not in menu
  const availableRecipes = useMemo(() => {
    return recipes.filter((r) => !activeSourceIds.has(r.id));
  }, [recipes, activeSourceIds]);

  // Get unique tags from available recipes
  const availableTags = useMemo(() => {
    const tags = new Set<DietaryTag>();
    availableRecipes.forEach((r) => {
      r.metadata.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags);
  }, [availableRecipes]);

  const handleAddAll = () => {
    availableRecipes.forEach((r) => {
      addToActiveMenu(r);
    });
    addToast('success', `Added ${availableRecipes.length} recipes to menu`);
  };

  const handleClear = () => {
    if (activeMenu && menuItems.length > 0) {
      clearActiveMenu();
      addToast('success', 'Cleared menu');
    }
  };

  const handleAddByTag = (tag: DietaryTag) => {
    const tagged = availableRecipes.filter((r) => r.metadata.tags.includes(tag));
    tagged.forEach((r) => {
      addToActiveMenu(r);
    });
    addToast('success', `Added ${tagged.length} ${tag} recipes`);
    setTagDropdownOpen(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    setIsChatLoading(true);
    try {
      const result = await chat(
        [{ role: 'user', content: chatInput }],
        { recipes, activeMenu: menuItems.map((item) => item.name) }
      );
      addToast('info', result.response.slice(0, 100) + (result.response.length > 100 ? '...' : ''));
      setChatInput('');
    } catch (err) {
      addToast('error', 'Chat failed');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-200">
      {/* Add All */}
      <button
        onClick={handleAddAll}
        disabled={availableRecipes.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
        Add All ({availableRecipes.length})
      </button>

      {/* Clear */}
      <button
        onClick={handleClear}
        disabled={!activeMenu || menuItems.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 size={14} />
        Clear
      </button>

      {/* Add by Tag Dropdown */}
      <div className="relative">
        <button
          onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
          disabled={availableTags.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          Add by Tag
          <ChevronDown size={14} />
        </button>

        {tagDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setTagDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {availableTags.map((tag) => {
                const count = availableRecipes.filter((r) => r.metadata.tags.includes(tag)).length;
                return (
                  <button
                    key={tag}
                    onClick={() => handleAddByTag(tag)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className={DIETARY_TAGS[tag].color}>{DIETARY_TAGS[tag].label}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chat Input */}
      <div className="flex items-center gap-2">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
          placeholder="Ask AI about your menu..."
          className="w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isChatLoading}
        />
        <button
          onClick={handleChatSubmit}
          disabled={!chatInput.trim() || isChatLoading}
          className="p-1.5 text-gray-400 hover:text-primary-600 disabled:opacity-50"
        >
          {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
