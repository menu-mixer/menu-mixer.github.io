import { Zap } from 'lucide-react';
import { useAuthStore } from '@/stores';

export function UsageBadge() {
  const { tier, limits } = useAuthStore();

  if (!tier || !limits) return null;

  const isUnlimited = limits.maxAiCalls === -1;
  const usagePercent = isUnlimited ? 0 : ((limits.maxAiCalls - limits.remainingAiCalls) / limits.maxAiCalls) * 100;
  const isLow = !isUnlimited && limits.remainingAiCalls < 10;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
      <Zap size={16} className={isLow ? 'text-amber-500' : 'text-primary-500'} />
      <div className="text-sm">
        <span className="font-medium capitalize">{tier}</span>
        <span className="text-gray-500 ml-1">
          {isUnlimited ? (
            'Unlimited'
          ) : (
            <>
              {limits.remainingAiCalls}/{limits.maxAiCalls} AI calls
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-primary-500'}`}
            style={{ width: `${100 - usagePercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
