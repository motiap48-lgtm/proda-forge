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
import { type OperatorAbsence, isAbsenceReducingPlan } from "@/hooks/useOperatorAbsences";
import { useOvertimeEntries, createOvertimeMap } from "@/hooks/useOvertimeEntries";
import { getTimesheetSettings } from "@/hooks/useTimesheetSettings";

// Extended compensation record with absence_date from parent
interface ExtendedCompensationRecord {
  id: string;
  absence_compensation_id: string;
  operator_id: string;
  compensation_date: string;
  hours_worked: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  status: "pending" | "confirmed";
  absence_date?: string; // Added from parent AbsenceCompensation
}

interface TimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date;
  /**
   * Базовая норма по графику (не должна вычитать больничные/отпуска).
   * Используется для отображения «План» в строке дня.
   */
  plannedMinutesPerDay: (date: Date) => number;
  /**
   * Ограничение редактирования/выбора дней (например, на больничном возвращает 0).
   * Если не задано — считается равным plannedMinutesPerDay.
   */
  editableMinutesPerDay?: (date: Date) => number;
  /**
   * Возвращает отсутствие для дня (если есть). Используется для определения,
   * нужно ли вычитать день из итогового плана (отпуск — да, больничный — нет).
   */
  getAbsenceForDay?: (date: Date) => OperatorAbsence | null;
  compensationMinutesPerDay?: (date: Date) => number;
  confirmedCompensationMinutesPerDay?: (date: Date) => number;
  compensationRecordsForDay?: (date: Date) => ExtendedCompensationRecord[];
}

