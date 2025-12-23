import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOperatorCompensationBalance } from "@/hooks/useAbsenceCompensations";

interface CompensationPendingIconProps {
  operatorId: string;
}

export const CompensationPendingIcon: React.FC<CompensationPendingIconProps> = ({
  operatorId,
}) => {
  const { data: balance, isLoading } = useOperatorCompensationBalance(operatorId);

  if (isLoading || !balance) return null;
  
  // Don't show if no pending hours
  if (balance.pendingHours <= 0) return null;

  const pendingHours = balance.pendingHours;
  const isHighDebt = pendingHours >= 8;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className="flex-shrink-0 cursor-help"
            title={`Неотработанные часы: ${pendingHours}ч`}
          >
            <span className="text-sm">⏳</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs space-y-1">
            <p className={`font-medium ${isHighDebt ? "text-rose-400" : "text-amber-400"}`}>
              Неотработанные часы: {pendingHours}ч
            </p>
            <p className="text-muted-foreground">
              Пропущено: {balance.totalAbsenceHours}ч / Отработано: {balance.totalCompensatedHours}ч
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
