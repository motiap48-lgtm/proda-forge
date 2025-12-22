import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOperatorCompensationBalance } from "@/hooks/useAbsenceCompensations";

interface CompensationBalanceBadgeProps {
  operatorId: string;
  compact?: boolean;
}

export const CompensationBalanceBadge: React.FC<CompensationBalanceBadgeProps> = ({
  operatorId,
  compact = false,
}) => {
  const { data: balance, isLoading } = useOperatorCompensationBalance(operatorId);

  if (isLoading || !balance) return null;
  
  // Don't show if no pending hours
  if (balance.pendingHours <= 0) return null;

  const pendingHours = balance.pendingHours;
  const isHighDebt = pendingHours >= 8; // 8+ hours is considered high

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`text-xs gap-1 cursor-help ${
                isHighDebt
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300"
              }`}
            >
              <Clock className="h-3 w-3" />
              -{pendingHours}ч
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">Баланс отработки</p>
              <p>Всего пропущено: {balance.totalAbsenceHours}ч</p>
              <p>Отработано: {balance.totalCompensatedHours}ч</p>
              <p className={isHighDebt ? "text-rose-400" : "text-amber-400"}>
                Осталось: {pendingHours}ч
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`p-2 rounded-lg border ${
      isHighDebt
        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    }`}>
      <div className="flex items-center gap-2">
        {isHighDebt ? (
          <AlertCircle className="h-4 w-4 text-rose-500" />
        ) : (
          <Clock className="h-4 w-4 text-amber-500" />
        )}
        <span className={`text-sm font-medium ${
          isHighDebt ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"
        }`}>
          Требуется отработка: {pendingHours}ч
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Пропущено {balance.totalAbsenceHours}ч, отработано {balance.totalCompensatedHours}ч
      </div>
    </div>
  );
};
