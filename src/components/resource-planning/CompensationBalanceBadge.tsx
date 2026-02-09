import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOperatorCompensationBalance, useOperatorCompensationBalanceByDateRange } from "@/hooks/useAbsenceCompensations";

interface CompensationBalanceBadgeProps {
  operatorId: string;
  compact?: boolean;
  // New: date range for multi-year periods
  dateRange?: { startDate: Date; endDate: Date };
}

export const CompensationBalanceBadge: React.FC<CompensationBalanceBadgeProps> = ({
  operatorId,
  compact = false,
  dateRange,
}) => {
  // Determine if we need to use date range (spans multiple years) or single year
  const useRangeQuery = dateRange && 
    dateRange.startDate.getFullYear() !== dateRange.endDate.getFullYear();
  
  // Use range query for multi-year periods
  const { data: rangeBalance, isLoading: rangeLoading } = useOperatorCompensationBalanceByDateRange(
    operatorId, 
    useRangeQuery ? dateRange : undefined
  );
  
  // Use year query for single year (fallback to year from dateRange or current year)
  const effectiveYear = !useRangeQuery && dateRange 
    ? dateRange.startDate.getFullYear() 
    : undefined;
  const { data: yearBalance, isLoading: yearLoading } = useOperatorCompensationBalance(
    operatorId, 
    !useRangeQuery ? effectiveYear : undefined
  );

  const isLoading = useRangeQuery ? rangeLoading : yearLoading;
  const balance = useRangeQuery ? rangeBalance : yearBalance;

  if (isLoading || !balance) return null;
  
  // Use totalPendingHours which includes both absence compensations AND timesheet deficits
  const totalPending = balance.totalPendingHours ?? balance.pendingHours;
  
  // Don't show if no pending hours
  if (totalPending <= 0) return null;

  const pendingHours = Math.round(totalPending * 100) / 100;
  const absencePendingHours = Math.round(balance.pendingHours * 100) / 100;
  const timesheetDeficitHours = Math.round((balance.timesheetDeficitHours ?? 0) * 100) / 100;
  const totalAbsenceHours = Math.round(balance.totalAbsenceHours * 100) / 100;
  const totalCompensatedHours = Math.round(balance.totalCompensatedHours * 100) / 100;
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
              {absencePendingHours > 0 && (
                <>
                  <p>Всего пропущено: {totalAbsenceHours}ч</p>
                  <p>Отработано: {totalCompensatedHours}ч</p>
                </>
              )}
              {timesheetDeficitHours > 0 && (
                <p>Недоработка по табелю: {timesheetDeficitHours}ч</p>
              )}
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
        Пропущено {totalAbsenceHours}ч, отработано {totalCompensatedHours}ч
      </div>
    </div>
  );
};
