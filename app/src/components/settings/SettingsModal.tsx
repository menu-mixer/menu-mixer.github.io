import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useUIStore } from '@/stores';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { logout } = useAuthStore();
  const { addToast } = useUIStore();

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
