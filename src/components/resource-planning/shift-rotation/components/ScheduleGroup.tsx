import React from "react";
import { format, getDay, isToday, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, RefreshCw, RefreshCcw, Pencil, Clock, CalendarCheck, CalendarX, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperatorInfoCard } from "./OperatorInfoCard";
import { getShiftForDate, getCycleDayNumber, parseDateOnly, type ShiftColors, type PeriodType } from "../utils";

interface ScheduleGroupProps {
  scheduleName: string;
  operators: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditOperator?: (operator: any) => void;
  days: Date[];
  months: Date[];
  period: PeriodType;
  daysCount: number;
  shiftColorMap: Map<string, ShiftColors>;
  calendarGridStyle: React.CSSProperties;
  employeeColumnWidth: number;
  isResizing: boolean;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  isTodayColumnHovered: boolean;
  onTodayColumnHover: (hovered: boolean) => void;
  syncingScheduleId: string | null;
  onMassSyncCycleStartDate: (scheduleId: string, scheduleCycleStartDate: string | null, operatorsToSync: any[]) => void;
  registerScrollContainer: (key: string) => (el: HTMLDivElement | null) => void;
  registerVerticalScrollContainer: (key: string) => (el: HTMLDivElement | null) => void;
  handleSyncScroll: (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => void;
  handleSyncVerticalScroll: (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => void;
  calculateTotalHours: (operator: any) => { hours: number; minutes: number };
  calculateMonthHours: (operator: any, month: Date) => { hours: number; minutes: number };
  calculateGroupStats: (ops: any[]) => { workingDays: number; offDays: number; totalHours: number; totalMinutes: number };
  calculateYearlyTotal: (operator: any) => { hours: number; minutes: number };
  calculateGroupYearlyTotal: (ops: any[]) => { hours: number; minutes: number };
  printRef?: React.RefObject<HTMLDivElement>;
  isFirstGroup?: boolean;
}

export const ScheduleGroup: React.FC<ScheduleGroupProps> = ({
  scheduleName,
  operators,
  isCollapsed,
  onToggleCollapse,
  onEditOperator,
  days,
  months,
  period,
  daysCount,
  shiftColorMap,
  calendarGridStyle,
  employeeColumnWidth,
  isResizing,
  onResizeMouseDown,
  isTodayColumnHovered,
  onTodayColumnHover,
  syncingScheduleId,
  onMassSyncCycleStartDate,
  registerScrollContainer,
  registerVerticalScrollContainer,
  handleSyncScroll,
  handleSyncVerticalScroll,
  calculateTotalHours,
  calculateMonthHours,
  calculateGroupStats,
  calculateYearlyTotal,
  calculateGroupYearlyTotal,
  printRef,
  isFirstGroup,
}) => {
  const schedule = operators[0]?.work_schedules;
  const isCyclicSchedule = schedule?.schedule_type === 'cyclic';
  const scheduleId = schedule?.id;
  const scheduleCycleStartDate = schedule?.cycle_start_date;
  const groupStats = calculateGroupStats(operators);

  return (
    <div>
      {/* Group header */}
      <div className="mb-2">
        <div className="text-left text-sm font-medium text-muted-foreground px-2 py-1.5 bg-muted/50 rounded flex items-center gap-2 border border-border/40">
          <button 
            className="flex items-center gap-2 hover:bg-muted/70 rounded px-1 py-0.5 transition-colors flex-1 min-w-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="truncate">{scheduleName} ({operators.length})</span>
            {isCyclicSchedule && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
                {schedule?.cycle_days_on || 2}/{schedule?.cycle_days_off || 2}
              </Badge>
            )}
          </button>
          
          {/* Mass sync button for cyclic schedules */}
          {isCyclicSchedule && scheduleId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs gap-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
                  disabled={syncingScheduleId === scheduleId}
                >
                  {syncingScheduleId === scheduleId ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" />
                  )}
                  Синхр. всех
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Синхронизировать даты начала цикла?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Для всех {operators.length} операторов графика "{scheduleName}" будет установлена дата начала цикла: 
                    <strong className="block mt-1">
                      {scheduleCycleStartDate 
                        ? format(parseDateOnly(scheduleCycleStartDate) || new Date(), 'd MMMM yyyy', { locale: ru })
                        : 'Не указана (требуется настроить график)'}
                    </strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onMassSyncCycleStartDate(scheduleId, scheduleCycleStartDate, operators)}
                    disabled={!scheduleCycleStartDate}
                  >
                    Синхронизировать
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Animated content wrapper */}
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className={cn("overflow-hidden", isCollapsed && "overflow-hidden")}>
          {/* Flex container: fixed employee column + single calendar scroll container */}
          <div
            ref={isFirstGroup ? printRef : undefined}
            className="border border-border rounded-lg flex w-full min-w-0 max-h-[60vh] overflow-hidden relative isolate"
            style={{ ["--sr-header-h" as any]: "76px" }}
          >
            {/* Employee column */}
            <div className="flex-shrink-0 border-r border-border bg-background flex flex-col relative z-50" style={{ width: `${employeeColumnWidth}px` }}>
              <div
                className="flex-shrink-0 bg-muted/30 text-base font-semibold text-foreground px-3 py-2 h-[var(--sr-header-h)] flex items-center gap-2 border-b border-border mb-1"
                style={{ boxShadow: "0 2px 4px -2px hsl(var(--border) / 0.5)" }}
              >
                <Users className="h-5 w-5 text-muted-foreground" />
                Сотрудники
              </div>
              
