import React from "react";
import { getDay, isToday } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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
  calculateGroupTotalHours: (ops: any[]) => { hours: number; minutes: number };
  calculateGroupYearlyTotal: (ops: any[]) => { hours: number; minutes: number };
}

export const GrandTotalRow: React.FC<GrandTotalRowProps> = ({
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
  calculateGroupTotalHours,
  calculateGroupYearlyTotal,
}) => {
  if (filteredOperators.length === 0) return null;

  const grandTotalCalc = period === "year" 
    ? calculateGroupYearlyTotal(filteredOperators)
    : calculateGroupTotalHours(filteredOperators);

  return (
    <div className="mt-2 border border-border rounded-lg flex w-full min-w-0 overflow-hidden relative isolate">
      {/* Fixed label column - matches ScheduleGroup employee column */}
      <div 
        className="flex-shrink-0 border-r border-border bg-emerald-50 dark:bg-emerald-950/30 flex items-center relative z-50" 
        style={{ width: `${employeeColumnWidth}px` }}
      >
        <div className="px-3 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Clock className="h-4 w-4" />
          ОБЩИЙ ИТОГ:
        </div>
      </div>
      
      {/* Blur overlays - matching calendar container */}
      <div
        className="absolute top-0 bottom-0 w-10 pointer-events-none z-[60]"
        style={{ left: `${employeeColumnWidth}px` }}
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
        className="flex-1 min-w-0 overflow-x-auto overflow-y-scroll scrollbar-overlay relative isolate"
      >
        <div style={calendarGridStyle} className="pl-2 pr-6 py-1.5 items-center">
          {period === "year" ? (
            <>
              {months.map((month) => {
                let monthTotal = 0;
                filteredOperators.forEach(op => {
                  const mh = calculateMonthHours(op, month);
                  monthTotal += mh.hours * 60 + mh.minutes;
                });
                const h = Math.floor(monthTotal / 60);
                const m = monthTotal % 60;
                return (
                  <div 
                    key={month.toISOString()} 
                    className="text-center text-xs font-medium h-[44px] flex items-center justify-center rounded-md bg-gradient-to-b from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                  >
                    {h}ч{m > 0 ? ` ${m}м` : ''}
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
                    "text-center text-xs text-muted-foreground h-[44px] flex items-center justify-center rounded-md",
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
          {/* Grand total cell */}
          <div className="text-center p-1.5 h-[44px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold">
            <div>{grandTotalCalc.hours}ч</div>
            {grandTotalCalc.minutes > 0 && <div className="text-[10px] opacity-80">{grandTotalCalc.minutes}м</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
