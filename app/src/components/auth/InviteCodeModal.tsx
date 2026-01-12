import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores';

interface InviteCodeModalProps {
  isOpen: boolean;
}

export function InviteCodeModal({ isOpen }: InviteCodeModalProps) {
  const [code, setCode] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await login(code.trim());
    } catch {
      // Error is handled by store
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Welcome to Menu Mixer" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-600 text-sm">
          Enter your invite code to get started. Don't have one? Contact us to request access.
        </p>

        <Input
          label="Invite Code"
          placeholder="e.g., CAFE-CHRISTIE-2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={error || undefined}
          autoFocus
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Get Started
        </Button>

        <p className="text-xs text-gray-500 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="text-xs text-gray-400 text-center pt-2">
          Build: {__BUILD_DATE__}
        </p>
      </form>
    </Modal>
  );
}
