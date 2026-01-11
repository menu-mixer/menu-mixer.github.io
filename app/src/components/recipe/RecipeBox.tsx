import { useState, useCallback, useMemo } from 'react';
import { Search, Settings, Upload, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useRecipeStore, useMenuStore, useUIStore, useAuthStore } from '@/stores';
import { RecipeCard } from './RecipeCard';
import { parseRecipe } from '@/lib/ai/client';
import type { ParsedRecipe } from '@/lib/ai/client';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface RecipeBoxProps {
  onRecipesParsed: (recipes: ParsedRecipe[]) => void;
}

export function RecipeBox({ onRecipesParsed }: RecipeBoxProps) {
  const { recipes, deleteRecipe } = useRecipeStore();
  const { recipeBoxes, getActiveMenu, addToActiveMenu, createRecipeBox, deleteRecipeBox } = useMenuStore();
  const { addToast } = useUIStore();
  const { updateLimits } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [boxSelectorOpen, setBoxSelectorOpen] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [isCreatingBox, setIsCreatingBox] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');

  const activeMenu = getActiveMenu();
  // Build a set of source recipe IDs that are in the active menu
  const activeMenuSourceIds = new Set(
    (activeMenu?.items || []).map(item => item.sourceRecipeId).filter(Boolean)
  );

  // Filter recipes based on active box and search
  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // Filter by box if selected
    if (activeBoxId) {
      const box = recipeBoxes.find((b) => b.id === activeBoxId);
      if (box) {
        const boxIds = new Set(box.recipeIds);
        result = result.filter((r) => boxIds.has(r.id));
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.ingredients.some((i) => i.item.toLowerCase().includes(query)) ||
          r.metadata.tags.some((t) => t.includes(query))
      );
    }

    return result;
  }, [recipes, activeBoxId, recipeBoxes, searchQuery]);

  // Extract text from PDF using pdf.js
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textItem = item as any;
          return textItem.str || '';
        })
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n\n');
  };

  // Render PDF page to image (for image-only PDFs)
  const renderPdfPageToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Get first page

    const scale = 2; // Higher scale = better quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: context, viewport } as any).promise;

    // Convert to base64 (remove data:image/png;base64, prefix)
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1];
  };

  // File handling
  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      let content: string;
      let contentType: 'text' | 'image' | 'pdf';

      if (file.type.startsWith('image/')) {
        contentType = 'image';
        content = await fileToBase64(file);
      } else if (file.type === 'application/pdf') {
        // Try to extract text from PDF first
        const pdfText = await extractPdfText(file);
        if (pdfText.trim()) {
          // PDF has text content
          contentType = 'text';
          content = pdfText;
        } else {
          // PDF is image-only, render to image and use vision
          contentType = 'image';
          content = await renderPdfPageToImage(file);
        }
      } else {
        contentType = 'text';
        content = await file.text();
      }

      const result = await parseRecipe(content, contentType);
      updateLimits({ remainingAiCalls: result.remaining });

      if (result.recipes.length > 0) {
        onRecipesParsed(result.recipes);
        addToast('success', `Found ${result.recipes.length} recipe(s)`);
      } else {
        addToast('info', 'No recipes found in this file');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      addToast('error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check if it's a recipe being dragged (not a file)
    const recipeId = e.dataTransfer.getData('recipe-id');
    if (recipeId) return; // Ignore recipe drags

    const files = Array.from(e.dataTransfer.files);
    const text = e.dataTransfer.getData('text/plain');

    if (files.length > 0) {
      for (const file of files) {
        await processFile(file);
      }
    } else if (text) {
      setIsProcessing(true);
      try {
        const result = await parseRecipe(text, 'text');
        updateLimits({ remainingAiCalls: result.remaining });
        if (result.recipes.length > 0) {
          onRecipesParsed(result.recipes);
          addToast('success', `Found ${result.recipes.length} recipe(s)`);
        } else {
          addToast('info', 'No recipes found in text');
        }
      } catch (err) {
        addToast('error', 'Failed to parse text');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onRecipesParsed, addToast, updateLimits]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Only show drag state for files, not recipe cards
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        await processFile(file);
      }
    }
    e.target.value = '';
  };

  const handleAddToMenu = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      addToActiveMenu(recipe);
      addToast('success', 'Added to menu');
    }
  };

  const handleDelete = async (recipeId: string) => {
    await deleteRecipe(recipeId);
    addToast('success', 'Recipe deleted');
  };

  const handleCreateBox = async () => {
    if (!newBoxName.trim()) return;
    const box = await createRecipeBox(newBoxName.trim());
    setActiveBoxId(box.id);
    setNewBoxName('');
    setIsCreatingBox(false);
    setBoxSelectorOpen(false);
    addToast('success', `Created "${box.name}"`);
  };

  const handleDeleteBox = async (boxId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRecipeBox(boxId);
    if (activeBoxId === boxId) {
      setActiveBoxId(null);
    }
    addToast('success', 'Recipe box deleted');
  };

  const activeBox = activeBoxId ? recipeBoxes.find((b) => b.id === activeBoxId) : null;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        flex flex-col h-full bg-white border-t border-gray-200 transition-colors
        ${isDragOver ? 'bg-primary-50 border-primary-300' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100">
        {/* Box Selector */}
        <div className="relative">
          <button
            onClick={() => setBoxSelectorOpen(!boxSelectorOpen)}
            className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            <span>{activeBox?.name || 'All Recipes'}</span>
            <ChevronDown size={14} />
          </button>

          {boxSelectorOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setBoxSelectorOpen(false); setIsCreatingBox(false); }} />
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-1">
                  <button
                    onClick={() => {
                      setActiveBoxId(null);
                      setBoxSelectorOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 rounded ${
                      !activeBoxId ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    All Recipes
                    {!activeBoxId && <Check size={14} />}
                  </button>
                  {recipeBoxes.map((box) => (
                    <button
                      key={box.id}
                      onClick={() => {
                        setActiveBoxId(box.id);
                        setBoxSelectorOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 rounded group ${
                        activeBoxId === box.id ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      <span className="truncate">{box.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{box.recipeIds.length}</span>
                        {activeBoxId === box.id && <Check size={14} />}
                        <button
                          onClick={(e) => handleDeleteBox(box.id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-100 p-2">
                  {isCreatingBox ? (
                    <div className="flex gap-1">
                      <input
                        value={newBoxName}
                        onChange={(e) => setNewBoxName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateBox()}
                        placeholder="Box name..."
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        onClick={handleCreateBox}
                        className="px-2 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingBox(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                    >
                      <Plus size={14} />
                      New Recipe Box
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-7 pr-3 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Import Button */}
        <label className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
          <Upload size={14} />
          Import
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx,image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {/* Settings */}
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <Settings size={16} />
        </button>
      </div>

      {/* Recipe Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            <span className="ml-3 text-gray-600">Analyzing with AI...</span>
          </div>
        )}

        {!isProcessing && filteredRecipes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? (
              <p>No recipes match "{searchQuery}"</p>
            ) : recipes.length === 0 ? (
              <div>
                <p className="mb-2">No recipes yet</p>
                <p className="text-sm">Drop files here or click Import to add recipes</p>
              </div>
            ) : (
              <p>All recipes are in the current menu</p>
            )}
          </div>
        )}

        {!isProcessing && filteredRecipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                draggable
                isInMenu={activeMenuSourceIds.has(recipe.id)}
                onAdd={handleAddToMenu}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Drop Zone Hint */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-50/80 pointer-events-none">
            <div className="text-center">
              <Upload size={48} className="mx-auto text-primary-500 mb-2" />
              <p className="text-lg font-medium text-primary-700">Drop files to import recipes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
