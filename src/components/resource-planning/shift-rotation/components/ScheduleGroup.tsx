import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import { format, getDay, isToday, isSameMonth, differenceInCalendarDays, startOfDay, isAfter } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, RefreshCw, RefreshCcw, Pencil, Clock, CalendarCheck, CalendarX, Users, Plane, Stethoscope, Briefcase, UserMinus, GripVertical, Ban, FileText, ArrowRightLeft, Timer, ClipboardCheck, Hammer, Check, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { OperatorInfoCard } from "./OperatorInfoCard";
import { getShiftForDate, getCycleDayNumber, parseDateOnly, isWorkingDay, type ShiftColors, type PeriodType } from "../utils";
import { isDateInAbsence, isOperatorTerminated, isBeforeHireDate, useDeleteOperatorAbsence, type OperatorAbsence, ABSENCE_TYPE_LABELS } from "@/hooks/useOperatorAbsences";
import { type CompensationRecord, useConfirmCompensationRecord, useUnconfirmCompensationRecord } from "@/hooks/useAbsenceCompensations";
import { CompensationPendingIcon } from "@/components/resource-planning/CompensationPendingIcon";
import { OperatorTotalTooltip } from "./OperatorTotalTooltip";
import { AbsenceCellDialog } from "@/components/resource-planning/AbsenceCellDialog";
import { CreateAbsenceCellDialog } from "@/components/resource-planning/CreateAbsenceCellDialog";
import { ScheduleOverrideDialog } from "@/components/resource-planning/ScheduleOverrideDialog";
import { BulkScheduleOverrideDialog } from "@/components/resource-planning/BulkScheduleOverrideDialog";
import { CompensationDialog } from "@/components/resource-planning/CompensationDialog";
import { TimesheetDialog } from "@/components/resource-planning/TimesheetDialog";
import { OvertimeMedalBadge } from "@/components/resource-planning/OvertimeMedalBadge";
import { useAbsenceDragDrop } from "../hooks/useAbsenceDragDrop";
import { toast } from "sonner";
import { type ScheduleOverride, getScheduleOverride, OVERRIDE_REASON_LABELS } from "@/hooks/useScheduleOverrides";
import { type OperatorTimesheet, createTimesheetMap, getTimesheetForDate } from "@/hooks/useOperatorTimesheets";
import { type OvertimeEntry, getOvertimeMinutesFromMap } from "@/hooks/useOvertimeEntries";
import { type OperatorOvertimeRanking, getOperatorMedal } from "@/hooks/useOvertimeMedals";

interface CalendarException {
  id: string;
  exception_date: string;
  exception_type: string;
  is_working_day: boolean;
  name: string;
  reduction_hours?: number | null;
}

interface ScheduleGroupProps {
  scheduleName: string;
  operators: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditOperator?: (operator: any) => void;
  onManageAbsences?: (operator: any) => void;
  absences?: OperatorAbsence[];
  scheduleOverrides?: ScheduleOverride[];
  calendarExceptions?: CalendarException[];
  timesheets?: OperatorTimesheet[];
  compensationRecordsMap?: Map<string, CompensationRecord[]>;
  overtimeMap?: Map<string, OvertimeEntry[]>;
  overtimeRankings?: OperatorOvertimeRanking[];
  medalsEnabled?: boolean;
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
  calculateTotalHours: (operator: any, absences?: OperatorAbsence[]) => { hours: number; minutes: number };
  calculatePlanHours: (operator: any) => { hours: number; minutes: number };
  calculateFullPlanHours: (operator: any) => { hours: number; minutes: number };
  calculateMonthHours: (operator: any, month: Date) => { hours: number; minutes: number };
  calculateGroupStats: (ops: any[]) => { workingDays: number; offDays: number; absenceDays: number; totalHours: number; totalMinutes: number };
  calculateYearlyTotal: (operator: any) => { hours: number; minutes: number };
  calculateGroupYearlyTotal: (ops: any[]) => { hours: number; minutes: number };
  getDayMinutes?: (operator: any, day: Date) => number;
  getPlannedDayMinutes?: (operator: any, day: Date) => number;
  printRef?: React.RefObject<HTMLDivElement>;
  isFirstGroup?: boolean;
}

