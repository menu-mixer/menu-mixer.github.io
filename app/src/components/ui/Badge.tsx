import type { DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/types';

interface BadgeProps {
  tag: DietaryTag;
  size?: 'sm' | 'md';
}

export function DietaryBadge({ tag, size = 'sm' }: BadgeProps) {
  const config = DIETARY_TAGS[tag];
  if (!config) return null;

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.color} ${sizes[size]}`}>
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {children}
    </span>
  );
}