export const TimesheetDialog: React.FC<TimesheetDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
  plannedMinutesPerDay,
  editableMinutesPerDay,
  getAbsenceForDay,
  compensationMinutesPerDay,
  confirmedCompensationMinutesPerDay,
  compensationRecordsForDay,
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

  const editablePlannedMinutesPerDay = editableMinutesPerDay ?? plannedMinutesPerDay;
  
  // Check if a date is in the future (cannot be selected)
  const isFutureDate = (day: Date) => isAfter(startOfDay(day), todayStart);
  
  const selectableDays = useMemo(() => 
    days
      .filter(day => editablePlannedMinutesPerDay(day) > 0 && !isFutureDate(day))
      .map(day => format(day, "yyyy-MM-dd")),
    [days, editablePlannedMinutesPerDay, todayStart]
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
      const planned = editablePlannedMinutesPerDay(day);
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
      const planned = editablePlannedMinutesPerDay(day);
      // editablePlannedMinutesPerDay = план для редактирования (0 на больничных/отпусках)
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

      // Check if there's an absence that reduces plan (vacation, unpaid leave, etc.)
      const absence = getAbsenceForDay?.(day);
      const shouldReducePlan = absence && isAbsenceReducingPlan(absence.absence_type);
      
      // Base planned: add full schedule UNLESS it's an absence that reduces plan
      if (!shouldReducePlan) {
        basePlanned += plannedMinutesPerDay(day);
      }
      
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
  }, [
    days,
    edits,
    timesheetMap,
    operatorId,
    plannedMinutesPerDay,
    getAbsenceForDay,
    compensationMinutesPerDay,
    confirmedCompensationMinutesPerDay,
    overtimeMap,
  ]);

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
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b z-10 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)] before:absolute before:content-[''] before:h-1 before:-top-1 before:left-0 before:right-0 before:bg-background">
                <tr>
                  {canFillByPlan && (
                    <th className="w-6 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={toggleAll}
                      >
                        {allSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </th>
                  )}
                  <th className="text-left p-1 font-medium text-muted-foreground">Дата</th>
                  <th className="text-left p-1 font-medium text-muted-foreground">План</th>
                  <th className="text-center p-1 font-medium text-muted-foreground w-14">мин</th>
                  <th className="text-left p-1 font-medium text-muted-foreground">Факт</th>
                  <th className="w-6 p-1"></th>
                  <th className="w-10 p-1"></th>
                </tr>
              </thead>
              <tbody>
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const basePlanned = plannedMinutesPerDay(day);
                const editablePlanned = editablePlannedMinutesPerDay(day);
                const pendingCompensationMinutes = compensationMinutesPerDay?.(day) || 0;
                const confirmedCompensationMinutes = confirmedCompensationMinutesPerDay?.(day) || 0;
                const displayPlanned = basePlanned + pendingCompensationMinutes;
                const hasPendingCompensation = pendingCompensationMinutes > 0;
                const hasConfirmedCompensation = confirmedCompensationMinutes > 0;
                const ts = getTimesheetForDate(timesheetMap, operatorId, day);
                
                // Get compensation records with absence dates
                const dayCompensationRecords = compensationRecordsForDay?.(day) || [];
                const pendingRecords = dayCompensationRecords.filter(r => r.status === 'pending');
                const confirmedRecords = dayCompensationRecords.filter(r => r.status === 'confirmed');
                
                // Get unique absence dates for display
                const pendingAbsenceDates = [...new Set(pendingRecords.map(r => r.absence_date).filter(Boolean))];
                const confirmedAbsenceDates = [...new Set(confirmedRecords.map(r => r.absence_date).filter(Boolean))];
                
                const overtimeKey = `${operatorId}_${dateStr}`;
                const dayOvertimeEntries = overtimeMap.get(overtimeKey) || [];
                const approvedOT = dayOvertimeEntries.filter(e => e.status === "approved");
                const pendingOT = dayOvertimeEntries.filter(e => e.status === "pending");
                const approvedMinutes = approvedOT.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
                const pendingMinutes = pendingOT.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
                
                const regularMinutes = edits[dateStr] ?? ts?.actual_minutes ?? 0;
                const totalFactMinutes = regularMinutes + approvedMinutes + confirmedCompensationMinutes;
                
                const hasEdit = edits[dateStr] !== undefined;
                const hasSavedPositive = ts && ts.actual_minutes > 0 && !hasEdit;
                const isSelected = selectedDays.has(dateStr);
                const isFuture = isFutureDate(day);
                // Для редактирования день считается «нерабочим», если его нельзя заполнять (например, больничный)
                const isNonWorkingDay = editablePlanned === 0 && pendingCompensationMinutes === 0;
                const canSelect = !isNonWorkingDay && !isFuture;
                const isDisabled = isFuture || isNonWorkingDay;
                
                const hasExtraRows = hasPendingCompensation || hasConfirmedCompensation || approvedMinutes > 0;
                
                return (
                  <React.Fragment key={dateStr}>
                    {/* Main row */}
                    <tr className={cn(
                      "border-b border-border/50",
                      isSelected && "bg-primary/5",
                      isDisabled && "opacity-50"
                    )}>
                      {/* Checkbox */}
                      {canFillByPlan && (
                        <td className="p-1 align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => canSelect && toggleDay(dateStr)}
                            disabled={!canSelect}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Square className={cn("h-3.5 w-3.5", canSelect ? "text-muted-foreground" : "text-muted-foreground/30")} />
                            )}
                          </Button>
                        </td>
                      )}
                      
                      {/* Date */}
                      <td className="p-1 align-top whitespace-nowrap">
                        {format(day, "EEE, d MMM", { locale: ru })}
                      </td>
                      
                      {/* Plan */}
                      <td className="p-1 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatMinutes(basePlanned)}</span>
                          {hasSavedPositive && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                      </td>
                      
                      {/* Input */}
                      <td className="p-1 align-top">
                        {(() => {
                          // Highlight if there's a plan but no fact entered (and not a future/disabled day)
                          const shouldHighlight = !isDisabled && basePlanned > 0 && regularMinutes === 0;
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  className={cn(
                                    "h-6 w-14 text-xs text-center px-1",
                                    shouldHighlight && "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/20"
                                  )}
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
                                  placeholder="0"
                                  disabled={isDisabled}
                                />
                              </TooltipTrigger>
                              {(isDisabled || shouldHighlight) && (
                                <TooltipContent>
                                  <p className="text-xs">
                                    {isFuture 
                                      ? "Нельзя заполнять будущие даты" 
                                      : isNonWorkingDay 
                                        ? "Нерабочий день"
                                        : "Не заполнено (план: " + formatMinutes(basePlanned) + ")"
                                    }
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })()}
                      </td>
                      
                      {/* Result */}
                      <td className="p-1 align-top whitespace-nowrap text-muted-foreground">
                        ={formatMinutes(regularMinutes)}
                      </td>
                      
                      {/* Action - hide arrow if already has value */}
                      <td className="p-1 align-top">
                        {!isDisabled && basePlanned > 0 && regularMinutes === 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => setEdits(prev => ({ ...prev, [dateStr]: basePlanned }))}
                              >
                                <ArrowRight className="h-3 w-3 text-muted-foreground hover:text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">По плану ({formatMinutes(basePlanned)})</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      
                      {/* Status */}
                      <td className="p-1 align-top">
                        <div className="flex items-center gap-0.5 flex-wrap justify-end">
                          {/* Show deficit if fact < base plan (without counting pending compensation as deficit) */}
                          {/* Once compensation is confirmed, it's part of fact, so no deficit for that portion */}
                          {!isDisabled && basePlanned > 0 && totalFactMinutes < basePlanned && (
                            <span className="text-destructive font-medium text-[10px]">
                              -{formatMinutes(basePlanned - totalFactMinutes)}
                            </span>
                          )}
                          {hasEdit && (
                            <Badge className="text-[9px] px-0.5 py-0 bg-amber-100 text-amber-700 h-4">
                              изм
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Pending compensation row */}
                    {hasPendingCompensation && (
                      <tr className={cn("bg-amber-50/30", isSelected && "bg-primary/5")}>
                        {canFillByPlan && <td />}
                        <td className="p-1 pl-2 text-amber-600/70 text-[10px]">
                          {format(day, "d.MM", { locale: ru })}
                        </td>
                        <td className="p-1" colSpan={1}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-amber-600">
                                <span className="text-[10px]">Отработка:</span>
                                <span className="font-medium">+{formatMinutes(pendingCompensationMinutes)}</span>
                                {pendingAbsenceDates.length > 0 && (
                                  <span className="text-[9px] text-amber-500">
                                    за {pendingAbsenceDates.map(d => format(new Date(d!), "dd.MM.yy")).join(", ")}
                                  </span>
                                )}
                                <Hammer className="h-3 w-3 animate-pulse" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {pendingAbsenceDates.map(d => (
                                <p key={d} className="text-xs">Отработка за {format(new Date(d!), "d MMMM yyyy", { locale: ru })}</p>
                              ))}
                              <p className="text-xs text-muted-foreground">Добавится после подтверждения</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs text-center px-1 bg-amber-50 border-amber-200 text-amber-700"
                            value={Math.round(pendingCompensationMinutes)}
                            disabled
                          />
                        </td>
                        <td className="p-1 text-amber-600 whitespace-nowrap">
                          +{formatMinutes(pendingCompensationMinutes)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    )}
                    
                    {/* Confirmed compensation row */}
                    {hasConfirmedCompensation && (
                      <tr className={cn("bg-green-50/30", isSelected && "bg-primary/5")}>
                        {canFillByPlan && <td />}
                        <td className="p-1 pl-2 text-green-600/70 text-[10px]">
                          {format(day, "d.MM", { locale: ru })}
                        </td>
                        <td className="p-1" colSpan={1}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-green-600">
                                <span className="text-[10px]">Отработка:</span>
                                <span className="font-medium">+{formatMinutes(confirmedCompensationMinutes)}</span>
                                {confirmedAbsenceDates.length > 0 && (
                                  <span className="text-[9px] text-green-500">
                                    за {confirmedAbsenceDates.map(d => format(new Date(d!), "dd.MM.yy")).join(", ")}
                                  </span>
                                )}
                                <Check className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {confirmedAbsenceDates.map(d => (
                                <p key={d} className="text-xs">Отработка за {format(new Date(d!), "d MMMM yyyy", { locale: ru })}</p>
                              ))}
                              <p className="text-xs text-green-600">✓ Подтверждено</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs text-center px-1 bg-green-50 border-green-200 text-green-700"
                            value={Math.round(confirmedCompensationMinutes)}
                            disabled
                          />
                        </td>
                        <td className="p-1 text-green-600 whitespace-nowrap">
                          +{formatMinutes(confirmedCompensationMinutes)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    )}
                    
                    {/* Overtime row */}
                    {approvedMinutes > 0 && (
                      <tr className={cn("bg-purple-50/30", isSelected && "bg-primary/5")}>
                        {canFillByPlan && <td />}
                        <td />
                        <td className="p-1 pl-2" colSpan={1}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-purple-600">
                                <span className="text-[10px]">Перераб.:</span>
                                <span className="font-medium">+{formatMinutes(approvedMinutes)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{approvedOT.map(e => e.description).join(", ")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs text-center px-1 bg-purple-50 border-purple-200 text-purple-700"
                            value={Math.round(approvedMinutes)}
                            disabled
                          />
                        </td>
                        <td className="p-1 text-purple-600 whitespace-nowrap">
                          +{formatMinutes(approvedMinutes)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    )}
                    
                    {/* Total row */}
                    {(approvedMinutes > 0 || hasConfirmedCompensation) && regularMinutes > 0 && (
                      <tr className={cn("border-b", isSelected && "bg-primary/5")}>
                        {canFillByPlan && <td />}
                        <td />
                        <td className="p-1 pl-2 font-semibold text-primary">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dashed border-primary/50">Итого:</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                <p className="font-medium">Расчёт за {format(day, "d MMMM", { locale: ru })}:</p>
                                <p>Регулярные: {formatMinutes(regularMinutes)}</p>
                                {hasConfirmedCompensation && (
                                  <p className="text-green-600">+ Отработка (подтв.): {formatMinutes(confirmedCompensationMinutes)}</p>
                                )}
                                {approvedMinutes > 0 && (
                                  <p className="text-purple-600">+ Переработка: {formatMinutes(approvedMinutes)}</p>
                                )}
                                <p className="font-semibold border-t pt-0.5 mt-1">= {formatMinutes(totalFactMinutes)}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-1 text-center font-semibold text-primary">
                          {Math.round(totalFactMinutes)}
                        </td>
                        <td className="p-1 font-semibold text-primary whitespace-nowrap">
                          ={formatMinutes(totalFactMinutes)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm space-y-1">
              {/* Plan line */}
              <div>
                <span className="text-muted-foreground">План: </span>
                <span className="font-medium">{formatMinutes(totals.basePlanned)}</span>
                {totals.pendingCompensation > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 text-xs text-amber-600">
                        (недоработка: {formatMinutes(totals.pendingCompensation)})
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Требуется отработать {formatMinutes(totals.pendingCompensation)} за прогулы/отсутствия</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Base Fact (without overtime) - shows if plan was met from regular work */}
              {(() => {
                const baseFact = totals.actualRegular + totals.confirmedCompensation;
                const baseDifference = baseFact - totals.basePlanned;
                return (
                  <div>
                    <span className="text-muted-foreground">
                      {totals.approvedOvertime > 0 ? "Факт (база): " : "Факт: "}
                    </span>
                    <span className="font-bold text-primary">{formatMinutes(baseFact)}</span>
                    {baseFact !== totals.basePlanned && (
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          baseDifference >= 0 ? "text-green-600" : "text-amber-600"
                        )}
                      >
                        ({baseDifference >= 0 ? "+" : ""}
                        {formatMinutes(baseDifference)})
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {/* Overtime - shown separately, above the plan */}
              {totals.approvedOvertime > 0 && (
                <div className="text-purple-600 font-medium">
                  <span>Переработка за период: </span>
                  <span>+{formatMinutes(totals.approvedOvertime)}</span>
                </div>
              )}
              
              {/* Total Fact including overtime */}
              {totals.approvedOvertime > 0 && (
                <div>
                  <span className="text-muted-foreground">Итого факт: </span>
                  <span className="font-bold text-primary">{formatMinutes(totals.actualTotal)}</span>
                </div>
              )}
              
              {/* Confirmed compensation breakdown */}
              {totals.confirmedCompensation > 0 && (
                <div className="text-xs text-green-600">
                  В т.ч. отработка (подтв.): +{formatMinutes(totals.confirmedCompensation)}
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
