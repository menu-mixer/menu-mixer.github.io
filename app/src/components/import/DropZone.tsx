import { useState, useCallback } from 'react';
import { FileText, Image, Link } from 'lucide-react';
import { parseRecipe } from '@/lib/ai/client';
import type { ParsedRecipe } from '@/lib/ai/client';
import { useUIStore, useAuthStore } from '@/stores';

interface DropZoneProps {
  onRecipesParsed: (recipes: ParsedRecipe[]) => void;
}

export function DropZone({ onRecipesParsed }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useUIStore();
  const { updateLimits } = useAuthStore();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      let content: string;
      let contentType: 'text' | 'image' | 'pdf';

      if (file.type.startsWith('image/')) {
        contentType = 'image';
        content = await fileToBase64(file);
      } else if (file.type === 'application/pdf') {
        contentType = 'pdf';
        // For PDFs, we'd ideally extract text, but for now send as base64
        content = await fileToBase64(file);
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
        setError('No recipes found in this file');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
      addToast('error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processText = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await parseRecipe(text, 'text');
      updateLimits({ remainingAiCalls: result.remaining });

      if (result.recipes.length > 0) {
        onRecipesParsed(result.recipes);
        addToast('success', `Found ${result.recipes.length} recipe(s)`);
      } else {
        setError('No recipes found in the text');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse text';
      setError(message);
      addToast('error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const text = e.dataTransfer.getData('text/plain');

    if (files.length > 0) {
      for (const file of files) {
        await processFile(file);
      }
    } else if (text) {
      await processText(text);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
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

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
        ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept=".txt,.pdf,.doc,.docx,image/*"
        multiple
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-3">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
            <p className="text-gray-600">Analyzing with AI...</p>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText size={20} className="text-gray-500" />
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Image size={20} className="text-gray-500" />
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Link size={20} className="text-gray-500" />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700">Drop recipes here</p>
              <p className="text-sm text-gray-500">PDF, images, text files, or paste text</p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
