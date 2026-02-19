import React, { memo } from "react";
import { getDay, isToday } from "date-fns";
import { Clock, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PeriodType } from "../utils";

interface GrandTotalRowProps {
  days: Date[];
  months: Date[];
  period: PeriodType;
  filteredOperators: any[];
  employeeColumnWidth: number;
  calendarGridStyle: React.CSSProperties;
  isTodayColumnHovered: boolean;
  onTodayColumnHover: (hovered: boolean) => void;
  registerScrollContainer: (key: string) => (el: HTMLDivElement | null) => void;
  handleSyncScroll: (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => void;
  calculateMonthHours: (operator: any, month: Date) => { hours: number; minutes: number };
  calculateMonthPlanHours: (operator: any, month: Date) => { hours: number; minutes: number };
  calculateGroupPlanHours: (ops: any[]) => { hours: number; minutes: number };
  calculateGroupYearlyPlanTotal: (ops: any[]) => { hours: number; minutes: number };
  grandTotalFact?: { hours: number; minutes: number };
  calculateMonthFactHours?: (operatorId: string, month: Date) => { hours: number; minutes: number };
}

const GrandTotalRowComponent: React.FC<GrandTotalRowProps> = ({
  days,
  months,
  period,
  filteredOperators,
  employeeColumnWidth,
  calendarGridStyle,
  isTodayColumnHovered,
  onTodayColumnHover,
  registerScrollContainer,
  handleSyncScroll,
  calculateMonthHours,
  calculateMonthPlanHours,
  calculateGroupPlanHours,
  calculateGroupYearlyPlanTotal,
  grandTotalFact,
  calculateMonthFactHours,
}) => {
  const isMobile = useIsMobile();
  
  if (filteredOperators.length === 0) return null;

  const grandTotalCalc = period === "year" 
    ? calculateGroupYearlyPlanTotal(filteredOperators)
    : calculateGroupPlanHours(filteredOperators);
  
  const hasFactData = grandTotalFact && (grandTotalFact.hours > 0 || grandTotalFact.minutes > 0);
  
  // Mobile-optimized column width
  const mobileEmployeeWidth = isMobile ? Math.min(employeeColumnWidth, 120) : employeeColumnWidth;
  const cellHeight = isMobile ? "h-8" : "h-[44px]";

  return (
    <div 
      className="mt-2 border border-border rounded-lg flex w-full min-w-0 overflow-hidden relative isolate"
      style={{
        ["--sr-row-h" as any]: isMobile ? "32px" : "44px"
      }}
    >
      {/* Fixed label column - matches ScheduleGroup employee column */}
      <div 
        className="flex-shrink-0 border-r border-border bg-emerald-50 dark:bg-emerald-950/30 flex items-center relative z-50" 
        style={{ width: `${mobileEmployeeWidth}px` }}
      >
        <div className={cn(
          "flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300",
          isMobile ? "px-1.5 text-xs" : "px-3 text-sm"
        )}>
          <Clock className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
          {isMobile ? "ИТОГО" : "ОБЩИЙ ИТОГ:"}
        </div>
      </div>
      
      {/* Blur overlays - matching calendar container */}
      <div
        className="absolute top-0 bottom-0 w-10 pointer-events-none z-[60]"
        style={{ left: `${mobileEmployeeWidth}px` }}
      >
        <div className="h-full w-full bg-gradient-to-r from-emerald-50 dark:from-emerald-950/30 via-emerald-50/70 dark:via-emerald-950/20 to-transparent" />
      </div>

      <div className="absolute top-0 bottom-0 right-0 w-10 pointer-events-none z-[60]">
        <div className="h-full w-full bg-gradient-to-l from-emerald-50 dark:from-emerald-950/30 via-emerald-50/70 dark:via-emerald-950/20 to-transparent" />
      </div>

      {/* Scrollable total area - matches calendar scroll */}
      <div 
        ref={registerScrollContainer('grand-total')}
        onScroll={handleSyncScroll('grand-total')}
        className="flex-1 min-w-0 overflow-x-auto overflow-y-scroll scrollbar-overlay relative isolate bg-emerald-50 dark:bg-emerald-950/30"
      >
        <div style={calendarGridStyle} className={cn(
          "items-center",
          isMobile ? "pl-1 pr-0.5 py-1" : "pl-2 pr-0.5 py-1.5"
        )}>
          {period === "year" ? (
            <>
              {months.map((month) => {
                let monthPlanTotal = 0;
                let monthFactTotal = 0;
                filteredOperators.forEach(op => {
                  const mh = calculateMonthPlanHours(op, month);
                  monthPlanTotal += mh.hours * 60 + mh.minutes;
                  if (calculateMonthFactHours) {
                    const mf = calculateMonthFactHours(op.id, month);
                    monthFactTotal += mf.hours * 60 + mf.minutes;
                  }
                });
                const h = Math.floor(monthPlanTotal / 60);
                const m = monthPlanTotal % 60;
                const fh = Math.floor(monthFactTotal / 60);
                const hasMonthFact = monthFactTotal > 0;
                return (
                  <div 
                    key={month.toISOString()} 
                    className={cn(
                      "text-center font-medium flex flex-col items-center justify-center rounded-md bg-gradient-to-b from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-900/50 text-emerald-700 dark:text-emerald-300",
                      cellHeight,
                      isMobile ? "text-[10px]" : "text-xs"
                    )}
                  >
                    <div>{h}ч{m > 0 && !isMobile ? ` ${m}м` : ''}</div>
                    {hasMonthFact && (
                      <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">ф:{fh}ч</div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            days.map((day) => {
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "text-center text-muted-foreground flex items-center justify-center rounded-md",
                    cellHeight,
                    isMobile ? "text-[10px]" : "text-xs",
                    isWeekend 
                      ? "bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-900/50" 
                      : "bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30",
                    isToday(day) && cn(
                      "shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]",
                      isTodayColumnHovered && "animate-pulse-glow"
                    )
                  )}
                  onMouseEnter={() => isToday(day) && onTodayColumnHover(true)}
                  onMouseLeave={() => isToday(day) && onTodayColumnHover(false)}
                >—</div>
              );
            })
          )}
          {/* Grand total cell - shows fact if available, otherwise plan */}
          <div className={cn(
            "text-center flex flex-col items-center justify-center rounded-md font-bold",
            hasFactData 
              ? "bg-gradient-to-b from-blue-200 to-blue-300 dark:from-blue-700 dark:to-blue-800 text-blue-900 dark:text-blue-100"
              : "bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100",
            cellHeight,
            isMobile ? "text-[10px] p-0.5" : "text-xs p-1.5"
          )}>
            {hasFactData ? (
              <>
                <div className="flex items-center gap-0.5">
                  <ClipboardCheck className="h-3 w-3" />
                  <span>{grandTotalFact.hours}ч</span>
                </div>
                <div className="text-[9px] opacity-80">
                  п: {grandTotalCalc.hours}ч{grandTotalCalc.minutes > 0 && !isMobile ? ` ${grandTotalCalc.minutes}м` : ''}
                </div>
              </>
            ) : (
              <>
                <div>{grandTotalCalc.hours}ч</div>
                {grandTotalCalc.minutes > 0 && !isMobile && <div className="text-[10px] opacity-80">{grandTotalCalc.minutes}м</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoized component for performance optimization
export const GrandTotalRow = memo(GrandTotalRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.filteredOperators.length === nextProps.filteredOperators.length &&
    prevProps.period === nextProps.period &&
    prevProps.days.length === nextProps.days.length &&
    prevProps.employeeColumnWidth === nextProps.employeeColumnWidth &&
    prevProps.isTodayColumnHovered === nextProps.isTodayColumnHovered &&
    prevProps.filteredOperators === nextProps.filteredOperators &&
    prevProps.grandTotalFact?.hours === nextProps.grandTotalFact?.hours &&
    prevProps.grandTotalFact?.minutes === nextProps.grandTotalFact?.minutes
  );
});
