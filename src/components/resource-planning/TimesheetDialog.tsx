import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { format, addDays, endOfMonth, isSameDay, startOfDay, isAfter } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Check, Save, RotateCcw, Undo2, Hammer, ArrowRight, Info, CheckSquare, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  useOperatorTimesheets, 
  useBulkUpsertTimesheets,
  createTimesheetMap,
  getTimesheetForDate,
} from "@/hooks/useOperatorTimesheets";
import { useOvertimeEntries, createOvertimeMap } from "@/hooks/useOvertimeEntries";
import { getTimesheetSettings } from "@/hooks/useTimesheetSettings";

interface TimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date;
  plannedMinutesPerDay: (date: Date) => number;
  compensationMinutesPerDay?: (date: Date) => number;
  confirmedCompensationMinutesPerDay?: (date: Date) => number;
}

export const TimesheetDialog: React.FC<TimesheetDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
  plannedMinutesPerDay,
  compensationMinutesPerDay,
  confirmedCompensationMinutesPerDay,
}) => {
  const { data: timesheets = [], isLoading } = useOperatorTimesheets(startDate, endDate, [operatorId]);
  const { data: overtimeEntries = [] } = useOvertimeEntries(startDate, endDate, [operatorId]);
  const bulkUpsert = useBulkUpsertTimesheets();
  
  const timesheetMap = useMemo(() => createTimesheetMap(timesheets), [timesheets]);
  const overtimeMap = useMemo(() => createOvertimeMap(overtimeEntries), [overtimeEntries]);

  // Generate days array
  const days = useMemo(() => {
    const result: Date[] = [];
    let current = startDate;
    while (current <= endDate) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);
  
  // Local state for edits
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  
  const hasEdits = Object.keys(edits).length > 0;
  const hasSelection = selectedDays.size > 0;
  
  // Check if "Fill by plan" should be restricted - MUST be before functions that use it
  const settings = getTimesheetSettings();
  const today = new Date();
  const lastDayOfMonth = endOfMonth(endDate);
  const isLastDayOfMonth = isSameDay(today, lastDayOfMonth);
  const canFillByPlan = !settings.restrictFillByPlanToLastDay || isLastDayOfMonth;
  
  // Days with plan > 0 AND not in the future
  const todayStart = startOfDay(today);
  
  // Check if a date is in the future (cannot be selected)
  const isFutureDate = (day: Date) => isAfter(startOfDay(day), todayStart);
  
  const selectableDays = useMemo(() => 
    days
      .filter(day => plannedMinutesPerDay(day) > 0 && !isFutureDate(day))
      .map(day => format(day, "yyyy-MM-dd")),
    [days, plannedMinutesPerDay, todayStart]
  );
  
  const allSelected = selectableDays.length > 0 && selectableDays.every(d => selectedDays.has(d));
  
  const toggleDay = (dateStr: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };
  
  const toggleAll = () => {
    if (allSelected) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(selectableDays));
    }
  };
  
  const fillSelectedByPlan = () => {
    if (!canFillByPlan) {
      toast.error("Заполнение по плану доступно только в последний день месяца");
      return;
    }
    const newEdits: Record<string, number> = { ...edits };
    selectedDays.forEach(dateStr => {
      const day = new Date(dateStr);
      const planned = plannedMinutesPerDay(day);
      if (planned > 0) {
        newEdits[dateStr] = planned;
      }
    });
    setEdits(newEdits);
    setSelectedDays(new Set());
    toast.success(`Заполнено ${selectedDays.size} дней по плану`);
  };
  
  const clearSelectedDays = () => {
    const newEdits: Record<string, number> = { ...edits };
    selectedDays.forEach(dateStr => {
      newEdits[dateStr] = 0;
    });
    setEdits(newEdits);
    setSelectedDays(new Set());
    toast.success(`Обнулено ${selectedDays.size} дней`);
  };
  
  const handleSave = async () => {
    const entries = Object.entries(edits).map(([dateStr, actualMinutes]) => ({
      operator_id: operatorId,
      work_date: dateStr,
      planned_minutes: Math.round(plannedMinutesPerDay(new Date(dateStr))),
      actual_minutes: Math.round(actualMinutes),
    }));
    
    if (entries.length === 0) {
      onOpenChange(false);
      return;
    }
    
    try {
      await bulkUpsert.mutateAsync(entries);
      toast.success(`Сохранено ${entries.length} записей`);
      setEdits({});
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    }
  };
  
  
  const handleFillPlan = () => {
    if (!canFillByPlan) {
      toast.error("Заполнение по плану доступно только в последний день месяца");
      return;
    }
    
    const newEdits: Record<string, number> = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const planned = plannedMinutesPerDay(day);
      // plannedMinutesPerDay is BASE plan only (without pending compensation)
      // Compensation hours are added to fact after confirmation
      if (planned > 0) {
        newEdits[dateStr] = planned;
      }
    });
    setEdits(newEdits);
  };
  
  const handleClearAll = () => {
    const newEdits: Record<string, number> = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      newEdits[dateStr] = 0;
    });
    setEdits(newEdits);
    setShowClearConfirm(false);
    toast.success("Все фактические значения обнулены");
  };
  
  const handleResetChanges = () => {
    setEdits({});
    toast.info("Изменения сброшены");
  };
  
  // Calculate totals
  const totals = useMemo(() => {
    let basePlanned = 0;
    let pendingCompensation = 0;
    let confirmedCompensation = 0;
    let actualRegular = 0;
    let approvedOvertime = 0;

    days.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");

      // Base planned (without compensation)
      basePlanned += plannedMinutesPerDay(day);
      
      // Pending compensation (will be added after confirmation)
      pendingCompensation += compensationMinutesPerDay?.(day) || 0;
      
      // Confirmed compensation (already worked and confirmed - counts as actual)
      confirmedCompensation += confirmedCompensationMinutesPerDay?.(day) || 0;

      // Regular fact minutes (without overtime)
      if (edits[dateStr] !== undefined) {
        actualRegular += edits[dateStr];
      } else {
        const ts = getTimesheetForDate(timesheetMap, operatorId, day);
        if (ts) {
          actualRegular += ts.actual_minutes;
        }
      }

      // Approved overtime minutes (from overtime entries)
      const overtimeKey = `${operatorId}_${dateStr}`;
      const entries = overtimeMap.get(overtimeKey) || [];
      approvedOvertime += entries
        .filter((e) => e.status === "approved")
        .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    });

    // Display plan = base + pending compensation (target to work)
    const displayPlanned = basePlanned + pendingCompensation;
    // Actual total = regular work + approved overtime + confirmed compensation
    const actualTotal = actualRegular + approvedOvertime + confirmedCompensation;

    return { 
      basePlanned, 
      displayPlanned, 
      pendingCompensation, 
      confirmedCompensation,
      actualRegular, 
      approvedOvertime, 
      actualTotal 
    };
  }, [days, edits, timesheetMap, operatorId, plannedMinutesPerDay, compensationMinutesPerDay, confirmedCompensationMinutesPerDay, overtimeMap]);

  const formatMinutes = (m: number) => {
    const rounded = Math.round(m);
    const isNegative = rounded < 0;
    const absM = Math.abs(rounded);
    const h = Math.floor(absM / 60);
    const mins = absM % 60;
    const sign = isNegative ? '-' : '';
    return mins > 0 ? `${sign}${h}ч ${mins}м` : `${sign}${h}ч`;
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Табель: {operatorName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Период: </span>
                <span className="font-medium">
                  {format(startDate, "d MMM", { locale: ru })} — {format(endDate, "d MMM yyyy", { locale: ru })}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {hasEdits && (
                  <Button variant="ghost" size="sm" onClick={handleResetChanges} className="h-7 px-2 text-xs">
                    <Undo2 className="h-3 w-3 mr-1" />
                    Сбросить
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(true)} className="h-7 px-2 text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Обнулить
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleFillPlan} 
                        className="h-7 px-2 text-xs"
                        disabled={!canFillByPlan}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        По плану
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canFillByPlan && (
                    <TooltipContent>
                      <p className="text-xs">Заполнение по плану доступно только в последний день месяца</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
            {/* Settings indicator */}
            {settings.restrictFillByPlanToLastDay && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded">
                <Info className="h-3 w-3 shrink-0" />
                <span>
                  Заполнение по плану ограничено последним днём месяца
                  {!canFillByPlan && (
                    <span className="text-amber-600 ml-1">
                      (до {format(lastDayOfMonth, "d MMMM", { locale: ru })})
                    </span>
                  )}
                  {canFillByPlan && (
                    <span className="text-green-600 ml-1">(доступно сегодня)</span>
                  )}
                </span>
              </div>
            )}
            {/* Selection controls */}
            {hasSelection && (
              <div className="flex items-center gap-2 text-xs bg-primary/10 px-2 py-1.5 rounded">
                <CheckSquare className="h-3 w-3 text-primary shrink-0" />
                <span className="text-primary font-medium">Выбрано: {selectedDays.size}</span>
                <div className="flex gap-1 ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={fillSelectedByPlan}
                          disabled={!canFillByPlan}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          По плану
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canFillByPlan && (
                      <TooltipContent>
                        <p className="text-xs">Заполнение по плану доступно только в последний день месяца</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={clearSelectedDays}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Обнулить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedDays(new Set())}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 -mx-6 px-6 min-h-0 overflow-y-auto">
            <div className="space-y-1 py-2">
              {/* Select all row - only show on last day of month */}
              {canFillByPlan && (
                <div className="flex items-center gap-3 py-1 px-2 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={toggleAll}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {allSelected ? "Снять выделение" : "Выбрать все рабочие дни"}
                  </span>
                </div>
              )}
              
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                // Base planned minutes (without pending compensation) - used for "Fill by Plan"
                const basePlanned = plannedMinutesPerDay(day);
                // Pending compensation minutes (not yet worked/confirmed)
                const pendingCompensationMinutes = compensationMinutesPerDay?.(day) || 0;
                // Confirmed compensation minutes (already worked and confirmed)
                const confirmedCompensationMinutes = confirmedCompensationMinutesPerDay?.(day) || 0;
                // Display plan = base + pending compensation (target to work)
                const displayPlanned = basePlanned + pendingCompensationMinutes;
                const hasPendingCompensation = pendingCompensationMinutes > 0;
                const hasConfirmedCompensation = confirmedCompensationMinutes > 0;
                const ts = getTimesheetForDate(timesheetMap, operatorId, day);
                
                // Get approved overtime for this day
                const overtimeKey = `${operatorId}_${dateStr}`;
                const dayOvertimeEntries = overtimeMap.get(overtimeKey) || [];
                const approvedOT = dayOvertimeEntries.filter(e => e.status === "approved");
                const pendingOT = dayOvertimeEntries.filter(e => e.status === "pending");
                const approvedMinutes = approvedOT.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
                const pendingMinutes = pendingOT.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
                
                // Regular minutes (from edits or timesheet)
                const regularMinutes = edits[dateStr] ?? ts?.actual_minutes ?? 0;
                // Total fact = regular + approved overtime + confirmed compensation
                const totalFactMinutes = regularMinutes + approvedMinutes + confirmedCompensationMinutes;
                
                const hasEdit = edits[dateStr] !== undefined;
                // Show green checkmark only if saved AND saved value > 0
                const hasSavedPositive = ts && ts.actual_minutes > 0 && !hasEdit;
                const isSelected = selectedDays.has(dateStr);
                const isFuture = isFutureDate(day);
                // Non-working day = base plan is 0 AND no pending compensation
                const isNonWorkingDay = basePlanned === 0 && pendingCompensationMinutes === 0;
                // Can select only working days that are not in the future
                const canSelect = !isNonWorkingDay && !isFuture;
                // Disable input for future dates OR non-working days
                const isDisabled = isFuture || isNonWorkingDay;
                
                return (
                  <div 
                    key={dateStr} 
                    className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground px-2 py-1.5",
                      isSelected && "bg-primary/5",
                      isDisabled && "opacity-50"
                    )}
                  >
                    {/* Checkbox - only show on last day of month */}
                    {canFillByPlan ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => canSelect && toggleDay(dateStr)}
                        disabled={!canSelect}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className={cn("h-4 w-4", canSelect ? "text-muted-foreground" : "text-muted-foreground/30")} />
                        )}
                      </Button>
                    ) : (
                      <div className="w-6 shrink-0" /> 
                    )}
                    
                    {/* Date column - fixed width */}
                    <div className="w-[70px] shrink-0 text-sm self-start pt-1">
                      {format(day, "EEE, d MMM", { locale: ru })}
                    </div>
                    
                    {/* Plan + Compensation column - vertical layout */}
                    <div className="w-[95px] shrink-0 flex flex-col gap-0.5 self-start">
                      {/* Plan row */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">План:</span>
                        <span className="text-xs font-medium">{formatMinutes(basePlanned)}</span>
                        {hasSavedPositive && (
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                        )}
                      </div>
                      
                      {/* Pending compensation row (under plan) */}
                      {hasPendingCompensation && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-amber-600">
                              <span className="text-xs">Отработка:</span>
                              <span className="text-xs font-medium">+{formatMinutes(pendingCompensationMinutes)}</span>
                              <Hammer className="h-3 w-3 shrink-0 animate-pulse" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Ожидает отработки за пропущенный день</p>
                            <p className="text-xs">Добавится к факту после подтверждения</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Confirmed compensation row */}
                      {hasConfirmedCompensation && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-green-600">
                              <span className="text-xs">Отработка:</span>
                              <span className="text-xs font-medium">+{formatMinutes(confirmedCompensationMinutes)}</span>
                              <Check className="h-3 w-3 shrink-0" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Отработка подтверждена</p>
                            <p className="text-xs">Учтено в факте</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Fact column - vertical layout aligned with plan column */}
                    <div className="w-[160px] shrink-0 flex flex-col gap-0.5 self-start">
                      {/* Main fact row */}
                      <div className="flex items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className="w-[60px] h-7 text-sm"
                                value={Math.round(regularMinutes)}
                                onChange={(e) => {
                                  if (isDisabled) return;
                                  const rawValue = e.target.value;
                                  if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                    const val = parseInt(rawValue) || 0;
                                    setEdits(prev => ({ ...prev, [dateStr]: Math.max(0, val) }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e') {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="мин"
                                disabled={isDisabled}
                              />
                            </span>
                          </TooltipTrigger>
                          {isDisabled && (
                            <TooltipContent>
                              <p className="text-xs">
                                {isFuture ? "Нельзя заполнять будущие даты" : "Нерабочий день по графику"}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <span className={cn("text-xs shrink-0", isDisabled ? "text-muted-foreground/50" : "text-muted-foreground")}>
                          мин ={formatMinutes(regularMinutes)}
                        </span>
                      </div>
                      
                      {/* Pending compensation input row (aligned under minutes input) */}
                      {hasPendingCompensation && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            className="w-[60px] h-7 text-sm bg-amber-50/50 border-amber-200 text-amber-700"
                            value={Math.round(pendingCompensationMinutes)}
                            disabled
                          />
                          <span className="text-xs text-amber-600 shrink-0">
                            мин +{formatMinutes(pendingCompensationMinutes)}
                          </span>
                        </div>
                      )}
                      
                      {/* Confirmed compensation input row */}
                      {hasConfirmedCompensation && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            className="w-[60px] h-7 text-sm bg-green-50 border-green-200 text-green-700"
                            value={Math.round(confirmedCompensationMinutes)}
                            disabled
                          />
                          <span className="text-xs text-green-600 shrink-0">
                            мин +{formatMinutes(confirmedCompensationMinutes)}
                          </span>
                        </div>
                      )}
                      
                      {/* Approved overtime row */}
                      {approvedMinutes > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                className="w-[60px] h-7 text-sm bg-purple-50 border-purple-200 text-purple-700"
                                value={Math.round(approvedMinutes)}
                                disabled
                              />
                              <span className="text-xs text-purple-600 shrink-0">
                                мин +{formatMinutes(approvedMinutes)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Переработка: {approvedOT.map(e => e.description).join(", ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {/* Total row when there are multiple components */}
                      {(approvedMinutes > 0 || hasConfirmedCompensation) && regularMinutes > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5 border-t border-dashed">
                          <div className="w-[60px] h-6 flex items-center justify-center">
                            <span className="text-xs text-primary font-semibold">Итого:</span>
                          </div>
                          <span className="text-xs text-primary font-semibold">
                            {formatMinutes(totalFactMinutes)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action column - fixed width */}
                    <div className="w-8 shrink-0 flex flex-col items-center justify-start self-start pt-1">
                      {/* Show fill by plan button only for working days, not future, and when current != base plan */}
                      {!isDisabled && basePlanned > 0 && regularMinutes !== basePlanned ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEdits(prev => ({ ...prev, [dateStr]: basePlanned }))}
                            >
                              <ArrowRight className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Заполнить по плану ({formatMinutes(basePlanned)})</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                    
                    {/* Underage indicator column - fixed width */}
                    <div className="w-[50px] shrink-0 flex items-start justify-start self-start pt-1">
                      {/* Show underage indicator when actual < display plan for working days */}
                      {!isDisabled && totalFactMinutes > 0 && totalFactMinutes < displayPlanned && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="text-xs text-destructive border-destructive/30 bg-destructive/10"
                            >
                              -{formatMinutes(displayPlanned - totalFactMinutes)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Не доработано: {formatMinutes(displayPlanned - totalFactMinutes)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Overtime column - fixed width, show only pending overtime */}
                    <div className="w-[50px] shrink-0 flex items-start justify-center self-start pt-1">
                      {pendingMinutes > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                              ~{formatMinutes(pendingMinutes)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Ожидает подтв.: {pendingOT.map(e => e.description).join(", ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Status column - fixed width, aligned to first row */}
                    <div className="w-10 shrink-0 flex items-start justify-center self-start pt-1">
                      {hasEdit && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">
                          изм.
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">План: </span>
                <span className="font-medium">{formatMinutes(totals.displayPlanned)}</span>
                {totals.pendingCompensation > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 text-xs text-amber-600">
                        (в т.ч. отработка: {formatMinutes(totals.pendingCompensation)})
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Базовый план: {formatMinutes(totals.basePlanned)}</p>
                      <p className="text-xs">+ Ожидает отработки: {formatMinutes(totals.pendingCompensation)}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Факт: </span>
                <span className="font-bold text-primary">{formatMinutes(totals.actualTotal)}</span>
                {totals.actualTotal !== totals.displayPlanned && (
                  <span
                    className={cn(
                      "ml-2 text-xs",
                      totals.actualTotal >= totals.displayPlanned ? "text-green-600" : "text-amber-600"
                    )}
                  >
                    ({totals.actualTotal >= totals.displayPlanned ? "+" : ""}
                    {formatMinutes(totals.actualTotal - totals.displayPlanned)})
                  </span>
                )}
              </div>
              {totals.confirmedCompensation > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Отработано (подтв.): +{formatMinutes(totals.confirmedCompensation)}
                </div>
              )}
              {totals.approvedOvertime > 0 && (
                <div className="text-xs text-purple-600 font-medium">
                  Переработка за период: +{formatMinutes(totals.approvedOvertime)}
                </div>
              )}
            </div>

            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={bulkUpsert.isPending || !hasEdits}>
                <Save className="h-4 w-4 mr-1" />
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Обнулить все фактические значения?</AlertDialogTitle>
            <AlertDialogDescription>
              Все фактические значения за период будут установлены в 0. 
              Для сохранения изменений нужно будет нажать кнопку "Сохранить".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>
              Обнулить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