              <div 
                ref={registerVerticalScrollContainer(`emp-${scheduleName}`)}
                onScroll={handleSyncVerticalScroll(`emp-${scheduleName}`)}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-overlay min-h-0"
              >
                {operators.map((operator) => (
                  <HoverCard key={operator.id} openDelay={300}>
                    <HoverCardTrigger asChild>
                      <div 
                        className={cn(
                          "px-2 h-[52px] flex items-center gap-2 group border-b border-border/50 mb-1",
                          onEditOperator && "hover:bg-muted/50 cursor-pointer"
                        )}
                        onClick={() => onEditOperator?.(operator)}
                      >
                        <span className="text-sm font-medium truncate flex-1">{operator.full_name}</span>
                        {operator.shift_rotation_enabled && (
                          <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        {onEditOperator && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); onEditOperator(operator); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 z-[100]" side="right" align="start">
                      <OperatorInfoCard operator={operator} />
                    </HoverCardContent>
                  </HoverCard>
                ))}
                
                {/* Group summary row */}
                <div className="bg-muted/30 px-2 h-[44px] flex items-center text-xs text-muted-foreground border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-600"><CalendarCheck className="h-3 w-3" />{groupStats.workingDays}</span>
                    <span className="flex items-center gap-1 text-rose-500"><CalendarX className="h-3 w-3" />{groupStats.offDays}</span>
                  </div>
                </div>
              </div>
              
              {/* Resize handle */}
              <div
                className={cn(
                  "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-30",
                  isResizing && "bg-primary/50"
                )}
                onMouseDown={onResizeMouseDown}
              />
            </div>
            
            {/* Edge blur overlays: header + body */}
            {/* Header edge blur */}
            <div
              className="absolute top-0 h-[var(--sr-header-h)] w-12 pointer-events-none z-[90]"
              style={{ left: `${employeeColumnWidth}px` }}
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-r from-background/90 via-background/50 to-transparent backdrop-blur-md" />
            </div>
            <div
              className="absolute top-0 h-[var(--sr-header-h)] right-0 w-12 pointer-events-none z-[90]"
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-l from-background/90 via-background/50 to-transparent backdrop-blur-md" />
            </div>

            {/* Body edge blur */}
            <div
              className="absolute top-[var(--sr-header-h)] bottom-0 w-12 pointer-events-none z-[70]"
              style={{ left: `${employeeColumnWidth}px` }}
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-r from-background/80 via-background/30 to-transparent backdrop-blur-sm" />
            </div>
            <div
              className="absolute top-[var(--sr-header-h)] bottom-0 right-0 w-12 pointer-events-none z-[70]"
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-l from-background/80 via-background/30 to-transparent backdrop-blur-sm" />
            </div>

            {/* Calendar */}
            <div 
              ref={(el) => {
                registerScrollContainer(`schedule-${scheduleName}`)(el);
                registerVerticalScrollContainer(`cal-${scheduleName}`)(el);
              }}
              onScroll={(e) => {
                handleSyncScroll(`schedule-${scheduleName}`)(e);
                handleSyncVerticalScroll(`cal-${scheduleName}`)(e);
              }}
              className="flex-1 min-w-0 overflow-x-auto overflow-y-scroll scrollbar-overlay relative isolate bg-background"
            >
              {/* Sticky calendar header */}
              <div
                className="sticky top-0 z-[80] bg-background relative h-[var(--sr-header-h)]"
                style={{
                  boxShadow: "0 2px 4px -2px hsl(var(--border) / 0.5)",
                }}
              >
                {/* Solid backplate to prevent any bleed-through */}
                <div className="absolute inset-0 bg-background" aria-hidden="true" />

                <div
                  className="relative pl-2 pr-6 py-2 h-full"
                  style={calendarGridStyle}
                >
                  {period === "year" ? (
                    <>
                      {months.map((month) => (
                        <div
                          key={month.toISOString()}
                          className="text-center text-sm p-1 h-[60px] flex flex-col items-center justify-center rounded-md text-muted-foreground bg-gradient-to-b from-muted to-secondary"
                        >
                          <div className="font-medium text-xs">{format(month, "LLL", { locale: ru })}</div>
                        </div>
                      ))}
                      <div className="text-center text-sm p-1 h-[60px] flex flex-col items-center justify-center rounded-md bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                        <Clock className="h-3 w-3 mb-0.5" />
                        <div className="text-[10px]">Год</div>
                      </div>
                    </>
                  ) : (
                    <>
                      {days.map((day, idx) => {
                        const showMonth = idx === 0 || !isSameMonth(day, days[idx - 1]);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                        const isTodayDate = isToday(day);

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "text-center text-sm p-1.5 h-[60px] flex flex-col items-center justify-center rounded-md relative",
                              isTodayDate
                                ? cn(
                                    "bg-gradient-to-b from-cyan-400 to-teal-500 text-white font-semibold shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]",
                                    isTodayColumnHovered && "animate-pulse-glow",
                                  )
                                : isWeekend
                                  ? "bg-gradient-to-b from-rose-200 to-rose-300 dark:from-rose-800 dark:to-rose-900 text-rose-700 dark:text-rose-200"
                                  : "bg-gradient-to-b from-muted to-secondary text-muted-foreground",
                            )}
                            onMouseEnter={() => isTodayDate && onTodayColumnHover(true)}
                            onMouseLeave={() => isTodayDate && onTodayColumnHover(false)}
                          >
                            <div className="font-medium text-xs uppercase">{format(day, "EEE", { locale: ru })}</div>
                            <div
                              className={cn(
                                "text-sm font-semibold",
                                isTodayDate
                                  ? "text-white"
                                  : isWeekend
                                    ? "text-rose-600 dark:text-rose-300"
                                    : "text-foreground",
                              )}
                            >
                              {format(day, "d", { locale: ru })}
                            </div>
                            {(showMonth || daysCount <= 14) && (
                              <div className="text-[10px] opacity-70">{format(day, "MMM", { locale: ru })}</div>
                            )}
                          </div>
                        );
                      })}
                      <div className="text-center text-sm p-1 h-[60px] flex flex-col items-center justify-center rounded-md bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                        <Clock className="h-3 w-3 mb-0.5" />
                        <div className="text-[10px]">Итого</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Calendar body */}
              <div className="pl-2 pr-6 pt-1 pb-1 relative z-0" style={calendarGridStyle}>
                {period === "year" ? (
                  <>
                    {/* Year view - Operator rows */}
                    {operators.map((operator) => {
                      const yearlyTotal = calculateYearlyTotal(operator);
                      return (
                        <React.Fragment key={operator.id}>
                          {months.map((month) => {
                            const monthHours = calculateMonthHours(operator, month);
                            return (
                              <div 
                                key={month.toISOString()} 
                                className="text-center p-1.5 h-[52px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-900/50 text-blue-700 dark:text-blue-300"
                              >
                                <div className="font-medium">{monthHours.hours}ч</div>
                                {monthHours.minutes > 0 && <div className="text-[10px] opacity-80">{monthHours.minutes}м</div>}
                              </div>
                            );
                          })}
                          <div className="text-center p-1.5 h-[52px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                            <div>{yearlyTotal.hours}ч</div>
                            {yearlyTotal.minutes > 0 && <div className="text-[10px]">{yearlyTotal.minutes}м</div>}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Year view - Group summary */}
                    {(() => {
                      const groupYearlyTotal = calculateGroupYearlyTotal(operators);
                      return (
                        <>
                          {months.map((month) => {
                            let monthTotal = 0;
                            operators.forEach(op => { const mh = calculateMonthHours(op, month); monthTotal += mh.hours * 60 + mh.minutes; });
                            const h = Math.floor(monthTotal / 60);
                            const m = monthTotal % 60;
                            return (
                              <div key={month.toISOString()} className="text-center h-[44px] flex items-center justify-center text-[10px] text-muted-foreground bg-gradient-to-b from-muted/30 to-muted/50 border-t border-border">
                                {h}ч{m > 0 ? ` ${m}м` : ''}
                              </div>
                            );
                          })}
                          <div className="text-center p-1.5 h-[44px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold border-t border-border">
                            <div>{groupYearlyTotal.hours}ч</div>
                            {groupYearlyTotal.minutes > 0 && <div className="text-[10px]">{groupYearlyTotal.minutes}м</div>}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* Day view - Operator rows */}
                    {operators.map((operator) => {
                      const totalHours = calculateTotalHours(operator);
                      return (
                        <React.Fragment key={operator.id}>
                          {days.map((day) => {
                            const shift = getShiftForDate(operator, day);
                            const colors = shift ? shiftColorMap.get(shift.shift_name) : null;
                            const netMinutes = shift 
                              ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) 
                              : 0;
                            const hours = Math.floor(netMinutes / 60);
                            const mins = netMinutes % 60;
                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                            const cycleInfo = getCycleDayNumber(operator.work_schedules, day, operator);
                            
                            return (
                              <div 
                                key={day.toISOString()} 
                                className={cn(
                                  "text-center p-1 h-[52px] flex flex-col items-center justify-center rounded-md text-xs transition-colors relative overflow-hidden",
                                  colors 
                                    ? cn(colors.bg, colors.text, "border", colors.border) 
                                    : isWeekend 
                                      ? "bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-900/50" 
                                      : "bg-gradient-to-b from-muted/20 to-muted/40",
                                  isToday(day) && cn(
                                    "shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]",
                                    isTodayColumnHovered && "animate-pulse-glow"
                                  )
                                )}
                                title={cycleInfo ? `День ${cycleInfo.dayInCycle}/${cycleInfo.cycleLength} цикла` : undefined}
                                onMouseEnter={() => isToday(day) && onTodayColumnHover(true)}
                                onMouseLeave={() => isToday(day) && onTodayColumnHover(false)}
                              >
                                {shift ? (
                                  <div className="w-full text-center flex flex-col items-center">
                                    <div className="font-medium truncate text-[10px] px-0.5 w-full" title={shift.shift_name}>
                                      {daysCount > 14 ? shift.shift_name.charAt(0) : shift.shift_name}
                                    </div>
                                    {daysCount <= 14 && <div className="text-[9px] opacity-80 truncate w-full">{mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`}</div>}
                                    {cycleInfo && <div className="text-[8px] opacity-70 font-semibold whitespace-nowrap">Д{cycleInfo.dayInCycle}</div>}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className={cn("text-sm", isWeekend ? "text-rose-400 dark:text-rose-500" : "text-muted-foreground")}>—</span>
                                    {cycleInfo && <div className="text-[8px] opacity-60 font-semibold whitespace-nowrap">Д{cycleInfo.dayInCycle}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="text-center p-1.5 h-[52px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                            <div>{totalHours.hours}ч</div>
                            {totalHours.minutes > 0 && <div className="text-[10px] opacity-80">{totalHours.minutes}м</div>}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Day view - Group summary */}
                    {(() => {
                      return (
                        <>
                          {days.map((day) => (
                            <div key={day.toISOString()} className="text-center h-[44px] flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-b from-muted/30 to-muted/50 border-t border-border">—</div>
                          ))}
                          <div className="text-center p-1.5 h-[44px] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold border-t border-border">
                            <div>{groupStats.totalHours}ч</div>
                            {groupStats.totalMinutes > 0 && <div className="text-[10px]">{groupStats.totalMinutes}м</div>}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
