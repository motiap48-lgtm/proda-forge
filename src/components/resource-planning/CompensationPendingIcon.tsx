import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOperatorCompensationBalance, useOperatorCompensationBalanceByDateRange } from "@/hooks/useAbsenceCompensations";
import { Z_INDEX_CLASSES } from "@/lib/z-index";
import { cn } from "@/lib/utils";

interface CompensationPendingIconProps {
  operatorId: string;
  year?: number;
  // New: date range for multi-year periods
  dateRange?: { startDate: Date; endDate: Date };
}

export const CompensationPendingIcon: React.FC<CompensationPendingIconProps> = ({
  operatorId,
  year,
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
  
  // Use year query for single year (fallback to year from dateRange or passed year)
  const effectiveYear = !useRangeQuery && dateRange 
    ? dateRange.startDate.getFullYear() 
    : year;
  const { data: yearBalance, isLoading: yearLoading } = useOperatorCompensationBalance(
    operatorId, 
    !useRangeQuery ? effectiveYear : undefined
  );
  
  const [isOpen, setIsOpen] = useState(false);

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
  const isHighDebt = pendingHours >= 8;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span 
          className="flex-shrink-0 cursor-help"
          onMouseEnter={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm">⏳</span>
        </span>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        className={cn("w-auto p-2", Z_INDEX_CLASSES.popover)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="text-xs space-y-1">
          <p className={`font-medium ${isHighDebt ? "text-rose-400" : "text-amber-400"}`}>
            Неотработанные часы: {pendingHours}ч
          </p>
          {absencePendingHours > 0 && (
            <p className="text-muted-foreground">
              Отсутствия: {totalAbsenceHours}ч / Отработано: {totalCompensatedHours}ч
            </p>
          )}
          {timesheetDeficitHours > 0 && (
            <p className="text-muted-foreground">
              Недоработка по табелю: {timesheetDeficitHours}ч
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
