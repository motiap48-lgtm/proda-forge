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
import { Clock, Check, Save, RotateCcw, Undo2, Hammer, ArrowRight, Info, TrendingDown, AlertCircle, AlertTriangle, History, Lock } from "lucide-react";
import { UserX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  useOperatorTimesheets, 
  useBulkUpsertTimesheets,
  useBulkUpdateTimesheetStatus,
  createTimesheetMap,
  getTimesheetForDate,
} from "@/hooks/useOperatorTimesheets";
import { type OperatorAbsence, isAbsenceReducingPlan, ABSENCE_TYPE_LABELS } from "@/hooks/useOperatorAbsences";
import { useOvertimeEntries, createOvertimeMap } from "@/hooks/useOvertimeEntries";
import { getTimesheetSettings } from "@/hooks/useTimesheetSettings";
import { useOperatorCompensationBalanceByPeriod } from "@/hooks/useAbsenceCompensations";
import { Skeleton } from "@/components/ui/skeleton";
import { TimesheetHistoryDialog } from "./TimesheetHistoryDialog";
import { TimesheetStatusBadge, type TimesheetStatus } from "./TimesheetStatusBadge";

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
  /**
   * Проверяет, является ли день праздником (calendar exception с is_working_day = false).
   * Для праздников не показываем недоработку, даже если базовый план > 0.
   */
  isCalendarHoliday?: (date: Date) => boolean;
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
  isCalendarHoliday,
}) => {
  const { data: timesheets = [], isLoading } = useOperatorTimesheets(startDate, endDate, [operatorId]);
  const { data: overtimeEntries = [] } = useOvertimeEntries(startDate, endDate, [operatorId]);
  const bulkUpsert = useBulkUpsertTimesheets();
  const bulkUpdateStatus = useBulkUpdateTimesheetStatus();
  
  // Get real compensation balance (absence_hours - confirmed hours)
  const year = startDate.getFullYear();
  const { data: compensationBalanceByPeriod } = useOperatorCompensationBalanceByPeriod(operatorId, startDate);
  
  const timesheetMap = useMemo(() => createTimesheetMap(timesheets), [timesheets]);
  const overtimeMap = useMemo(() => createOvertimeMap(overtimeEntries), [overtimeEntries]);
  
  // Calculate aggregated period status (lowest status among all timesheets with data)
  const periodStatus = useMemo((): TimesheetStatus | null => {
    const statusPriority: Record<TimesheetStatus, number> = {
      pending: 0,
      draft: 0,
      on_review: 1,
      confirmed: 2,
      approved: 3,
    };
    
    const timesheetsWithData = timesheets.filter(ts => ts.actual_minutes > 0);
    if (timesheetsWithData.length === 0) return null;
    
    // Find minimum status (lowest priority = earliest in workflow)
    let minPriority = 999;
    let minStatus: TimesheetStatus = 'pending';
    
    for (const ts of timesheetsWithData) {
      const status = (ts.status || 'pending') as TimesheetStatus;
      const priority = statusPriority[status] ?? 0;
      if (priority < minPriority) {
        minPriority = priority;
        minStatus = status;
      }
    }
    
    return minStatus;
  }, [timesheets]);
  
  // Check if period is locked (all records are confirmed or approved)
  const isPeriodLocked = useMemo(() => {
    const timesheetsWithData = timesheets.filter(ts => ts.actual_minutes > 0);
    if (timesheetsWithData.length === 0) return false;
    
    // Period is locked if ALL records have status 'confirmed' or 'approved'
    return timesheetsWithData.every(ts => 
      ts.status === 'confirmed' || ts.status === 'approved'
    );
  }, [timesheets]);
  
  // Check if a specific day is locked
  const isDayLocked = (dateStr: string): boolean => {
    const ts = timesheets.find(t => t.operator_id === operatorId && t.work_date === dateStr);
    if (!ts || ts.actual_minutes === 0) return false;
    return ts.status === 'confirmed' || ts.status === 'approved';
  };
  
  // Handle bulk status change for entire period
  const handlePeriodStatusChange = async (newStatus: TimesheetStatus) => {
    const timesheetsWithData = timesheets.filter(ts => ts.actual_minutes > 0);
    if (timesheetsWithData.length === 0) {
      toast.error("Нет записей для изменения статуса");
      return;
    }
    
    try {
      await bulkUpdateStatus.mutateAsync({
        entries: timesheetsWithData.map(ts => ({
          operator_id: ts.operator_id,
          work_date: ts.work_date,
        })),
        status: newStatus,
      });
      toast.success(`Статус изменён на "${newStatus === 'on_review' ? 'На проверке' : newStatus === 'confirmed' ? 'Подтверждён' : newStatus === 'approved' ? 'Утверждён' : 'Черновик'}"`);
    } catch (error: any) {
      toast.error("Ошибка смены статуса: " + error.message);
    }
  };

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
  // Local state for deficit notes (reason for working less than plan)
  const [deficitNotes, setDeficitNotes] = useState<Record<string, string>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const hasEdits = Object.keys(edits).length > 0;

  const editablePlannedMinutesPerDay = editableMinutesPerDay ?? plannedMinutesPerDay;
  
  // Check if "Fill by plan" should be restricted - MUST be before functions that use it
  const settings = getTimesheetSettings();
  const today = useMemo(() => new Date(), []);
  const lastDayOfMonth = useMemo(() => endOfMonth(endDate), [endDate]);
  const isLastDayOfMonth = useMemo(() => isSameDay(today, lastDayOfMonth), [today, lastDayOfMonth]);
  
  // Check if we're viewing a past month (restriction shouldn't apply to past months)
  const isPastMonth = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const viewingMonth = endDate.getMonth();
    const viewingYear = endDate.getFullYear();
    return viewingYear < currentYear || (viewingYear === currentYear && viewingMonth < currentMonth);
  }, [today, endDate]);
  
  // Check if there are any unfilled working days (plan > 0) up to today
  // ONLY check saved timesheet data, NOT edits - to prevent button state flickering
  const hasUnfilledWorkingDays = useMemo(() => {
    const todayStart = startOfDay(today);
    
    for (const day of days) {
      // Skip future days
      if (isAfter(startOfDay(day), todayStart)) continue;
      
      // Get editable planned minutes for this day (e.g. absences can make day non-editable)
      const planned = editablePlannedMinutesPerDay(day);
      if (planned <= 0) continue; // Skip non-working days
      
      // Check if this day is filled in saved timesheets
      const timesheet = getTimesheetForDate(timesheetMap, operatorId, day);
      const actualMinutes = timesheet?.actual_minutes || 0;
      
      if (actualMinutes === 0) {
        return true; // Found an unfilled working day
      }
    }
    return false; // All working days are filled
  }, [days, today, editablePlannedMinutesPerDay, timesheetMap, operatorId]);
  
  // Allow fill by plan if: setting is off, OR (it's last day of current month AND not yet filled), OR (viewing past month AND last day is not filled)
  // Key: for past months the restriction is lifted, BUT if all working days are filled, button should be disabled
  const canFillByPlan = useMemo(() => {
    // If all working days up to today are filled, disable the button
    if (!hasUnfilledWorkingDays) return false;
    
    // If restriction is off, allow fill
    if (!settings.restrictFillByPlanToLastDay) return true;
    
    // For past months, allow fill
    if (isPastMonth) return true;
    
    // For current month, only allow on last day
    if (isLastDayOfMonth) return true;
    
    return false;
  }, [settings.restrictFillByPlanToLastDay, isPastMonth, isLastDayOfMonth, hasUnfilledWorkingDays]);
  
  // Days with plan > 0 AND not in the future
  const todayStart = startOfDay(today);
  
  // Check if a date is in the future (cannot be filled)
  const isFutureDate = (day: Date) => isAfter(startOfDay(day), todayStart);
  
  // Check if save is blocked due to missing deficit notes
  const missingDeficitNotes = useMemo(() => {
    const missing: string[] = [];
    Object.entries(edits).forEach(([dateStr, actualMinutes]) => {
      const day = new Date(dateStr);
      const basePlanned = plannedMinutesPerDay(day);
      const isFuture = isFutureDate(day);
      const isCalendarHol = isCalendarHoliday?.(day) ?? false;
      const dayAbsence = getAbsenceForDay?.(day);
      const isNonWorkingDayForEdit = (editablePlannedMinutesPerDay ?? plannedMinutesPerDay)(day) === 0;
      const isHolidayOrWeekend = (isNonWorkingDayForEdit && !dayAbsence) || (isCalendarHol && !dayAbsence);
      
      // Only check for deficit notes on past/present working days where actual < plan
      if (!isFuture && !isHolidayOrWeekend && basePlanned > 0 && actualMinutes < basePlanned) {
        // Check if notes are missing
        if (!deficitNotes[dateStr] || deficitNotes[dateStr].trim() === '') {
          // Also check if there's an existing timesheet with notes
          const ts = getTimesheetForDate(timesheetMap, operatorId, day);
          if (!ts?.notes || ts.notes.trim() === '') {
            missing.push(dateStr);
          }
        }
      }
    });
    return missing;
  }, [edits, deficitNotes, plannedMinutesPerDay, isFutureDate, isCalendarHoliday, getAbsenceForDay, editablePlannedMinutesPerDay, timesheetMap, operatorId]);
  
  const hasMissingDeficitNotes = missingDeficitNotes.length > 0;
  
  const handleSave = async () => {
    // Block save if missing deficit notes
    if (hasMissingDeficitNotes) {
      toast.error("Укажите причину недоработки для всех дней");
      return;
    }
    
    const entries = Object.entries(edits).map(([dateStr, actualMinutes]) => ({
      operator_id: operatorId,
      work_date: dateStr,
      planned_minutes: Math.round(plannedMinutesPerDay(new Date(dateStr))),
      actual_minutes: Math.round(actualMinutes),
      notes: deficitNotes[dateStr] || undefined,
    }));
    
    if (entries.length === 0) {
      onOpenChange(false);
      return;
    }
    
    try {
      await bulkUpsert.mutateAsync(entries);
      toast.success(`Сохранено ${entries.length} записей`);
      setEdits({});
      setDeficitNotes({});
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    }
  };
  
  
  const handleFillPlan = () => {
    if (!canFillByPlan) {
      toast.error("Заполнение по плану доступно только в последний день текущего месяца");
      return;
    }
    
    const newEdits: Record<string, number> = { ...edits };
    let filledCount = 0;
    days.forEach(day => {
      // Never fill future days
      if (isFutureDate(day)) return;

      const dateStr = format(day, "yyyy-MM-dd");
      const planned = editablePlannedMinutesPerDay(day);
      // Only fill if: has plan > 0 AND not already filled (in edits or in saved timesheets)
      const existingTimesheet = getTimesheetForDate(timesheetMap, operatorId, day);
      const currentValue = newEdits[dateStr] !== undefined ? newEdits[dateStr] : (existingTimesheet?.actual_minutes || 0);
      if (planned > 0 && currentValue === 0) {
        newEdits[dateStr] = planned;
        filledCount++;
      }
    });
    setEdits(newEdits);
    if (filledCount > 0) {
      toast.success(`Заполнено ${filledCount} дней по плану`);
    } else {
      toast.info("Все дни уже заполнены");
    }
  };
  
  const handleClearAll = () => {
    const newEdits: Record<string, number> = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      // Only clear days that already have saved data in the database
      const existingTimesheet = getTimesheetForDate(timesheetMap, operatorId, day);
      if (existingTimesheet && existingTimesheet.actual_minutes > 0) {
        newEdits[dateStr] = 0;
      }
    });
    setEdits(newEdits);
    setShowClearConfirm(false);
    const clearedCount = Object.keys(newEdits).length;
    if (clearedCount > 0) {
      toast.success(`Обнулено ${clearedCount} записей`);
    } else {
      toast.info("Нет заполненных записей для обнуления");
    }
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
          <DialogHeader className="pr-8">
            <DialogTitle className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 shrink-0" />
                <span>Табель: {operatorName}</span>
              </div>
              {periodStatus && (
                <div className="flex justify-start">
                  <TimesheetStatusBadge
                    status={periodStatus}
                    onStatusChange={handlePeriodStatusChange}
                    editable={!hasEdits}
                    showActions={!hasEdits}
                  />
                </div>
              )}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowHistory(true)} 
                      className="h-7 px-2 text-xs"
                    >
                      <History className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">История изменений</p>
                  </TooltipContent>
                </Tooltip>
                {hasEdits && !isPeriodLocked && (
                  <Button variant="ghost" size="sm" onClick={handleResetChanges} className="h-7 px-2 text-xs">
                    <Undo2 className="h-3 w-3 mr-1" />
                    Сбросить
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowClearConfirm(true)} 
                        className="h-7 px-2 text-xs"
                        disabled={isPeriodLocked}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Обнулить
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isPeriodLocked && (
                    <TooltipContent>
                      <p className="text-xs">Табель заблокирован (подтверждён/утверждён)</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleFillPlan} 
                        className="h-7 px-2 text-xs"
                        disabled={!canFillByPlan || isPeriodLocked}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        По плану
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {(isPeriodLocked || !canFillByPlan) && (
                    <TooltipContent>
                      <p className="text-xs">
                        {isPeriodLocked 
                          ? "Табель заблокирован (подтверждён/утверждён)" 
                          : "Заполнение по плану доступно только в последний день текущего месяца"
                        }
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
            {/* Settings indicator */}
            {settings.restrictFillByPlanToLastDay && !isPastMonth && (
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
          </div>
          
          {/* Lock warning banner */}
          {isPeriodLocked && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-muted-foreground/20 px-3 py-2 rounded-md mb-2">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>Табель заблокирован — редактирование недоступно (статус: подтверждён/утверждён)</span>
            </div>
          )}
          
          <div className="flex-1 -mx-6 px-6 min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-8 w-14" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b z-10 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)] before:absolute before:content-[''] before:h-1 before:-top-1 before:left-0 before:right-0 before:bg-background">
                <tr>
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
                const isFuture = isFutureDate(day);
                // Check if operator has an absence for this day (admin leave, sick, vacation, etc.)
                const dayAbsence = getAbsenceForDay?.(day);
                // Для редактирования день считается «нерабочим», если его нельзя заполнять (например, больничный)
                const isNonWorkingDay = editablePlanned === 0 && pendingCompensationMinutes === 0;
                // День является праздником (calendar exception)
                const isHoliday = isCalendarHoliday?.(day) ?? false;
                // ВАЖНО: если у сотрудника есть отсутствие (например, адм. с отработкой),
                // то недоработку нужно показывать даже в календарный праздник.
                // Поэтому праздники/выходные скрывают недоработку только когда НЕТ отсутствия.
                const isHolidayOrWeekend = (isNonWorkingDay && !dayAbsence) || (isHoliday && !dayAbsence);
                const isDayLockedStatus = isDayLocked(dateStr);
                const isDisabled = isFuture || isNonWorkingDay || isDayLockedStatus;
                
                const hasExtraRows = hasPendingCompensation || hasConfirmedCompensation || approvedMinutes > 0;
                
                return (
                  <React.Fragment key={dateStr}>
                    {/* Main row */}
                    <tr className={cn(
                      "border-b border-border/50",
                      isDisabled && "opacity-50"
                    )}>
                      
                      {/* Date */}
                      <td className="p-1 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>{format(day, "EEE, d MMM", { locale: ru })}</span>
                          {dayAbsence && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] cursor-help">
                                  {ABSENCE_TYPE_LABELS[dayAbsence.absence_type]?.icon || "📋"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="text-xs space-y-1">
                                  <div className="font-medium flex items-center gap-1">
                                    <UserX className="h-3 w-3" />
                                    {ABSENCE_TYPE_LABELS[dayAbsence.absence_type]?.label || "Отсутствие"}
                                  </div>
                                  {dayAbsence.notes && (
                                    <div className="text-muted-foreground whitespace-pre-line">
                                      {dayAbsence.notes}
                                    </div>
                                  )}
                                  {isAbsenceReducingPlan(dayAbsence.absence_type) && (
                                    <div className="text-blue-600">Уменьшает план</div>
                                  )}
                                  {!isAbsenceReducingPlan(dayAbsence.absence_type) && (
                                    <div className="text-amber-600">Считается недоработкой</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
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
                                      let val = parseInt(rawValue) || 0;
                                      val = Math.max(0, val);
                                      if (basePlanned > 0 && val > basePlanned) {
                                        val = basePlanned;
                                        toast.info("Время сверх плана необходимо оформлять как переработку");
                                      }
                                      setEdits(prev => ({ ...prev, [dateStr]: val }));
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
                                    {isDayLockedStatus
                                      ? "Заблокировано (подтверждён/утверждён)"
                                      : isFuture 
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
                          {/* Show deficit ONLY for past days where fact < plan */}
                          {/* Conditions: 
                               1. Not a future date (day has passed or is today)
                               2. Not a holiday/weekend WITHOUT absence 
                               3. Has plan > 0
                               4. Total fact is less than plan
                               5. OR has absence that requires compensation (pending compensation)
                          */}
                          {(() => {
                            // Calculate deficit for this row
                            const currentActual = edits[dateStr] ?? ts?.actual_minutes ?? 0;
                            const hasDeficit = !isFuture && !isHolidayOrWeekend && basePlanned > 0 && currentActual < basePlanned;
                            const deficitMinutes = basePlanned - currentActual;
                            const hasDeficitNote = deficitNotes[dateStr]?.trim() || ts?.notes?.trim();
                            const needsNote = hasDeficit && hasEdit && !hasDeficitNote;
                            
                            if (hasDeficit) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={cn(
                                      "flex items-center gap-0.5 font-medium text-[10px]",
                                      needsNote ? "text-destructive animate-pulse" : "text-destructive"
                                    )}>
                                      <TrendingDown className="h-3 w-3" />
                                      -{formatMinutes(deficitMinutes)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-medium text-destructive">Недоработка: -{formatMinutes(deficitMinutes)}</p>
                                      {hasDeficitNote && (
                                        <p className="text-muted-foreground">{deficitNotes[dateStr] || ts?.notes}</p>
                                      )}
                                      {needsNote && (
                                        <p className="text-destructive">⚠️ Укажите причину</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                          {isDayLockedStatus && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Заблокировано</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {hasEdit && (
                            <Badge className="text-[9px] px-0.5 py-0 bg-amber-100 text-amber-700 h-4">
                              изм
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Deficit reason row - shown when editing with deficit */}
                    {(() => {
                      const currentActual = edits[dateStr] ?? ts?.actual_minutes ?? 0;
                      const hasDeficit = !isFuture && !isHolidayOrWeekend && basePlanned > 0 && currentActual < basePlanned && hasEdit;
                      const existingNote = ts?.notes || '';
                      
                      if (hasDeficit) {
                        return (
                          <tr className="bg-rose-50/30 dark:bg-rose-900/10">
                            <td className="p-1 pl-2" colSpan={6}>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-rose-600/70 text-[10px] shrink-0">
                                  <AlertCircle className="h-3 w-3 text-rose-500" />
                                  <span>Укажите причину</span>
                                  {!(deficitNotes[dateStr]?.trim() || existingNote?.trim()) && (
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                                <Textarea
                                  value={deficitNotes[dateStr] ?? existingNote}
                                  onChange={(e) => setDeficitNotes(prev => ({ ...prev, [dateStr]: e.target.value }))}
                                  placeholder="Причина недоработки..."
                                  className={cn(
                                    "h-7 min-h-7 text-xs resize-none flex-1",
                                    !(deficitNotes[dateStr]?.trim() || existingNote?.trim()) && 
                                      "border-rose-400 bg-rose-50 dark:bg-rose-900/20 focus:border-rose-500 focus:ring-rose-500/20"
                                  )}
                                  rows={1}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Pending compensation row */}
                    {hasPendingCompensation && (
                      <tr className="bg-amber-50/30">
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
                      <tr className="bg-green-50/30">
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
                      <tr className="bg-purple-50/30">
                        <td />
                        <td className="p-1 pl-2" colSpan={1}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-purple-600">
                                <span className="text-[10px]">Перераб. {format(day, "d MMM", { locale: ru })}:</span>
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
                      <tr className="border-b">
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
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm space-y-1">
              {/* Plan line */}
              <div>
                <span className="text-muted-foreground">План: </span>
                <span className="font-medium">{formatMinutes(totals.basePlanned)}</span>
                {/* Show compensation balance breakdown by period */}
                {compensationBalanceByPeriod && compensationBalanceByPeriod.totalPendingHours > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 text-xs text-amber-600">
                        (недоработка: {Math.round(compensationBalanceByPeriod.totalPendingHours * 10) / 10}ч)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <p className="font-medium border-b pb-1 mb-1">Недоработка к отработке:</p>
                        {compensationBalanceByPeriod.previousMonthsHours > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Прошлые месяцы:</span>
                            <span className="text-orange-600 font-medium">
                              {Math.round(compensationBalanceByPeriod.previousMonthsHours * 10) / 10}ч
                            </span>
                          </div>
                        )}
                        {compensationBalanceByPeriod.currentMonthHours > 0 && (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Текущий месяц:</span>
                            <span className="text-amber-600 font-medium">
                              {Math.round(compensationBalanceByPeriod.currentMonthHours * 10) / 10}ч
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 border-t pt-1 mt-1 font-semibold">
                          <span>Итого:</span>
                          <span>{Math.round(compensationBalanceByPeriod.totalPendingHours * 10) / 10}ч</span>
                        </div>
                      </div>
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

            
            <div className="flex flex-col gap-2 items-end">
              {hasMissingDeficitNotes && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Укажите причину недоработки ({missingDeficitNotes.length})</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={bulkUpsert.isPending || !hasEdits || hasMissingDeficitNotes}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
              </div>
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
      
      <TimesheetHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        operatorId={operatorId}
        operatorName={operatorName}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
};
