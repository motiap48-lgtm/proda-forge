import React from 'react';
import { Medal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OvertimeMedalBadgeProps {
  medalType: 'gold' | 'silver' | 'bronze' | null;
  totalMinutes?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const medalConfig = {
  gold: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    label: 'Золото',
    emoji: '🥇',
  },
  silver: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: 'Серебро',
    emoji: '🥈',
  },
  bronze: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-400',
    label: 'Бронза',
    emoji: '🥉',
  },
};

const sizeConfig = {
  sm: 'w-4 h-4 text-[10px]',
  md: 'w-5 h-5 text-xs',
  lg: 'w-6 h-6 text-sm',
};

export function OvertimeMedalBadge({ 
  medalType, 
  totalMinutes,
  size = 'sm',
  showTooltip = true,
  className 
}: OvertimeMedalBadgeProps) {
  if (!medalType) return null;

  const config = medalConfig[medalType];
  const hours = totalMinutes ? Math.floor(totalMinutes / 60) : 0;
  const minutes = totalMinutes ? totalMinutes % 60 : 0;

  const badge = (
    <span 
      className={cn(
        "inline-flex items-center justify-center rounded-full border",
        config.bgColor,
        config.borderColor,
        sizeConfig[size],
        className
      )}
    >
      <span className="text-xs">{config.emoji}</span>
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{config.label} за переработки</div>
          {totalMinutes && totalMinutes > 0 && (
            <div className="text-muted-foreground">
              {hours}ч {minutes > 0 ? `${minutes}м` : ''} сверхурочно
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Component to show all medals for an operator in yearly summary
export function OvertimeMedalsSummary({
  goldCount,
  silverCount,
  bronzeCount,
  className,
}: {
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {goldCount > 0 && (
        <span className="flex items-center gap-0.5">
          <span>🥇</span>
          <span className="text-xs font-medium">{goldCount}</span>
        </span>
      )}
      {silverCount > 0 && (
        <span className="flex items-center gap-0.5">
          <span>🥈</span>
          <span className="text-xs font-medium">{silverCount}</span>
        </span>
      )}
      {bronzeCount > 0 && (
        <span className="flex items-center gap-0.5">
          <span>🥉</span>
          <span className="text-xs font-medium">{bronzeCount}</span>
        </span>
      )}
    </div>
  );
}
