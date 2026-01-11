import { useState, useRef } from 'react';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useUIStore, useRecipeStore, useMenuStore } from '@/stores';
import { exportToZip, importFromZip, downloadBlob } from '@/lib/export';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { logout } = useAuthStore();
  const { addToast } = useUIStore();
  const { recipes, addRecipes } = useRecipeStore();
  const { menus } = useMenuStore();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportToZip(recipes, menus, { includeMenus: true });
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `menu-mixer-export-${date}.zip`);
      addToast('success', `Exported ${recipes.length} recipes`);
    } catch (err) {
      addToast('error', 'Failed to export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { recipes: importedRecipes } = await importFromZip(file);

      if (importedRecipes.length === 0) {
        addToast('info', 'No recipes found in zip file');
        return;
      }

      // Add imported recipes
      await addRecipes(
        importedRecipes.map((r) => ({
          name: r.name,
          description: r.description,
          instructions: r.instructions,
          notes: r.notes,
          ingredients: r.ingredients,
          metadata: r.metadata,
        }))
      );

      addToast('success', `Imported ${importedRecipes.length} recipes`);
    } catch (err) {
      addToast('error', 'Failed to import zip file');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Delete IndexedDB database
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      // Clear localStorage
      localStorage.clear();
      // Logout and reload
      logout();
      addToast('success', 'All data cleared');
      window.location.reload();
    } catch (err) {
      addToast('error', 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="sm">
      <div className="space-y-6">
        {/* Export/Import Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-3">Data Management</h4>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              isLoading={isExporting}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportClick}
              isLoading={isImporting}
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              Import Zip
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Export your recipes as a zip file with markdown files, or import from a previous export.
          </p>
        </div>

        {/* Reset Section */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Reset All Data</h4>
              <p className="text-sm text-red-600 mt-1">
                This will delete all recipes, menus, and collections. This cannot be undone.
              </p>

              {!confirmReset ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-red-600 hover:bg-red-100"
                  onClick={() => setConfirmReset(true)}
                >
                  Reset Everything
                </Button>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={handleReset}
                    isLoading={isResetting}
                  >
                    Yes, Delete All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