const ScheduleGroupComponent: React.FC<ScheduleGroupProps> = ({
  scheduleName,
  operators,
  isCollapsed,
  onToggleCollapse,
  onEditOperator,
  onManageAbsences,
  absences = [],
  scheduleOverrides = [],
  calendarExceptions = [],
  timesheets = [],
  compensationRecordsMap = new Map(),
  overtimeMap = new Map(),
  overtimeRankings = [],
  medalsEnabled = false,
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
  calculatePlanHours,
  calculateFullPlanHours,
  calculateMonthHours,
  calculateGroupStats,
  calculateYearlyTotal,
  calculateGroupYearlyTotal,
  getDayMinutes,
  getPlannedDayMinutes,
  printRef,
  isFirstGroup,
}) => {
  const isMobile = useIsMobile();
  const schedule = operators[0]?.work_schedules;
  const isCyclicSchedule = schedule?.schedule_type === 'cyclic';
  const scheduleId = schedule?.id;
  const scheduleCycleStartDate = schedule?.cycle_start_date;
  const groupStats = calculateGroupStats(operators);
  
  // Mobile-optimized employee column width
  const mobileEmployeeWidth = isMobile ? Math.min(employeeColumnWidth, 120) : employeeColumnWidth;

  // State for editing absence from cell click
  const [editingCellAbsence, setEditingCellAbsence] = useState<{ absence: OperatorAbsence; operatorName: string } | null>(null);
  
  // State for creating new absence from empty cell click or drag selection
  const [creatingAbsence, setCreatingAbsence] = useState<{ operatorId: string; operatorName: string; date: string; endDate?: string } | null>(null);
  
  // State for drag selection of date range
  const [dragSelection, setDragSelection] = useState<{
    operatorId: string;
    operatorName: string;
    startDate: Date;
    endDate: Date | null;
  } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  
  // State for schedule override dialog
  const [editingOverride, setEditingOverride] = useState<{
    operatorId: string;
    operatorName: string;
    date: Date;
    originalIsWorkingDay: boolean;
    existingOverride?: ScheduleOverride;
    shifts: { shift_number: number; shift_name: string }[];
    scheduleType?: string;
    currentCycleStartDate?: string | null;
  } | null>(null);
  
  // State for bulk schedule override (range selection)
  const [rangeSelection, setRangeSelection] = useState<{
    operatorId: string;
    operatorName: string;
    startDate: Date;
    endDate: Date | null;
  } | null>(null);
  
  // State for bulk override dialog
  const [bulkOverrideDialog, setBulkOverrideDialog] = useState<{
    operatorId: string;
    operatorName: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);
  
  // State for compensation dialog
  const [compensationOperator, setCompensationOperator] = useState<{ id: string; name: string } | null>(null);
  
  // State for timesheet dialog
  const [timesheetOperator, setTimesheetOperator] = useState<{ id: string; name: string } | null>(null);
  
  // Create timesheet map for fast lookup
  const timesheetMap = useMemo(() => createTimesheetMap(timesheets), [timesheets]);
  
  // Hooks for compensation record operations
  const confirmCompensation = useConfirmCompensationRecord();
  const unconfirmCompensation = useUnconfirmCompensationRecord();
  
  // State for unconfirm dialog
  const [unconfirmDialog, setUnconfirmDialog] = useState<{ record: CompensationRecord; operatorName: string } | null>(null);
  
  // State to track recently confirmed records for animation
  const [confirmedAnimations, setConfirmedAnimations] = useState<Set<string>>(new Set());
  
  // Helper to get compensation records for operator on specific date
  const getCompensationRecordsForDate = useCallback((operatorId: string, date: Date): CompensationRecord[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${operatorId}_${dateStr}`;
    return compensationRecordsMap.get(key) || [];
  }, [compensationRecordsMap]);
  
  // Handle confirming a pending compensation record
  const handleConfirmCompensation = useCallback((record: CompensationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compDate = new Date(record.compensation_date);
    compDate.setHours(0, 0, 0, 0);
    
    if (compDate > today) {
      toast.info("Дата отработки ещё не наступила");
      return;
    }
    
    // Add animation
    setConfirmedAnimations(prev => new Set([...prev, record.id]));
    
    // Remove animation after delay
    setTimeout(() => {
      setConfirmedAnimations(prev => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }, 1500);
    
    confirmCompensation.mutate({
      id: record.id,
      absence_compensation_id: record.absence_compensation_id
    });
  }, [confirmCompensation]);
  
  // Handle unconfirming a confirmed compensation record (with dialog)
  const handleUnconfirmCompensation = useCallback((record: CompensationRecord, operatorName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setUnconfirmDialog({ record, operatorName });
  }, []);
  
  // Execute unconfirm after dialog confirmation
  const executeUnconfirm = useCallback(() => {
    if (!unconfirmDialog) return;
    unconfirmCompensation.mutate({
      id: unconfirmDialog.record.id,
      absence_compensation_id: unconfirmDialog.record.absence_compensation_id
    });
    setUnconfirmDialog(null);
  }, [unconfirmDialog, unconfirmCompensation]);

  // Calculate compensation hours for operator across period (only confirmed records count)
  const calculateCompensationHours = useCallback((operatorId: string): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      const records = getCompensationRecordsForDate(operatorId, day);
      records.forEach(record => {
        // Only count confirmed records
        if (record.status === "confirmed") {
          totalMinutes += Math.round(record.hours_worked * 60);
        }
      });
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [days, getCompensationRecordsForDate]);
  
  // Calculate actual worked hours from timesheets
  const calculateActualHours = useCallback((operatorId: string): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      const ts = getTimesheetForDate(timesheetMap, operatorId, day);
      if (ts) {
        totalMinutes += ts.actual_minutes;
      }
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [days, timesheetMap]);
  
  // Check if operator has any timesheet entries
  const hasTimesheetData = useCallback((operatorId: string): boolean => {
    return days.some(day => {
      const ts = getTimesheetForDate(timesheetMap, operatorId, day);
      return ts && ts.actual_minutes > 0;
    });
  }, [days, timesheetMap]);
  
  // Helper to get overtime entries for operator on specific date
  const getOvertimeForDate = useCallback((operatorId: string, date: Date): OvertimeEntry[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${operatorId}_${dateStr}`;
    return overtimeMap.get(key) || [];
  }, [overtimeMap]);
  
  // Calculate overtime hours for operator across period (only approved entries count)
  const calculateOvertimeHours = useCallback((operatorId: string): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      const entries = getOvertimeForDate(operatorId, day);
      entries.forEach(entry => {
        // Only count approved entries
        if (entry.status === "approved") {
          totalMinutes += entry.duration_minutes || 0;
        }
      });
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [days, getOvertimeForDate]);

  // Check if operator has unfilled working days up to today
  const hasUnfilledDays = useCallback((operatorId: string): boolean => {
    const today = startOfDay(new Date());
    
    return days.some(day => {
      // Skip future days
      if (isAfter(startOfDay(day), today)) return false;
      
      // Skip days with any absence (vacation, sick leave, etc.) - those are NOT unfilled
      const absence = isDateInAbsence(day, absences, operatorId);
      if (absence) return false;
      
      // Get planned minutes for this day
      const plannedMinutes = getPlannedDayMinutes?.(operators.find(op => op.id === operatorId), day) || 0;
      
      // Skip non-working days (no plan)
      if (plannedMinutes === 0) return false;
      
      // Check if there's a timesheet entry for this day
      const ts = getTimesheetForDate(timesheetMap, operatorId, day);
      const hasTimesheetEntry = ts && ts.actual_minutes > 0;
      
      // If there's plan but no fact, it's unfilled
      return !hasTimesheetEntry;
    });
  }, [days, timesheetMap, getPlannedDayMinutes, operators, absences]);

  // Calculate group fact total (all operators' actual + overtime + compensation)
  const groupFactTotal = useMemo(() => {
    let totalMinutes = 0;
    operators.forEach(op => {
      const actualHours = calculateActualHours(op.id);
      const overtimeHours = calculateOvertimeHours(op.id);
      const compensationHours = calculateCompensationHours(op.id);
      
      totalMinutes += actualHours.hours * 60 + actualHours.minutes;
      totalMinutes += overtimeHours.hours * 60 + overtimeHours.minutes;
      totalMinutes += compensationHours.hours * 60 + compensationHours.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      hasData: totalMinutes > 0
    };
  }, [operators, calculateActualHours, calculateOvertimeHours, calculateCompensationHours]);
  
  // Drag and drop functionality with resize support
  const {
    dragPreview,
    handleDragStart,
    handleResizeStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDropTarget,
    isDragging,
    isInDragPreview,
    handleAbsenceHover,
    isAbsenceHovered,
    handleAbsenceSelect,
    isAbsenceSelected,
    selectedAbsenceId,
    isAbsenceEdge,
  } = useAbsenceDragDrop();

  // Delete absence mutation for keyboard shortcut
  const deleteAbsence = useDeleteOperatorAbsence();

  // Handlers for drag selection of date range
  const handleDragSelectionStart = useCallback((operatorId: string, operatorName: string, date: Date, e: React.MouseEvent) => {
    // Only left mouse button, not on context menu
    if (e.button !== 0) return;
    e.preventDefault();
    setDragSelection({
      operatorId,
      operatorName,
      startDate: date,
      endDate: date,
    });
    setIsDraggingSelection(true);
  }, []);

  const handleDragSelectionMove = useCallback((operatorId: string, date: Date) => {
    if (!isDraggingSelection || !dragSelection || dragSelection.operatorId !== operatorId) return;
    setDragSelection(prev => prev ? { ...prev, endDate: date } : null);
  }, [isDraggingSelection, dragSelection]);

  const handleDragSelectionEnd = useCallback(() => {
    if (!isDraggingSelection || !dragSelection || !dragSelection.endDate) {
      setDragSelection(null);
      setIsDraggingSelection(false);
      return;
    }

    // Normalize dates
    let startDate = dragSelection.startDate;
    let endDate = dragSelection.endDate;
    if (endDate < startDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // Open create absence dialog with date range
    setCreatingAbsence({
      operatorId: dragSelection.operatorId,
      operatorName: dragSelection.operatorName,
      date: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    });

    setDragSelection(null);
    setIsDraggingSelection(false);
  }, [isDraggingSelection, dragSelection]);

  // Check if date is in current drag selection
  const isInDragSelection = useCallback((operatorId: string, date: Date): boolean => {
    if (!dragSelection || dragSelection.operatorId !== operatorId || !dragSelection.endDate) return false;
    
    let start = dragSelection.startDate;
    let end = dragSelection.endDate;
    if (end < start) {
      const temp = start;
      start = end;
      end = temp;
    }
    
    return date >= start && date <= end;
  }, [dragSelection]);

  // Global mouseup handler for drag selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingSelection) {
        handleDragSelectionEnd();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDraggingSelection, handleDragSelectionEnd]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel drag selection on Escape
      if (e.key === 'Escape' && isDraggingSelection) {
        setDragSelection(null);
        setIsDraggingSelection(false);
        return;
      }
      
      if (!selectedAbsenceId) return;
      
      const selectedAbsence = absences.find(a => a.id === selectedAbsenceId);
      if (!selectedAbsence) return;

      const selectedOperator = operators.find(op => op.id === selectedAbsence.operator_id);

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Ignore if user is typing in an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (confirm("Удалить выбранное отсутствие?")) {
          deleteAbsence.mutate(selectedAbsenceId);
          handleAbsenceSelect(null);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedOperator) {
          setEditingCellAbsence({ absence: selectedAbsence, operatorName: selectedOperator.full_name });
        }
      } else if (e.key === 'Escape') {
        handleAbsenceSelect(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAbsenceId, absences, operators, deleteAbsence, handleAbsenceSelect, isDraggingSelection]);

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
            className={cn(
              "border border-border rounded-lg flex w-full min-w-0 overflow-hidden relative isolate",
              isMobile ? "max-h-[50vh]" : "max-h-[60vh]"
            )}
            style={{ 
              ["--sr-header-h" as any]: isMobile ? "50px" : "76px",
              ["--sr-row-h" as any]: isMobile ? "40px" : "52px"
            }}
          >
            {/* Employee column */}
            <div className="flex-shrink-0 border-r border-border bg-background flex flex-col relative z-50" style={{ width: `${mobileEmployeeWidth}px` }}>
              <div
                className={cn(
                  "flex-shrink-0 bg-muted/30 font-semibold text-foreground py-2 h-[var(--sr-header-h)] flex items-center gap-2 border-b border-border mb-1",
                  isMobile ? "text-xs px-2" : "text-base px-3"
                )}
                style={{ boxShadow: "0 4px 12px -4px hsl(var(--foreground) / 0.15), 0 2px 6px -2px hsl(var(--foreground) / 0.1)" }}
              >
                <Users className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "text-muted-foreground")} />
                {!isMobile && "Сотрудники"}
              </div>
              
              <div 
                ref={registerVerticalScrollContainer(`emp-${scheduleName}`)}
                onScroll={handleSyncVerticalScroll(`emp-${scheduleName}`)}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-overlay min-h-0"
              >
                {operators.map((operator) => {
                  const schedule = operator.work_schedules;
                  const isCyclic = schedule?.schedule_type === 'cyclic';
                  const shifts = schedule?.work_schedule_shifts || [];
                  const hasMultipleShifts = shifts.length > 1;
                  
                  // For cyclic schedules: show icon if operator has personal cycle start date
                  const hasPersonalCycleDate = isCyclic && operator.shift_rotation_start_date;
                  
                  // For non-cyclic schedules with multiple shifts: show rotation icon
                  const showShiftRotationIcon = !isCyclic && hasMultipleShifts && operator.shift_rotation_enabled;
                  
                  // Check if operator has active absence today
                  const today = new Date();
                  const currentAbsence = isDateInAbsence(today, absences, operator.id);
                  const absenceInfo = currentAbsence ? ABSENCE_TYPE_LABELS[currentAbsence.absence_type] : null;
                  
                  return (
                    <HoverCard key={operator.id} openDelay={300}>
                      <HoverCardTrigger asChild>
                        <div 
                          className={cn(
                            "flex items-center gap-1 group border-b border-border/50 mb-1",
                            isMobile ? "px-1 h-[40px]" : "px-2 h-[52px] gap-2",
                            onEditOperator && "hover:bg-muted/50 cursor-pointer"
                          )}
                          onClick={() => onEditOperator?.(operator)}
                        >
                          <span className={cn("font-medium truncate flex-1", isMobile ? "text-xs" : "text-sm")}>{operator.full_name}</span>
                          {medalsEnabled && (
                            <OvertimeMedalBadge 
                              medalType={getOperatorMedal(overtimeRankings, operator.id)}
                              totalMinutes={overtimeRankings?.find(r => r.operatorId === operator.id)?.totalMinutes}
                              size="sm"
                            />
                          )}
                          {currentAbsence && absenceInfo && (
                            <span title={absenceInfo.label} className="flex-shrink-0">
                              <span className="text-sm">{absenceInfo.icon}</span>
                            </span>
                          )}
                          <CompensationPendingIcon operatorId={operator.id} />
                          {hasPersonalCycleDate && (
                            <span title="Персональная дата цикла">
                              <CalendarCheck className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            </span>
                          )}
                          {showShiftRotationIcon && (
                            <span title="Ротация смен">
                              <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </span>
                          )}
                          {onEditOperator && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); onEditOperator(operator); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        className="w-80" 
                        side="right" 
                        align="start"
                        sideOffset={5}
                        forceMount={undefined}
                      >
                        <OperatorInfoCard 
                          operator={operator} 
                          onEdit={onEditOperator} 
                          onManageAbsences={onManageAbsences}
                          onOpenCompensation={(op) => setCompensationOperator({ id: op.id, name: op.full_name })}
                        />
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
                
                {/* Group summary row */}
                <div className={cn(
                  "bg-muted/30 flex items-center text-xs text-muted-foreground border-t border-border",
                  isMobile ? "px-1 h-8" : "px-2 h-[44px]"
                )}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-600" title="Рабочие дни"><CalendarCheck className="h-3 w-3" />{groupStats.workingDays}</span>
                    <span className="flex items-center gap-1 text-rose-500" title="Выходные"><CalendarX className="h-3 w-3" />{groupStats.offDays}</span>
                    {groupStats.absenceDays > 0 && (
                      <span className="flex items-center gap-1 text-orange-500" title="Дни отсутствий"><Plane className="h-3 w-3" />{groupStats.absenceDays}</span>
                    )}
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
            
            {/* Edge fade overlays - matching GrandTotalRow style */}
            {/* Header edge fade */}
            <div
              className="absolute top-0 h-[var(--sr-header-h)] w-10 pointer-events-none z-[90]"
              style={{ left: `${mobileEmployeeWidth}px` }}
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-r from-background via-background/70 to-transparent" />
            </div>
            <div
              className="absolute top-0 h-[var(--sr-header-h)] right-0 w-10 pointer-events-none z-[90]"
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-l from-background via-background/70 to-transparent" />
            </div>

            {/* Body edge fade */}
            <div
              className="absolute top-[var(--sr-header-h)] bottom-0 w-10 pointer-events-none z-[70]"
              style={{ left: `${mobileEmployeeWidth}px` }}
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-r from-background via-background/70 to-transparent" />
            </div>
            <div
              className="absolute top-[var(--sr-header-h)] bottom-0 right-0 w-10 pointer-events-none z-[70]"
              aria-hidden="true"
            >
              <div className="h-full w-full bg-gradient-to-l from-background via-background/70 to-transparent" />
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
              <div className="sticky top-0 z-[80] relative">
                {/* Grid header with full-width background */}
                <div
                  className={cn(
                    "relative bg-background h-[var(--sr-header-h)]",
                    isMobile ? "pl-1 pr-0.5 py-1" : "pl-2 pr-0.5 py-2"
                  )}
                  style={{
                    ...calendarGridStyle,
                    boxShadow: "0 4px 12px -4px hsl(var(--foreground) / 0.15), 0 2px 6px -2px hsl(var(--foreground) / 0.1)",
                  }}
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
                        
                        // Check for calendar exceptions (holidays, shortened days)
                        const dayStr = format(day, "yyyy-MM-dd");
                        const calendarException = calendarExceptions.find(ex => ex.exception_date === dayStr);
                        const isHoliday = calendarException && calendarException.exception_type === 'holiday' && !calendarException.is_working_day;
                        const isShortenedDayHeader = calendarException && calendarException.exception_type === 'shortened_day' && calendarException.is_working_day;

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "text-center flex flex-col items-center justify-center rounded-md relative",
                              isMobile ? "text-xs p-0.5 h-[var(--sr-header-h)]" : "text-sm p-1.5 h-[60px]",
                              isTodayDate
                                ? cn(
                                    "bg-gradient-to-b from-cyan-400 to-teal-500 text-white font-semibold shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]",
                                    isTodayColumnHovered && "animate-pulse-glow",
                                  )
                                : isHoliday
                                  ? "bg-gradient-to-b from-red-300 to-red-400 dark:from-red-700 dark:to-red-800 text-red-900 dark:text-red-100"
                                  : isShortenedDayHeader
                                    ? "bg-gradient-to-b from-orange-200 to-orange-300 dark:from-orange-700 dark:to-orange-800 text-orange-800 dark:text-orange-100"
                                    : isWeekend
                                      ? "bg-gradient-to-b from-rose-200 to-rose-300 dark:from-rose-800 dark:to-rose-900 text-rose-700 dark:text-rose-200"
                                      : "bg-gradient-to-b from-muted to-secondary text-muted-foreground",
                            )}
                            onMouseEnter={() => isTodayDate && onTodayColumnHover(true)}
                            onMouseLeave={() => isTodayDate && onTodayColumnHover(false)}
                            title={calendarException ? calendarException.name : undefined}
                          >
                            {/* Holiday/Shortened day indicator */}
                            {(isHoliday || isShortenedDayHeader) && !isTodayDate && !isMobile && (
                              <div className="absolute top-0.5 right-0.5">
                                {isHoliday ? (
                                  <span className="text-[10px]">🎉</span>
                                ) : (
                                  <Timer className="h-2.5 w-2.5 text-orange-600 dark:text-orange-300" />
                                )}
                              </div>
                            )}
                            {!isMobile && <div className="font-medium text-xs uppercase">{format(day, "EEE", { locale: ru })}</div>}
                            <div
                              className={cn(
                                "font-semibold",
                                isMobile ? "text-xs" : "text-sm",
                                isTodayDate
                                  ? "text-white"
                                  : isHoliday
                                    ? "text-red-800 dark:text-red-100"
                                    : isShortenedDayHeader
                                      ? "text-orange-700 dark:text-orange-200"
                                      : isWeekend
                                        ? "text-rose-600 dark:text-rose-300"
                                        : "text-foreground",
                              )}
                            >
                              {format(day, "d", { locale: ru })}
                            </div>
                            {!isMobile && (showMonth || daysCount <= 14) && (
                              <div className="text-[10px] opacity-70">{format(day, "MMM", { locale: ru })}</div>
                            )}
                          </div>
                        );
                      })}
                      <div className={cn(
                        "text-center p-1 flex flex-col items-center justify-center rounded-md bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium",
                        isMobile ? "text-xs h-[var(--sr-header-h)]" : "text-sm h-[60px]"
                      )}>
                        <Clock className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mb-0.5")} />
                        {!isMobile && <div className="text-[10px]">Итого</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Calendar body */}
              <div className={cn(
                "pt-1 pb-1 relative z-0",
                isMobile ? "pl-1 pr-0.5" : "pl-2 pr-0.5"
              )} style={calendarGridStyle}>
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
                                className="text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-900/50 text-blue-700 dark:text-blue-300"
                              >
                                <div className="font-medium">{monthHours.hours}ч</div>
                                {monthHours.minutes > 0 && !isMobile && <div className="text-[10px] opacity-80">{monthHours.minutes}м</div>}
                              </div>
                            );
                          })}
                          <div className="text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium">
                            <div>{yearlyTotal.hours}ч</div>
                            {yearlyTotal.minutes > 0 && !isMobile && <div className="text-[10px]">{yearlyTotal.minutes}м</div>}
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
                              <div key={month.toISOString()} className="text-center h-8 flex items-center justify-center text-[10px] text-muted-foreground bg-gradient-to-b from-muted/30 to-muted/50 border-t border-border">
                                {h}ч{m > 0 && !isMobile ? ` ${m}м` : ''}
                              </div>
                            );
                          })}
                          <div className="text-center p-0.5 h-8 flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold border-t border-border">
                            <div>{groupYearlyTotal.hours}ч</div>
                            {groupYearlyTotal.minutes > 0 && !isMobile && <div className="text-[10px]">{groupYearlyTotal.minutes}м</div>}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* Day view - Operator rows */}
                    {operators.map((operator) => {
                      const totalHours = calculateTotalHours(operator, absences);
                      return (
                        <React.Fragment key={operator.id}>
                          {days.map((day) => {
                            // Check for absences, termination, and hire date
                            const absence = isDateInAbsence(day, absences, operator.id);
                            const terminated = isOperatorTerminated(operator, day);
                            const beforeHire = isBeforeHireDate(operator, day);
                            
                            // Check for schedule override
                            const override = getScheduleOverride(scheduleOverrides, operator.id, day);
                            const originalIsWorking = isWorkingDay(operator.work_schedules, day, operator);
                            const effectiveIsWorking = override ? override.is_working_day : originalIsWorking;
                            
                            // Get shift - for working days (either original or override)
                            // Always try to get shift info for override working days
                            const shift = effectiveIsWorking ? getShiftForDate(operator, day) : null;
                            
                            // For overridden working days, we need shift colors even if getShiftForDate returns null
                            // Get the default shift (first shift) as fallback
                            const defaultShift = operator.work_schedules?.work_schedule_shifts?.[0];
                            const effectiveShift = shift || (effectiveIsWorking && !originalIsWorking ? defaultShift : null);
                            const colors = effectiveShift ? shiftColorMap.get(effectiveShift.shift_name) : null;
                            
                            const netMinutes = effectiveShift 
                              ? (effectiveShift.net_work_minutes ?? (effectiveShift.gross_work_minutes - effectiveShift.break_minutes)) 
                              : 0;
                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                            const cycleInfo = getCycleDayNumber(operator.work_schedules, day, operator);
                            const hasOverride = !!override;
                            
                            // Check for compensation records (отработка) on this day
                            const compensationRecords = getCompensationRecordsForDate(operator.id, day);
                            // Consider records without status or with status !== 'confirmed' as pending
                            const confirmedRecords = compensationRecords.filter(r => r.status === "confirmed");
                            const pendingRecords = compensationRecords.filter(r => !r.status || r.status === "pending");
                            const hasCompensation = compensationRecords.length > 0;
                            const hasConfirmedCompensation = confirmedRecords.length > 0;
                            const hasPendingCompensation = pendingRecords.length > 0;
                            const compensationHoursToday = confirmedRecords.reduce((sum, r) => sum + r.hours_worked, 0);
                            const pendingHoursToday = pendingRecords.reduce((sum, r) => sum + r.hours_worked, 0);
                            
                            // Check for overtime entries on this day
                            const overtimeRecords = getOvertimeForDate(operator.id, day);
                            const approvedOvertimeRecords = overtimeRecords.filter(r => r.status === "approved");
                            const pendingOvertimeRecords = overtimeRecords.filter(r => r.status === "pending");
                            const hasOvertime = overtimeRecords.length > 0;
                            const hasApprovedOvertime = approvedOvertimeRecords.length > 0;
                            const hasPendingOvertime = pendingOvertimeRecords.length > 0;
                            const approvedOvertimeMinutes = approvedOvertimeRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
                            const pendingOvertimeMinutes = pendingOvertimeRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
                            
                            // Check for shortened day (calendar exception)
                            const dateStr = format(day, "yyyy-MM-dd");
                            // Check for holiday (calendar exception) - important for 5/2 schedules
                            const holidayException = calendarExceptions.find(
                              ex => ex.exception_date === dateStr && 
                                   ex.exception_type === 'holiday' && 
                                   !ex.is_working_day
                            );
                            // For 5/2 schedules, holidays are non-working days
                            const scheduleType = operator.work_schedules?.schedule_type;
                            const is52Schedule = scheduleType === '5/2' || scheduleType === 'weekly' || scheduleType === 'shift';
                            // Show holiday icon for 5/2 schedules when there's a holiday exception
                            // (even if base schedule says it's a working day, holidays override for 5/2)
                            const isHolidayForSchedule = is52Schedule && !!holidayException;
                            
                            const shortenedException = calendarExceptions.find(
                              ex => ex.exception_date === dateStr && 
                                   ex.exception_type === 'shortened_day' && 
                                   ex.is_working_day
                            );
                            const isShortenedDay = !!shortenedException && effectiveIsWorking;
                            // Use schedule-specific reduction_hours if available, otherwise use calendar exception value
                            const scheduleReductionHours = operator.work_schedules?.reduction_hours;
                            const reductionHours = scheduleReductionHours ?? shortenedException?.reduction_hours ?? 1;
                            
                            // Calculate actual hours for this day (with reduction if shortened)
                            const actualNetMinutes = isShortenedDay 
                              ? Math.max(0, netMinutes - (reductionHours * 60))
                              : netMinutes;
                            const hours = Math.floor(actualNetMinutes / 60);
                            const mins = actualNetMinutes % 60;
                            
                            // Calculate underage (недоработка) for this day
                            const dayTimesheet = getTimesheetForDate(timesheetMap, operator.id, day);
                            const hasTimesheetForDay = dayTimesheet && dayTimesheet.actual_minutes > 0;
                            const approvedOvertimeForDay = approvedOvertimeRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
                            const confirmedCompensationForDay = confirmedRecords.reduce((sum, r) => sum + Math.round(r.hours_worked * 60), 0);
                            const factMinutesForDay = (dayTimesheet?.actual_minutes || 0) + approvedOvertimeForDay + confirmedCompensationForDay;
                            const underageMinutes = effectiveIsWorking && hasTimesheetForDay && actualNetMinutes > 0 
                              ? actualNetMinutes - factMinutesForDay 
                              : 0;
                            const hasUnderage = underageMinutes > 0;
                            
                            // Handle special states
                            if (terminated) {
                              return (
                                <div 
                                  key={day.toISOString()} 
                                  className="text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-400"
                                  title="Уволен"
                                >
                                  <UserMinus className="h-3 w-3 opacity-60" />
                                </div>
                              );
                            }
                            
                            if (beforeHire) {
                              return (
                                <div 
                                  key={day.toISOString()} 
                                  className="text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 text-gray-400 dark:text-gray-500"
                                  title="До приёма на работу"
                                >
                                  <span className="text-[10px]">—</span>
                                </div>
                              );
                            }
                            
                            if (absence) {
                              const absenceInfo = ABSENCE_TYPE_LABELS[absence.absence_type];
                              const AbsenceIcon = absence.absence_type === 'sick_leave' ? Stethoscope 
                                : absence.absence_type === 'business_trip' ? Briefcase 
                                : (absence.absence_type === 'administrative_leave_with_compensation' || absence.absence_type === 'administrative_leave_without_compensation') ? FileText
                                : absence.absence_type === 'unauthorized_absence' ? Ban
                                : Plane;
                              const { isStart, isEnd } = isAbsenceEdge(absence, day);
                              const isHovered = isAbsenceHovered(absence.id);
                              const isSelected = isAbsenceSelected(absence.id);
                              
                              return (
                                <div 
                                  key={day.toISOString()} 
                                  tabIndex={0}
                                  draggable
                                  onDragStart={(e) => handleDragStart(absence, operator.id, e)}
                                  onDragEnd={handleDragEnd}
                                  onMouseEnter={() => handleAbsenceHover(absence.id)}
                                  onMouseLeave={() => handleAbsenceHover(null)}
                                  onFocus={() => handleAbsenceSelect(absence.id)}
                                  onClick={() => {
                                    handleAbsenceSelect(absence.id);
                                    setEditingCellAbsence({ absence, operatorName: operator.full_name });
                                  }}
                                  className={cn(
                                    "text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs transition-all relative overflow-hidden cursor-grab active:cursor-grabbing group outline-none",
                                    isSelected && "ring-2 ring-primary z-20",
                                    isHovered && !isSelected && "ring-2 ring-primary/60 z-10",
                                    !isHovered && !isSelected && !hasOvertime && "hover:ring-2 hover:ring-primary/50",
                                    isDragging(absence.id) && "opacity-50 scale-95",
                                    absence.absence_type === 'annual_leave' && "bg-gradient-to-b from-blue-200 to-blue-300 dark:from-blue-900/50 dark:to-blue-900/70 text-blue-700 dark:text-blue-300",
                                    absence.absence_type === 'sick_leave' && "bg-gradient-to-b from-red-200 to-red-300 dark:from-red-900/50 dark:to-red-900/70 text-red-700 dark:text-red-300",
                                    absence.absence_type === 'administrative_leave_with_compensation' && "bg-gradient-to-b from-orange-300 to-orange-400 dark:from-orange-800/60 dark:to-orange-900/80 text-orange-800 dark:text-orange-200",
                                    absence.absence_type === 'administrative_leave_without_compensation' && "bg-gradient-to-b from-orange-200 to-orange-300 dark:from-orange-900/50 dark:to-orange-900/70 text-orange-700 dark:text-orange-300",
                                    absence.absence_type === 'maternity_leave' && "bg-gradient-to-b from-pink-200 to-pink-300 dark:from-pink-900/50 dark:to-pink-900/70 text-pink-700 dark:text-pink-300",
                                    absence.absence_type === 'unpaid_leave' && "bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300",
                                    absence.absence_type === 'business_trip' && "bg-gradient-to-b from-purple-200 to-purple-300 dark:from-purple-900/50 dark:to-purple-900/70 text-purple-700 dark:text-purple-300",
                                    absence.absence_type === 'unauthorized_absence' && "bg-gradient-to-b from-rose-300 to-rose-400 dark:from-rose-800/60 dark:to-rose-900/80 text-rose-800 dark:text-rose-200",
                                    absence.absence_type === 'other' && "bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300",
                                    // Overtime ring on absence cell
                                    hasOvertime && !isSelected && !isHovered && "ring-2 ring-purple-400 dark:ring-purple-600",
                                    isToday(day) && "shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]"
                                  )}
                                  title={`${absenceInfo.label}${absence.notes ? `: ${absence.notes}` : ''}\nКлик - редактировать | Delete - удалить | Перетащить - переместить`}
                                >
                                  {/* Left resize handle */}
                                  {isStart && (
                                    <div
                                      draggable
                                      onDragStart={(e) => handleResizeStart(absence, operator.id, 'start', e)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 transition-opacity flex items-center justify-center"
                                      title="Перетащите для изменения даты начала"
                                    >
                                      <div className="w-0.5 h-4 bg-current rounded-full opacity-60" />
                                    </div>
                                  )}
                                  
                                  {/* Right resize handle */}
                                  {isEnd && (
                                    <div
                                      draggable
                                      onDragStart={(e) => handleResizeStart(absence, operator.id, 'end', e)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 transition-opacity flex items-center justify-center"
                                      title="Перетащите для изменения даты окончания"
                                    >
                                      <div className="w-0.5 h-4 bg-current rounded-full opacity-60" />
                                    </div>
                                  )}
                                  
                                  <GripVertical className="h-2.5 w-2.5 absolute top-0.5 right-0.5 opacity-40 group-hover:opacity-0" />
                                  
                                  {/* Overtime indicator on absence cell - same as regular cell */}
                                  {hasOvertime && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={cn(
                                            "absolute bottom-0 right-0 p-0.5 transition-all z-20",
                                            hasPendingOvertime && !hasApprovedOvertime && "animate-pulse"
                                          )}
                                        >
                                          <Clock className={cn(
                                            "h-2.5 w-2.5 transition-colors",
                                            hasApprovedOvertime ? "text-purple-600 dark:text-purple-400" : "text-purple-400 dark:text-purple-500"
                                          )} />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        Переработка: {Math.floor(approvedOvertimeMinutes / 60)}ч {approvedOvertimeMinutes % 60}м
                                        {hasPendingOvertime && <span className="text-amber-500"> (ожидает: {Math.floor(pendingOvertimeMinutes / 60)}ч)</span>}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  <AbsenceIcon className="h-3.5 w-3.5 mb-0.5" />
                                  <div className="text-[9px] font-medium truncate w-full px-0.5">
                                    {daysCount > 14 ? absenceInfo.icon : absenceInfo.label.split(' ')[0]}
                                  </div>
                                </div>
                              );
                            }
                            
                            // dateStr already defined above for shortened day check
                            const canCreateAbsence = !terminated && !beforeHire;
                            const inPreview = isInDragPreview(day, operator.id);
                            const overrideInfo = override ? OVERRIDE_REASON_LABELS[override.reason || 'other'] : null;
                            
                            // Handler for right-click to open schedule override dialog
                            const handleContextMenu = (e: React.MouseEvent) => {
                              if (terminated || beforeHire) return;
                              e.preventDefault();
                              
                              // If shift is held, start or complete range selection
                              if (e.shiftKey && rangeSelection && rangeSelection.operatorId === operator.id) {
                                // Complete range selection - open bulk dialog
                                setBulkOverrideDialog({
                                  operatorId: rangeSelection.operatorId,
                                  operatorName: rangeSelection.operatorName,
                                  startDate: rangeSelection.startDate,
                                  endDate: day,
                                });
                                setRangeSelection(null);
                                return;
                              }
                              
                              // Check if shift key is held for range selection start
                              if (e.shiftKey) {
                                setRangeSelection({
                                  operatorId: operator.id,
                                  operatorName: operator.full_name,
                                  startDate: day,
                                  endDate: null,
                                });
                                toast.info("Выберите конечную дату (Shift+ПКМ)");
                                return;
                              }
                              
                              // Normal single day override
                              setEditingOverride({
                                operatorId: operator.id,
                                operatorName: operator.full_name,
                                date: day,
                                originalIsWorkingDay: originalIsWorking,
                                existingOverride: override,
                                shifts: operator.work_schedules?.work_schedule_shifts?.map((s: any) => ({
                                  shift_number: s.shift_number,
                                  shift_name: s.shift_name,
                                })) || [],
                                scheduleType: operator.work_schedules?.schedule_type,
                                currentCycleStartDate: operator.shift_rotation_start_date || operator.work_schedules?.cycle_start_date,
                              });
                            };
                            
                            // Check if this day is in range selection (Shift+RightClick)
                            const isInRangeSelection = rangeSelection && 
                              rangeSelection.operatorId === operator.id &&
                              day >= rangeSelection.startDate;
                            
                            // Check if this day is in drag selection (mouse drag)
                            const inDragSelection = isInDragSelection(operator.id, day);
                            
                            return (
                              <div 
                                key={day.toISOString()} 
                                onDragOver={(e) => canCreateAbsence && handleDragOver(day, operator.id, e)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => canCreateAbsence && handleDrop(day, operator.id, e)}
                                // Mouse drag selection for creating absences
                                onMouseDown={(e) => canCreateAbsence && !inPreview && handleDragSelectionStart(operator.id, operator.full_name, day, e)}
                                onMouseEnter={() => {
                                  if (isToday(day)) onTodayColumnHover(true);
                                  if (isDraggingSelection && canCreateAbsence) handleDragSelectionMove(operator.id, day);
                                }}
                                onMouseLeave={() => isToday(day) && onTodayColumnHover(false)}
                                onContextMenu={handleContextMenu}
                                className={cn(
                                  "text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs transition-all relative overflow-hidden select-none",
                                  canCreateAbsence && !inPreview && !isDraggingSelection && "cursor-pointer hover:ring-2 hover:ring-primary/30 hover:bg-primary/5",
                                  isDraggingSelection && canCreateAbsence && "cursor-crosshair",
                                  isDropTarget(day, operator.id) && "ring-2 ring-primary bg-primary/10",
                                  inPreview && "ring-2 ring-primary/70 bg-primary/20 z-10",
                                  // Drag selection highlighting (mouse drag)
                                  inDragSelection && "ring-2 ring-blue-500 bg-blue-200 dark:bg-blue-800/50 z-10",
                                  // Range selection highlighting (Shift+RightClick)
                                  isInRangeSelection && !inDragSelection && "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30",
                                  // Override styling - working day override: shift colors + dashed border
                                  !inDragSelection && hasOverride && effectiveIsWorking && colors 
                                    ? cn(colors.bg, colors.text, "border-2 border-dashed border-amber-400") 
                                    : null,
                                  // Override styling - day off override: normal weekend/off styling + dashed border
                                  !inDragSelection && hasOverride && !effectiveIsWorking && isWeekend 
                                    ? "bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-900/50 border-2 border-dashed border-amber-400"
                                    : !inDragSelection && hasOverride && !effectiveIsWorking 
                                      ? "bg-gradient-to-b from-muted/20 to-muted/40 border-2 border-dashed border-amber-400"
                                      : null,
                                  // Normal styling (when no override)
                                  !inDragSelection && !hasOverride && !inPreview && !isInRangeSelection && colors 
                                    ? cn(colors.bg, colors.text, "border", colors.border) 
                                    : !inDragSelection && !hasOverride && !inPreview && !isInRangeSelection && !effectiveIsWorking && isWeekend 
                                      ? "bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-900/50" 
                                      : !inDragSelection && !hasOverride && !inPreview && !isInRangeSelection && !effectiveIsWorking && "bg-gradient-to-b from-muted/20 to-muted/40",
                                  // Compensation day styling - add emerald ring
                                  hasCompensation && "ring-2 ring-emerald-400 dark:ring-emerald-600",
                                  // Overtime styling - add purple ring (different from compensation)
                                  hasOvertime && !hasCompensation && "ring-2 ring-purple-400 dark:ring-purple-600",
                                  isToday(day) && cn(
                                    "shadow-[0_0_4px_1px_rgba(6,182,212,0.25)]",
                                    isTodayColumnHovered && "animate-pulse-glow"
                                  )
                                )}
                                title={`${hasCompensation ? `🔨 Отработка: ${compensationHoursToday}ч\n` : ''}${hasOvertime ? `⏱️ Переработка: ${Math.floor(approvedOvertimeMinutes / 60)}ч ${approvedOvertimeMinutes % 60}м ${hasPendingOvertime ? `(ожидает: ${Math.floor(pendingOvertimeMinutes / 60)}ч ${pendingOvertimeMinutes % 60}м)` : ''}\n` : ''}${isShortenedDay ? `⏰ ${shortenedException?.name || 'Сокращённый день'}\n   Итого: ${hours} ч ${mins > 0 ? mins + ' мин' : ''}\n` : ''}${hasOverride ? `⚡ Изменено: ${overrideInfo?.label || 'Изменение графика'}${override?.notes ? ` - ${override.notes}` : ''}\n` : ''}${cycleInfo ? `📅 День ${cycleInfo.dayInCycle}/${cycleInfo.cycleLength} цикла\n` : ''}Перетащить - выбрать диапазон | ПКМ - изменить график`}
                              >
                                {/* Shortened day indicator */}
                                {isShortenedDay && !hasOverride && (
                                  <div className="absolute top-0.5 left-0.5">
                                    <Timer className="h-2.5 w-2.5 text-orange-500 dark:text-orange-400" />
                                  </div>
                                )}
                                
                                {/* Override indicator */}
                                {hasOverride && (
                                  <div className="absolute top-0.5 right-0.5">
                                    <ArrowRightLeft className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                  </div>
                                )}
                                
                                {/* Shortened day indicator when override exists - show on left */}
                                {isShortenedDay && hasOverride && (
                                  <div className="absolute top-0.5 left-0.5">
                                    <Timer className="h-2.5 w-2.5 text-orange-500 dark:text-orange-400" />
                                  </div>
                                )}
                                
                                {/* Holiday indicator for 5/2 schedules */}
                                {isHolidayForSchedule && !hasOverride && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute top-0.5 right-0.5">
                                        <span className="text-[10px]">🎉</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs max-w-xs">
                                      <div className="font-medium">{holidayException?.name || 'Праздничный день'}</div>
                                      <div className="text-muted-foreground mt-0.5">Нерабочий день для графика 5/2</div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {/* Underage indicator - show when worked less than planned */}
                                {hasUnderage && !hasOvertime && !hasCompensation && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute bottom-0 left-0 p-0.5 z-20">
                                        <TrendingDown className="h-2.5 w-2.5 text-red-500 dark:text-red-400" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <span className="text-red-500 font-medium">
                                        Недоработка: -{Math.floor(underageMinutes / 60)}ч{underageMinutes % 60 > 0 ? ` ${underageMinutes % 60}м` : ''}
                                      </span>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {/* Overtime indicator - show clock icon with color based on status */}
                                {hasOvertime && !hasCompensation && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={cn(
                                          "absolute bottom-0 right-0 p-0.5 transition-all z-20",
                                          hasPendingOvertime && !hasApprovedOvertime && "animate-pulse"
                                        )}
                                      >
                                        <Clock className={cn(
                                          "h-2.5 w-2.5 transition-colors",
                                          hasApprovedOvertime ? "text-purple-600 dark:text-purple-400" : "text-purple-400 dark:text-purple-500"
                                        )} />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Переработка: {Math.floor(approvedOvertimeMinutes / 60)}ч {approvedOvertimeMinutes % 60}м
                                      {hasPendingOvertime && <span className="text-amber-500"> (ожидает: {Math.floor(pendingOvertimeMinutes / 60)}ч)</span>}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                
                                {/* Compensation indicator - show hammer icon with color based on status */}
                                {/* Clickable to confirm/unconfirm - small clickable area */}
                                {hasCompensation && (() => {
                                  const isAnimating = compensationRecords.some(r => confirmedAnimations.has(r.id));
                                  const confirmedRecords = compensationRecords.filter(r => r.status === "confirmed");
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={cn(
                                            "absolute bottom-0 right-0 p-0.5 cursor-pointer transition-all duration-300 z-20",
                                            hasPendingCompensation && !hasConfirmedCompensation && "animate-pulse",
                                            isAnimating && "scale-125 animate-bounce"
                                          )}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            
                                            // If there are confirmed records and user clicks - offer to unconfirm
                                            if (hasConfirmedCompensation && confirmedRecords.length > 0 && pendingRecords.length === 0) {
                                              handleUnconfirmCompensation(confirmedRecords[0], operator.full_name, e);
                                              return;
                                            }
                                            
                                            // Find the first pending record that can be confirmed (date has passed)
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const confirmableRecord = pendingRecords.find(r => {
                                              const compDate = new Date(r.compensation_date);
                                              compDate.setHours(0, 0, 0, 0);
                                              return compDate <= today;
                                            });
                                            if (confirmableRecord) {
                                              handleConfirmCompensation(confirmableRecord, e);
                                            } else if (pendingRecords.length > 0) {
                                              toast.info("Дата отработки ещё не наступила");
                                            }
                                          }}
                                        >
                                          <Hammer className={cn(
                                            "h-2.5 w-2.5 transition-colors duration-300 hover:scale-150",
                                            isAnimating ? "text-emerald-500 dark:text-emerald-300" : 
                                              hasConfirmedCompensation ? "text-emerald-600 dark:text-emerald-400" : 
                                              "text-amber-500 dark:text-amber-400"
                                          )} />
                                          {/* Success checkmark animation */}
                                          {isAnimating && (
                                            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 animate-scale-in">
                                              <Check className="h-2 w-2 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {hasPendingCompensation && !hasConfirmedCompensation 
                                          ? "Нажмите для подтверждения отработки"
                                          : hasConfirmedCompensation && hasPendingCompensation
                                            ? "Есть подтверждённые и ожидающие отработки"
                                            : "Отработка подтверждена ✓ (нажмите для отмены)"
                                        }
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })()}
                                
                                {effectiveShift ? (
                                  <div className="w-full text-center flex flex-col items-center">
                                    <div className="font-medium truncate text-[10px] px-0.5 w-full" title={effectiveShift.shift_name}>
                                      {daysCount > 14 ? effectiveShift.shift_name.charAt(0) : effectiveShift.shift_name}
                                    </div>
                                    {daysCount <= 14 && (
                                      <div className={cn(
                                        "text-[9px] opacity-80 truncate w-full",
                                        isShortenedDay && "text-orange-600 dark:text-orange-400 font-medium",
                                        hasConfirmedCompensation && "text-emerald-600 dark:text-emerald-400 font-medium",
                                        hasPendingCompensation && !hasConfirmedCompensation && "text-amber-500 dark:text-amber-400 font-medium"
                                      )}>
                                        {mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`}
                                      {isShortenedDay && <span className="opacity-70"> ↓</span>}
                                        {hasConfirmedCompensation && <span className="text-emerald-600 dark:text-emerald-400"> +{Math.round(compensationHoursToday * 100) / 100}ч</span>}
                                        {hasPendingCompensation && <span className="text-amber-500 dark:text-amber-400"> (~{Math.round(pendingHoursToday * 100) / 100}ч)</span>}
                                      </div>
                                    )}
                                    {cycleInfo && <div className="text-[8px] opacity-70 font-semibold whitespace-nowrap">Д{cycleInfo.dayInCycle}</div>}
                                  </div>
                                ) : hasCompensation ? (
                                  // Day with compensation only (no regular shift - e.g., off day with compensation work)
                                  (() => {
                                    const isAnimating = compensationRecords.some(r => confirmedAnimations.has(r.id));
                                    const confirmedRecords = compensationRecords.filter(r => r.status === "confirmed");
                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div 
                                            className={cn(
                                              "p-1 cursor-pointer transition-all duration-300 relative z-20",
                                              hasPendingCompensation && !hasConfirmedCompensation && "animate-pulse",
                                              isAnimating && "scale-110 animate-bounce"
                                            )}
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              
                                              // If there are confirmed records and user clicks - offer to unconfirm
                                              if (hasConfirmedCompensation && confirmedRecords.length > 0 && pendingRecords.length === 0) {
                                                handleUnconfirmCompensation(confirmedRecords[0], operator.full_name, e);
                                                return;
                                              }
                                              
                                              const today = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              const confirmableRecord = pendingRecords.find(r => {
                                                const compDate = new Date(r.compensation_date);
                                                compDate.setHours(0, 0, 0, 0);
                                                return compDate <= today;
                                              });
                                              if (confirmableRecord) {
                                                handleConfirmCompensation(confirmableRecord, e);
                                              } else if (pendingRecords.length > 0) {
                                                toast.info("Дата отработки ещё не наступила");
                                              }
                                            }}
                                          >
                                            <Hammer className={cn(
                                              "h-3.5 w-3.5 transition-colors duration-300 hover:scale-125",
                                              isAnimating ? "text-emerald-500 dark:text-emerald-300" :
                                                hasConfirmedCompensation ? "text-emerald-600 dark:text-emerald-400" : 
                                                "text-amber-500 dark:text-amber-400"
                                            )} />
                                            {/* Success checkmark animation */}
                                            {isAnimating && (
                                              <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 animate-scale-in">
                                                <Check className="h-2 w-2 text-white" />
                                              </div>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          {hasPendingCompensation && !hasConfirmedCompensation 
                                            ? "Нажмите для подтверждения отработки"
                                            : "Отработка подтверждена ✓ (нажмите для отмены)"
                                          }
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })()
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className={cn("text-sm", hasOverride ? "text-amber-600 dark:text-amber-400" : isWeekend ? "text-rose-400 dark:text-rose-500" : "text-muted-foreground")}>
                                      {hasOverride ? "⚡" : "—"}
                                    </span>
                                    {cycleInfo && <div className="text-[8px] opacity-60 font-semibold whitespace-nowrap">Д{cycleInfo.dayInCycle}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {/* Total cell with plan/fact - clickable to open timesheet */}
                          {(() => {
                            const actualHours = calculateActualHours(operator.id);
                            const hasActual = hasTimesheetData(operator.id);
                            const compensationHours = calculateCompensationHours(operator.id);
                            const hasCompensationTotal = compensationHours.hours > 0 || compensationHours.minutes > 0;
                            const overtimeHours = calculateOvertimeHours(operator.id);
                            const hasOvertimeTotal = overtimeHours.hours > 0 || overtimeHours.minutes > 0;
                            
                            // Check if operator has unfilled working days
                            const hasUnfilled = hasUnfilledDays(operator.id);
                            
                            // fullPlanHours = полный план по графику без вычетов (для отображения в ячейке)
                            const fullPlanData = calculateFullPlanHours(operator);
                            const fullPlanMinutes = fullPlanData.hours * 60 + fullPlanData.minutes;
                            
                            // reducedPlanHours = план минус non-compensable absences (для расчета разницы)
                            const reducedPlanData = calculatePlanHours(operator);
                            const reducedPlanMinutes = reducedPlanData.hours * 60 + reducedPlanData.minutes;

                            const compensationMinutes = compensationHours.hours * 60 + compensationHours.minutes;
                            const overtimeMinutes = overtimeHours.hours * 60 + overtimeHours.minutes;
                            const actualMinutes = actualHours.hours * 60 + actualHours.minutes;
                            
                            // Fact = actual from timesheets + approved overtime + confirmed compensation
                            const factMinutes = actualMinutes + overtimeMinutes + compensationMinutes;
                            
                            // Difference from reduced plan (норма) - это настоящая переработка/недоработка
                            const diff = factMinutes - reducedPlanMinutes;
                            
                            // Determine cell color based on state
                            const getCellColorClass = () => {
                              if (hasOvertimeTotal) {
                                // Purple for overtime
                                return "bg-gradient-to-b from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-900 text-purple-800 dark:text-purple-200";
                              }
                              if (hasActual) {
                                return diff >= 0 
                                  ? "bg-gradient-to-b from-green-200 to-green-300 dark:from-green-800 dark:to-green-900 text-green-800 dark:text-green-200"
                                  : "bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-900 text-amber-800 dark:text-amber-200";
                              }
                              return "bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200";
                            };
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "text-center p-0.5 h-[var(--sr-row-h)] flex flex-col items-center justify-center rounded-md text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                                      getCellColorClass()
                                    )}
                                    onClick={() => setTimesheetOperator({ id: operator.id, name: operator.full_name })}
                                  >
                                    {/* Если есть данные табеля - показываем факт сверху, план снизу */}
                                    {hasActual ? (
                                      <>
                                        <div className="flex items-center gap-0.5">
                                          {hasUnfilled && (
                                            <AlertCircle className="h-3 w-3 text-amber-500 animate-pulse" />
                                          )}
                                          <ClipboardCheck className="h-3 w-3" />
                                          {hasOvertimeTotal && <Clock className="h-3 w-3" />}
                                          {/* Факт = фактические часы + подтвержденные переработки */}
                                          <span>{Math.floor(factMinutes / 60)}ч{factMinutes % 60 > 0 ? ` ${factMinutes % 60}м` : ''}</span>
                                        </div>
                                        <div className="text-[9px] opacity-80">
                                          {/* План = план с вычетом отсутствий */}
                                          п: {reducedPlanData.hours}ч{reducedPlanData.minutes > 0 ? ` ${reducedPlanData.minutes}м` : ''}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-0.5">
                                          {hasUnfilled && (
                                            <AlertCircle className="h-3 w-3 text-amber-500 animate-pulse" />
                                          )}
                                          {hasCompensationTotal && <Hammer className="h-3 w-3" />}
                                          {hasOvertimeTotal && <Clock className="h-3 w-3" />}
                                          {/* Без данных табеля показываем план с вычетом отсутствий */}
                                          <span>{reducedPlanData.hours}ч</span>
                                        </div>
                                        {hasOvertimeTotal ? (
                                          <div className="text-[9px] text-purple-700 dark:text-purple-300 font-medium">
                                            +{overtimeHours.hours}ч{overtimeHours.minutes > 0 ? ` ${overtimeHours.minutes}м` : ''} перераб
                                          </div>
                                        ) : hasCompensationTotal ? (
                                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            +{compensationHours.hours}ч{compensationHours.minutes > 0 ? ` ${compensationHours.minutes}м` : ''} отр
                                          </div>
                                        ) : (
                                          /* Показываем минуты только если они есть - НЕ дублируя */
                                          reducedPlanData.minutes > 0 && <div className="text-[10px] opacity-80">{reducedPlanData.minutes}м</div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-3">
                                  {(() => {
                                    return (
                                      <OperatorTotalTooltip
                                        operatorId={operator.id}
                                        operatorName={operator.full_name}
                                        planHours={reducedPlanData.hours}
                                        planMinutes={reducedPlanData.minutes}
                                        fullPlanHours={fullPlanData.hours}
                                        fullPlanMinutes={fullPlanData.minutes}
                                        days={days}
                                        absences={absences}
                                        timesheetMap={timesheetMap}
                                        compensationRecordsMap={compensationRecordsMap}
                                        overtimeMap={overtimeMap}
                                        getDayMinutes={getDayMinutes}
                                        getPlannedDayMinutes={getPlannedDayMinutes}
                                        operator={operator}
                                        calendarExceptions={calendarExceptions}
                                      />
                                    );
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </React.Fragment>
                      );
                    })}

                    {/* Day view - Group summary */}
                    {(() => {
                      return (
                        <>
                          {days.map((day) => (
                            <div key={day.toISOString()} className="text-center h-8 flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-b from-muted/30 to-muted/50 border-t border-border">—</div>
                          ))}
                          <div className={cn(
                            "text-center p-0.5 h-8 flex flex-col items-center justify-center rounded-md text-xs font-bold border-t border-border",
                            groupFactTotal.hasData 
                              ? "bg-gradient-to-b from-blue-200 to-blue-300 dark:from-blue-700 dark:to-blue-800 text-blue-900 dark:text-blue-100"
                              : "bg-gradient-to-b from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800 text-emerald-900 dark:text-emerald-100"
                          )}>
                            {groupFactTotal.hasData ? (
                              <>
                                <div className="flex items-center gap-0.5">
                                  <ClipboardCheck className="h-3 w-3" />
                                  <span>{groupFactTotal.hours}ч</span>
                                </div>
                                <div className="text-[9px] opacity-80">
                                  п: {groupStats.totalHours}ч{groupStats.totalMinutes > 0 && !isMobile ? ` ${groupStats.totalMinutes}м` : ''}
                                </div>
                              </>
                            ) : (
                              <>
                                <div>{groupStats.totalHours}ч</div>
                                {groupStats.totalMinutes > 0 && !isMobile && <div className="text-[10px]">{groupStats.totalMinutes}м</div>}
                              </>
                            )}
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

      {/* Drag preview tooltip */}
      {dragPreview && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border border-primary rounded-lg px-4 py-2 shadow-lg">
          <div className="text-sm font-medium text-primary flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            <span>Новый период: {dragPreview.formattedRange}</span>
          </div>
        </div>
      )}

      {/* Drag selection tooltip - shows selected days count */}
      {isDraggingSelection && dragSelection && dragSelection.endDate && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white rounded-lg px-4 py-2 shadow-lg">
          <div className="text-sm font-medium flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            <span>
              {(() => {
                let start = dragSelection.startDate;
                let end = dragSelection.endDate!;
                if (end < start) {
                  const temp = start;
                  start = end;
                  end = temp;
                }
                const daysCount = differenceInCalendarDays(end, start) + 1;
                const daysLabel = daysCount === 1 ? 'день' : daysCount < 5 ? 'дня' : 'дней';
                return `${format(start, "d MMM", { locale: ru })} — ${format(end, "d MMM", { locale: ru })} (${daysCount} ${daysLabel})`;
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Absence cell edit dialog */}
      {editingCellAbsence && (
        <AbsenceCellDialog
          open={!!editingCellAbsence}
          onOpenChange={(open) => !open && setEditingCellAbsence(null)}
          absence={editingCellAbsence.absence}
          operatorName={editingCellAbsence.operatorName}
        />
      )}

      {/* Create absence dialog from empty cell click or drag selection */}
      {creatingAbsence && (
        <CreateAbsenceCellDialog
          open={!!creatingAbsence}
          onOpenChange={(open) => !open && setCreatingAbsence(null)}
          operatorId={creatingAbsence.operatorId}
          operatorName={creatingAbsence.operatorName}
          initialDate={creatingAbsence.date}
          initialEndDate={creatingAbsence.endDate}
        />
      )}

      {/* Schedule override dialog */}
      {editingOverride && (
        <ScheduleOverrideDialog
          open={!!editingOverride}
          onOpenChange={(open) => !open && setEditingOverride(null)}
          operatorId={editingOverride.operatorId}
          operatorName={editingOverride.operatorName}
          date={editingOverride.date}
          originalIsWorkingDay={editingOverride.originalIsWorkingDay}
          existingOverride={editingOverride.existingOverride}
          shifts={editingOverride.shifts}
          scheduleType={editingOverride.scheduleType}
          currentCycleStartDate={editingOverride.currentCycleStartDate}
        />
      )}

      {/* Bulk schedule override dialog */}
      {bulkOverrideDialog && (
        <BulkScheduleOverrideDialog
          open={!!bulkOverrideDialog}
          onOpenChange={(open) => !open && setBulkOverrideDialog(null)}
          operatorId={bulkOverrideDialog.operatorId}
          operatorName={bulkOverrideDialog.operatorName}
          startDate={bulkOverrideDialog.startDate}
          endDate={bulkOverrideDialog.endDate}
        />
      )}
      
      {/* Compensation Dialog - rendered outside HoverCard */}
      {compensationOperator && (
        <CompensationDialog
          open={!!compensationOperator}
          onOpenChange={(open) => !open && setCompensationOperator(null)}
          operatorId={compensationOperator.id}
          operatorName={compensationOperator.name}
        />
      )}
      
      {/* Timesheet Dialog */}
      {timesheetOperator && getDayMinutes && (
        <TimesheetDialog
          open={!!timesheetOperator}
          onOpenChange={(open) => !open && setTimesheetOperator(null)}
          operatorId={timesheetOperator.id}
          operatorName={timesheetOperator.name}
          startDate={days[0]}
          endDate={days[days.length - 1]}
          plannedMinutesPerDay={(date: Date) => {
            const op = operators.find(o => o.id === timesheetOperator.id);
            if (!op) return 0;

            // Базовая норма по графику (без вычета больничного/отпуска)
            return getPlannedDayMinutes ? getPlannedDayMinutes(op, date) : 0;
          }}
          getAbsenceForDay={(date: Date) => {
            // Return absence for this operator on this date (if any)
            return isDateInAbsence(date, absences, timesheetOperator.id) || null;
          }}
          editableMinutesPerDay={(date: Date) => {
            const op = operators.find(o => o.id === timesheetOperator.id);
            if (!op) return 0;
            // Ограничение редактирования: на больничном/отпуске и т.п. возвращает 0
            return getDayMinutes ? getDayMinutes(op, date) : 0;
          }}
          compensationMinutesPerDay={(date: Date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const key = `${timesheetOperator.id}_${dateStr}`;
            const records = compensationRecordsMap?.get(key);
            if (records && records.length > 0) {
              // Only show pending compensation hours for display
              // These are the hours that WILL be added after confirmation
              return records
                .filter(r => r.status === 'pending')
                .reduce((sum, r) => sum + (r.hours_worked || 0) * 60, 0);
            }
            return 0;
          }}
          confirmedCompensationMinutesPerDay={(date: Date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const key = `${timesheetOperator.id}_${dateStr}`;
            const records = compensationRecordsMap?.get(key);
            if (records && records.length > 0) {
              // Confirmed compensation hours - already worked and confirmed
              return records
                .filter(r => r.status === 'confirmed')
                .reduce((sum, r) => sum + (r.hours_worked || 0) * 60, 0);
            }
            return 0;
          }}
          compensationRecordsForDay={(date: Date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const key = `${timesheetOperator.id}_${dateStr}`;
            return compensationRecordsMap?.get(key) || [];
          }}
          isCalendarHoliday={(date: Date) => {
            // Check if the date is a non-working calendar exception (holiday)
            const dateStr = format(date, "yyyy-MM-dd");
            const exception = calendarExceptions?.find(e => e.exception_date === dateStr);
            return exception ? !exception.is_working_day : false;
          }}
        />
      )}
      
      {/* Unconfirm Compensation Dialog */}
      <AlertDialog open={!!unconfirmDialog} onOpenChange={(open) => !open && setUnconfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить подтверждение отработки?</AlertDialogTitle>
            <AlertDialogDescription>
              {unconfirmDialog && (
                <>
                  Вы уверены, что хотите отменить подтверждение отработки для{" "}
                  <strong>{unconfirmDialog.operatorName}</strong> за{" "}
                  <strong>{format(new Date(unconfirmDialog.record.compensation_date), "d MMMM yyyy", { locale: ru })}</strong>?
                  <br /><br />
                  Статус записи вернётся в "Ожидание подтверждения".
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={executeUnconfirm} className="bg-amber-600 hover:bg-amber-700">
              Отменить подтверждение
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Memoized component for performance optimization with many operators
export const ScheduleGroup = memo(ScheduleGroupComponent, (prevProps, nextProps) => {
  // Custom comparison - skip re-render if key props haven't changed
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.scheduleName === nextProps.scheduleName &&
    prevProps.operators.length === nextProps.operators.length &&
    prevProps.period === nextProps.period &&
    prevProps.daysCount === nextProps.daysCount &&
    prevProps.employeeColumnWidth === nextProps.employeeColumnWidth &&
    prevProps.isTodayColumnHovered === nextProps.isTodayColumnHovered &&
    prevProps.isResizing === nextProps.isResizing &&
    prevProps.syncingScheduleId === nextProps.syncingScheduleId &&
    prevProps.days.length === nextProps.days.length &&
    prevProps.operators === nextProps.operators &&
    prevProps.timesheets === nextProps.timesheets
  );
});
