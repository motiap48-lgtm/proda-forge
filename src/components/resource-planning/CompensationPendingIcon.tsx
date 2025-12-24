import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOperatorCompensationBalance } from "@/hooks/useAbsenceCompensations";

interface CompensationPendingIconProps {
  operatorId: string;
}

export const CompensationPendingIcon: React.FC<CompensationPendingIconProps> = ({
  operatorId,
}) => {
  const { data: balance, isLoading } = useOperatorCompensationBalance(operatorId);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !balance) return null;
  
  // Don't show if no pending hours
  if (balance.pendingHours <= 0) return null;

  const pendingHours = Math.round(balance.pendingHours * 100) / 100;
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
        className="w-auto p-2 z-[100000]"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="text-xs space-y-1">
          <p className={`font-medium ${isHighDebt ? "text-rose-400" : "text-amber-400"}`}>
            Неотработанные часы: {pendingHours}ч
          </p>
          <p className="text-muted-foreground">
            Пропущено: {totalAbsenceHours}ч / Отработано: {totalCompensatedHours}ч
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
