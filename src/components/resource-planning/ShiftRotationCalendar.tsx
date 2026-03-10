import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User } from "lucide-react";
import { format, addDays, getDaysInMonth, getDay, isToday, getMonth, getYear } from "date-fns";
import { endOfMonth, isBefore, isAfter, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useUpdateOperator, useCalendarExceptions } from "@/hooks/useResourcePlanning";
import { useAllOperatorAbsences, isDateInAbsence } from "@/hooks/useOperatorAbsences";
import { useAllEmploymentHistory, buildEmploymentPeriodsMap } from "@/hooks/useEmploymentHistory";
import {
  useScheduleOverrides,
  getScheduleOverride,
  isWorkingDayWithOverride,
} from "@/hooks/useScheduleOverrides";
import { useOperatorTimesheets } from "@/hooks/useOperatorTimesheets";
import { useAbsenceCompensations, type CompensationRecord } from "@/hooks/useAbsenceCompensations";
import { useOvertimeEntries, createOvertimeMap, type OvertimeEntry } from "@/hooks/useOvertimeEntries";
import { useOvertimeMedalSettings, useCurrentOvertimeRankings } from "@/hooks/useOvertimeMedals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  useScrollSync,
  useResizableColumn,
  useCalendarCalculations,
  CalendarToolbar,
  ScheduleGroup,
  GrandTotalRow,
  getShiftForDate,
  getCycleDayNumber,
  isWorkingDay,
  type PeriodType,
  type AbsenceStatusFilter,
  type AbsenceTypeFilter,
  type TimesheetStatusFilter,
} from "./shift-rotation";
import { OperatorAbsenceDialog } from "./OperatorAbsenceDialog";
import { BulkAbsenceDialog } from "./BulkAbsenceDialog";
import { BulkDeleteAbsenceDialog } from "./BulkDeleteAbsenceDialog";
import { AbsenceExportDialog } from "./AbsenceExportDialog";
import { YearlyMedalRankingDialog } from "./YearlyMedalRankingDialog";
import { exportToExcel, printCalendar, exportToPdf, type ExportData } from "./shift-rotation/exports/ShiftRotationExport";

interface ShiftRotationCalendarProps {
  operators: any[];
  onEditOperator?: (operator: any) => void;
}

export const ShiftRotationCalendar = ({ operators, onEditOperator }: ShiftRotationCalendarProps) => {
  const { data: absences = [] } = useAllOperatorAbsences();
  const { data: calendarExceptions = [] } = useCalendarExceptions();
  const { data: medalSettings } = useOvertimeMedalSettings();
  const { data: allEmploymentHistory = [] } = useAllEmploymentHistory();

  // Build employment periods map from history
  const employmentPeriodsMap = useMemo(
    () => buildEmploymentPeriodsMap(allEmploymentHistory),
    [allEmploymentHistory]
  );

  // Base set of operators that can appear in the calendar (have schedules)
  // NOTE: We must include terminated operators here too, because they remain visible until the end
  // of their termination month, and the calendar still needs their timesheets/overrides to compute
  // “Не заполнено”.
  const operatorsWithSchedulesBase = useMemo(() => {
    return operators.filter(op => {
      // Must have schedule with shifts
      if (!op.work_schedules?.work_schedule_shifts?.length) return false;
      // Include active and terminated operators (we'll filter terminated by date later)
      return op.is_active || !!op.termination_date;
    });
  }, [operators]);

  // Important: fetch data (overrides/timesheets/compensations/overtime) for ALL operators that might
  // be displayed, including terminated ones. Otherwise timesheets are missing and days are
  // incorrectly marked as “unfilled”.
  const operatorIds = useMemo(
    () => operatorsWithSchedulesBase.map(op => op.id),
    [operatorsWithSchedulesBase]
  );

  const { data: scheduleOverrides = [] } = useScheduleOverrides(operatorIds);
  const [period, setPeriod] = useState<PeriodType>(() => {
    const saved = localStorage.getItem("shiftRotationCalendarPeriod");
    return (saved as PeriodType) || "1";
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<PeriodType | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [showOnlyCyclic, setShowOnlyCyclic] = useState(false);
  const [rotationFilter, setRotationFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [absenceStatusFilter, setAbsenceStatusFilter] = useState<AbsenceStatusFilter>("all");
  const [absenceTypeFilter, setAbsenceTypeFilter] = useState<AbsenceTypeFilter>("all");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState<TimesheetStatusFilter>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [syncingScheduleId, setSyncingScheduleId] = useState<string | null>(null);
  const [isTodayColumnHovered, setIsTodayColumnHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [absenceOperator, setAbsenceOperator] = useState<any>(null);
  const [showBulkAbsenceDialog, setShowBulkAbsenceDialog] = useState(false);
  const [showBulkDeleteAbsenceDialog, setShowBulkDeleteAbsenceDialog] = useState(false);
  const [showExportAbsenceDialog, setShowExportAbsenceDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Overtime medals
  const currentYear = getYear(startDate);
  const currentMonth = getMonth(startDate);
  const isMobile = useIsMobile();
  const { data: overtimeRankings = [] } = useCurrentOvertimeRankings(
    currentYear, 
    currentMonth, 
    medalSettings?.is_enabled ?? false
  );

  const {
    calendarHeaderPadRightPx,
    handleSyncScroll,
    handleSyncVerticalScroll,
    registerScrollContainer,
    registerVerticalScrollContainer,
  } = useScrollSync();

  const {
    employeeColumnWidth,
    isResizing,
    handleResizeMouseDown,
  } = useResizableColumn();

  const updateOperator = useUpdateOperator();

  // Get unique schedule names for filter
  const uniqueSchedules = useMemo(() => {
    const schedules = new Set<string>();
    operatorsWithSchedulesBase.forEach(op => {
      if (op.work_schedules?.name) {
        schedules.add(op.work_schedules.name);
      }
    });
    return Array.from(schedules).sort();
  }, [operatorsWithSchedulesBase]);

  // Filter operators by selected schedule, cyclic filter, rotation filter, absence status, and absence type
  const filteredOperators = useMemo(() => {
    let result = operatorsWithSchedulesBase;
    if (scheduleFilter !== "all") {
      result = result.filter(op => op.work_schedules?.name === scheduleFilter);
    }
    if (showOnlyCyclic) {
      result = result.filter(op => op.work_schedules?.schedule_type === "cyclic");
    }
    if (rotationFilter === "enabled") {
      result = result.filter(op => op.shift_rotation_enabled === true);
    } else if (rotationFilter === "disabled") {
      result = result.filter(op => op.shift_rotation_enabled !== true);
    }
    
    // Filter by absence status (today)
    if (absenceStatusFilter !== "all") {
      const today = new Date();
      result = result.filter(op => {
        const absence = isDateInAbsence(today, absences, op.id);
        
        if (absenceStatusFilter === "on_leave") {
          return absence && ['annual_leave', 'administrative_leave_with_compensation', 'administrative_leave_without_compensation', 'unpaid_leave', 'business_trip', 'maternity_leave'].includes(absence.absence_type);
        }
        if (absenceStatusFilter === "sick") {
          return absence && absence.absence_type === 'sick_leave';
        }
        if (absenceStatusFilter === "available") {
          // Check both: no absence AND is a working day according to schedule
          if (absence) return false;
          
          // Check if today is a working day according to operator's schedule
          const schedule = op.work_schedules;
          if (!schedule) return true; // Safety fallback

          const baseIsWorking = isWorkingDay(schedule, today, op);
          const override = getScheduleOverride(scheduleOverrides, op.id, today);
          return isWorkingDayWithOverride(baseIsWorking, override);
        }
        return true;
      });
    }
    
    // Filter by specific absence type (today)
    if (absenceTypeFilter !== "all") {
      const today = new Date();
      result = result.filter(op => {
        const absence = isDateInAbsence(today, absences, op.id);
        return absence && absence.absence_type === absenceTypeFilter;
      });
    }
    
    return result;
  }, [operatorsWithSchedulesBase, scheduleFilter, showOnlyCyclic, rotationFilter, absenceStatusFilter, absenceTypeFilter, absences, scheduleOverrides]);

  const {
    daysCount,
    days,
    months,
    shiftColorMap,
    calendarGridStyle,
    calculateMonthHours,
    calculateMonthPlanHours,
    calculateTotalHours,
    calculatePlanHours,
    calculateFullPlanHours,
    calculateGroupTotalHours,
    calculateGroupPlanHours,
    calculateGroupStats,
    calculateYearlyTotal,
    calculateGroupYearlyTotal,
    calculateGroupYearlyPlanTotal,
    getDayMinutes,
    getPlannedDayMinutes,
  } = useCalendarCalculations({
    operators: filteredOperators,
    period,
    startDate,
    endDate,
    absences,
    scheduleOverrides,
    calendarExceptions,
    employmentPeriodsMap,
    isMobile,
  });

  // Fetch timesheets for the period
  const { data: timesheets = [] } = useOperatorTimesheets(
    days[0] || startDate,
    days[days.length - 1] || startDate,
    operatorIds
  );

  // Fetch compensation records for the period
  const { data: compensations = [] } = useAbsenceCompensations(
    operatorIds,
    days[0] && days[days.length - 1] 
      ? { from: days[0], to: days[days.length - 1] }
      : undefined
  );

  // Fetch overtime entries for the period
  const { data: overtimeEntries = [] } = useOvertimeEntries(
    days[0] || startDate,
    days[days.length - 1] || startDate,
    operatorIds
  );

  // Create overtime map for fast lookup
  const overtimeMap = useMemo(() => createOvertimeMap(overtimeEntries), [overtimeEntries]);

  // Create compensation records map by operator_id + date
  // Include absence_date from parent AbsenceCompensation for display in TimeSheet
  const compensationRecordsMap = useMemo(() => {
    const map = new Map<string, (CompensationRecord & { absence_date?: string })[]>();
    compensations.forEach(comp => {
      // Cancelled compensations must not affect calendar icons, totals, tooltips, or timesheets.
      if (comp.status === "cancelled") return;
      comp.compensation_records?.forEach(record => {
        const key = `${record.operator_id}_${record.compensation_date}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        // Extend record with absence_date from parent compensation
        map.get(key)!.push({
          ...record,
          absence_date: comp.absence_date
        });
      });
    });
    return map;
  }, [compensations]);

  // Filter operators by timesheet status (needs timesheets data, so done after fetch)
  const operatorsFilteredByTimesheetStatus = useMemo(() => {
    if (timesheetStatusFilter === "all") return filteredOperators;
    
    return filteredOperators.filter(op => {
      const operatorTimesheets = timesheets.filter(ts => ts.operator_id === op.id && ts.actual_minutes > 0);
      
      if (timesheetStatusFilter === "unfilled") {
        // Operator has working days in period but no timesheet entries
        const hasWorkingDays = days.some(day => {
          const schedule = op.work_schedules;
          if (!schedule) return false;
          const baseIsWorking = isWorkingDay(schedule, day, op);
          const override = getScheduleOverride(scheduleOverrides, op.id, day);
          return isWorkingDayWithOverride(baseIsWorking, override);
        });
        return hasWorkingDays && operatorTimesheets.length === 0;
      }
      
      // Check if any timesheet matches the status filter
      return operatorTimesheets.some(ts => {
        const status = ts.status || 'pending';
        return status === timesheetStatusFilter;
      });
    });
  }, [filteredOperators, timesheets, timesheetStatusFilter, days, scheduleOverrides]);

  // Generate shift details with time info
  const shiftDetails = useMemo(() => {
    const details = new Map<string, { 
      startTime: string; 
      endTime: string; 
      breakMinutes: number;
      grossWorkMinutes: number;
      netWorkMinutes: number;
    }>();
    
    filteredOperators.forEach(op => {
      const shifts = op.work_schedules?.work_schedule_shifts;
      if (shifts) {
        shifts.forEach((shift: any) => {
          if (!details.has(shift.shift_name)) {
            const grossMinutes = shift.gross_work_minutes || 0;
            const breakMins = shift.break_minutes || 0;
            const netMinutes = shift.net_work_minutes ?? (grossMinutes - breakMins);
            
            details.set(shift.shift_name, {
              startTime: shift.start_time?.slice(0, 5) || "00:00",
              endTime: shift.end_time?.slice(0, 5) || "00:00",
              breakMinutes: breakMins,
              grossWorkMinutes: grossMinutes,
              netWorkMinutes: netMinutes
            });
          }
        });
      }
    });
    
    return details;
  }, [filteredOperators]);

  // Calculate default reduction hours from calendar exceptions
  const defaultReductionHours = useMemo(() => {
    // Find the most common reduction_hours value from shortened days
    const shortenedDays = calendarExceptions.filter(
      (ex: any) => ex.exception_type === 'shortened_day' && ex.reduction_hours != null
    );
    if (shortenedDays.length > 0) {
      return shortenedDays[0].reduction_hours || 1;
    }
    return 1; // Default to 1 hour
  }, [calendarExceptions]);

  // Group operators by their schedule
  const groupedBySchedule = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    // Use operators filtered by timesheet status if filter is active
    const baseOperators = operatorsFilteredByTimesheetStatus;
    
    // Filter terminated operators by period - show only if period overlaps with their employment
    const operatorsToShow = baseOperators.filter(op => {
      // Active operators always shown
      if (op.is_active) return true;
      
      // Terminated operators: show only if period starts before end of termination month
      if (op.termination_date && days.length > 0) {
        const terminationDate = parseISO(op.termination_date);
        const terminationMonthEnd = endOfMonth(terminationDate);
        const periodStart = days[0];
        
        return !isAfter(periodStart, terminationMonthEnd);
      }
      
      return false;
    });
    
    operatorsToShow.forEach(op => {
      const scheduleName = op.work_schedules?.name || "Без графика";
      if (!groups.has(scheduleName)) {
        groups.set(scheduleName, []);
      }
      groups.get(scheduleName)!.push(op);
    });
    
    return groups;
  }, [operatorsFilteredByTimesheetStatus, days]);

  // Track expand/collapse state
  const allGroupNames = Array.from(groupedBySchedule.keys());
  const isAllExpanded = collapsedGroups.size === 0;
  const isAllCollapsed = allGroupNames.length > 0 && collapsedGroups.size === allGroupNames.length;

  const toggleGroupCollapse = (scheduleName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleName)) {
        newSet.delete(scheduleName);
      } else {
        newSet.add(scheduleName);
      }
      return newSet;
    });
  };

  const collapseAll = () => {
    setCollapsedGroups(new Set(allGroupNames));
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  // Check if any filters are active and count them
  const hasActiveFilters = scheduleFilter !== "all" || showOnlyCyclic || rotationFilter !== "all" || absenceStatusFilter !== "all" || absenceTypeFilter !== "all";
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (scheduleFilter !== "all") count++;
    if (showOnlyCyclic) count++;
    if (rotationFilter !== "all") count++;
    if (absenceStatusFilter !== "all") count++;
    if (absenceTypeFilter !== "all") count++;
    if (timesheetStatusFilter !== "all") count++;
    return count;
  }, [scheduleFilter, showOnlyCyclic, rotationFilter, absenceStatusFilter, absenceTypeFilter, timesheetStatusFilter]);

  // Reset all filters
  const resetFilters = () => {
    setScheduleFilter("all");
    setShowOnlyCyclic(false);
    setRotationFilter("all");
    setAbsenceStatusFilter("all");
    setAbsenceTypeFilter("all");
    setTimesheetStatusFilter("all");
  };

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    localStorage.setItem("shiftRotationCalendarPeriod", newPeriod);
    if (newPeriod === "custom" && !endDate) {
      setEndDate(addDays(startDate, 6));
    }
    if (newPeriod === "year") {
      setStartDate(new Date(new Date().getFullYear(), 0, 1));
    }
  };

  // Calculate grand total (plan) - uses calculatePlanHours to match hours report logic
  // Only plan-reducing absences (annual_leave, maternity_leave, other) decrease the plan
  const grandTotal = useMemo(() => {
    let totalMinutes = 0;
    filteredOperators.forEach(operator => {
      const opTotal = calculatePlanHours(operator);
      totalMinutes += opTotal.hours * 60 + opTotal.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [filteredOperators, calculatePlanHours]);

  // Calculate grand total fact (actual hours from timesheets + overtime + compensation)
  const grandTotalFact = useMemo(() => {
    let totalMinutes = 0;
    
    // Date range boundaries for filtering compensation records
    const periodStartStr = days[0] ? format(days[0], 'yyyy-MM-dd') : '';
    const periodEndStr = days[days.length - 1] ? format(days[days.length - 1], 'yyyy-MM-dd') : '';
    
    filteredOperators.forEach(operator => {
      // Sum all timesheet actual minutes for this operator within the period
      const operatorTimesheets = timesheets.filter(ts => ts.operator_id === operator.id);
      operatorTimesheets.forEach(ts => {
        totalMinutes += ts.actual_minutes || 0;
      });
      
      // Add approved overtime
      const operatorOvertime = overtimeEntries.filter(
        oe => oe.operator_id === operator.id && oe.status === 'approved'
      );
      operatorOvertime.forEach(oe => {
        totalMinutes += oe.duration_minutes || 0;
      });
      
      // Add confirmed compensation - filter by date range to match hours report
      compensations.forEach(comp => {
        if (comp.status === 'cancelled') return;
        comp.compensation_records?.forEach(record => {
          if (record.operator_id === operator.id && record.status === 'confirmed') {
            // Only include compensation records whose date falls within the viewed period
            const recordDate = record.compensation_date;
            if (recordDate >= periodStartStr && recordDate <= periodEndStr) {
              totalMinutes += (record.hours_worked || 0) * 60;
            }
          }
        });
      });
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [filteredOperators, timesheets, overtimeEntries, compensations, days]);

  // Pre-build lookup maps for fast grand total fact calculation
  const timesheetLookup = useMemo(() => {
    const map = new Map<string, number>();
    timesheets.forEach(ts => {
      const key = `${ts.operator_id}_${ts.work_date}`;
      map.set(key, (map.get(key) || 0) + (ts.actual_minutes || 0));
    });
    return map;
  }, [timesheets]);

  const overtimeLookup = useMemo(() => {
    const map = new Map<string, number>();
    overtimeEntries.forEach(oe => {
      if (oe.status === 'approved') {
        const key = `${oe.operator_id}_${oe.work_date}`;
        map.set(key, (map.get(key) || 0) + (oe.duration_minutes || 0));
      }
    });
    return map;
  }, [overtimeEntries]);

  const compensationLookup = useMemo(() => {
    const map = new Map<string, number>();
    compensations.forEach(comp => {
      if (comp.status === 'cancelled') return;
      comp.compensation_records?.forEach(record => {
        if (record.status === 'confirmed') {
          const key = `${record.operator_id}_${record.compensation_date}`;
          map.set(key, (map.get(key) || 0) + (record.hours_worked || 0) * 60);
        }
      });
    });
    return map;
  }, [compensations]);

  // Calculate fact hours for a specific month using fast map lookups
  const calculateMonthFactHoursForGrandTotal = useMemo(() => {
    return (operatorId: string, month: Date): { hours: number; minutes: number } => {
      let totalMinutes = 0;
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthDaysCount = getDaysInMonth(month);
      
      for (let i = 0; i < monthDaysCount; i++) {
        const day = addDays(monthStart, i);
        const dateStr = format(day, "yyyy-MM-dd");
        const key = `${operatorId}_${dateStr}`;
        
        totalMinutes += timesheetLookup.get(key) || 0;
        totalMinutes += overtimeLookup.get(key) || 0;
        totalMinutes += compensationLookup.get(key) || 0;
      }
      
      return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
    };
  }, [timesheetLookup, overtimeLookup, compensationLookup]);

  // Calculate comparison period total
  const comparisonTotal = useMemo(() => {
    if (!comparisonPeriod) return null;
    const compDaysCount = comparisonPeriod === "month" 
      ? getDaysInMonth(startDate) 
      : comparisonPeriod === "year" 
        ? 365 
        : parseInt(comparisonPeriod);
    const comparisonDays = Array.from({ length: compDaysCount }, (_, i) => addDays(startDate, i));
    
    let totalMinutes = 0;
    filteredOperators.forEach(operator => {
      comparisonDays.forEach(day => {
        const shift = getShiftForDate(operator, day);
        if (shift) {
          const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
          totalMinutes += netMinutes;
        }
      });
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [comparisonPeriod, startDate, filteredOperators]);

  // Mass sync operators' cycle start dates
  const handleMassSyncCycleStartDate = async (scheduleId: string, scheduleCycleStartDate: string | null, operatorsToSync: any[]) => {
    if (!scheduleCycleStartDate) {
      toast.error("У графика не указана дата начала цикла");
      return;
    }
    
    setSyncingScheduleId(scheduleId);
    
    try {
      const updates = operatorsToSync.map(op => 
        updateOperator.mutateAsync({
          id: op.id,
          shift_rotation_start_date: scheduleCycleStartDate
        })
      );
      
      await Promise.all(updates);
      toast.success(`Синхронизировано ${operatorsToSync.length} операторов`);
    } catch (error: any) {
      toast.error("Ошибка синхронизации: " + error.message);
    } finally {
      setSyncingScheduleId(null);
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    const data: ExportData = {
      days,
      months,
      period,
      operators: filteredOperators,
      groupedBySchedule,
      timesheets,
      overtimeEntries,
      compensations,
      absences,
      calendarExceptions,
      scheduleOverrides,
      shiftColorMap,
      grandTotal,
      grandTotalFact,
      calculateTotalHours,
      calculatePlanHours,
      calculateGroupStats,
      calculateMonthPlanHours,
      employmentPeriodsMap,
    };
    exportToExcel(data);
  };

  // Print handler
  const handlePrint = () => {
    const data: ExportData = {
      days,
      months,
      period,
      operators: filteredOperators,
      groupedBySchedule,
      timesheets,
      overtimeEntries,
      compensations,
      absences,
      calendarExceptions,
      scheduleOverrides,
      shiftColorMap,
      grandTotal,
      grandTotalFact,
      calculateTotalHours,
      calculatePlanHours,
      calculateGroupStats,
      calculateMonthPlanHours,
      employmentPeriodsMap,
    };
    printCalendar(data);
  };

  // PDF export
  const handleExportToPdf = () => {
    const data: ExportData = {
      days,
      months,
      period,
      operators: filteredOperators,
      groupedBySchedule,
      timesheets,
      overtimeEntries,
      compensations,
      absences,
      calendarExceptions,
      shiftColorMap,
      grandTotal,
      grandTotalFact,
      calculateTotalHours,
      calculatePlanHours,
      calculateGroupStats,
      calculateMonthPlanHours,
      employmentPeriodsMap,
    };
    exportToPdf(data);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      calendarContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen change events and Escape key
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen?.();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  if (operatorsWithSchedulesBase.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Нет операторов с назначенными графиками</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={calendarContainerRef}
      className={cn(
        isResizing && "cursor-col-resize select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none max-h-screen overflow-auto bg-background"
      )}
    >
      <CardHeader 
        className="pb-2 sm:pb-3 sticky top-0 z-10 bg-card px-3 sm:px-6"
        style={{ boxShadow: "0 4px 12px -4px hsl(var(--foreground) / 0.1), 0 2px 6px -2px hsl(var(--foreground) / 0.05)" }}
      >
        <CalendarToolbar
          period={period}
          onPeriodChange={handlePeriodChange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          scheduleFilter={scheduleFilter}
          onScheduleFilterChange={setScheduleFilter}
          uniqueSchedules={uniqueSchedules}
          showOnlyCyclic={showOnlyCyclic}
          onShowOnlyCyclicChange={setShowOnlyCyclic}
          rotationFilter={rotationFilter}
          onRotationFilterChange={setRotationFilter}
          absenceStatusFilter={absenceStatusFilter}
          onAbsenceStatusFilterChange={setAbsenceStatusFilter}
          absenceTypeFilter={absenceTypeFilter}
          onAbsenceTypeFilterChange={setAbsenceTypeFilter}
          timesheetStatusFilter={timesheetStatusFilter}
          onTimesheetStatusFilterChange={setTimesheetStatusFilter}
          filteredOperatorsCount={operatorsFilteredByTimesheetStatus.length}
          grandTotal={grandTotal}
          grandTotalFact={grandTotalFact}
          comparisonPeriod={comparisonPeriod}
          onComparisonPeriodChange={setComparisonPeriod}
          comparisonTotal={comparisonTotal}
          shiftColorMap={shiftColorMap}
          shiftDetails={shiftDetails}
          isAllExpanded={isAllExpanded}
          isAllCollapsed={isAllCollapsed}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onExportExcel={handleExportToExcel}
          onExportPdf={handleExportToPdf}
          onPrint={handlePrint}
          onBulkAbsence={() => setShowBulkAbsenceDialog(true)}
          onBulkDeleteAbsence={() => setShowBulkDeleteAbsenceDialog(true)}
          isStartDatePickerOpen={isStartDatePickerOpen}
          onStartDatePickerOpenChange={setIsStartDatePickerOpen}
          isEndDatePickerOpen={isEndDatePickerOpen}
          onEndDatePickerOpenChange={setIsEndDatePickerOpen}
          daysCount={daysCount}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          hasActiveFilters={hasActiveFilters}
          activeFiltersCount={activeFiltersCount}
          onResetFilters={resetFilters}
          onExportAbsences={() => setShowExportAbsenceDialog(true)}
          defaultReductionHours={defaultReductionHours}
        />
        {medalSettings?.is_enabled && (
          <div className="mt-2">
            <YearlyMedalRankingDialog />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-2 py-2 sm:py-4">
          <div 
            className={cn(
              "overflow-y-auto overflow-x-auto",
              isFullscreen ? "max-h-[calc(100vh-180px)]" : "max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-300px)]"
            )} 
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="flex flex-col gap-3 w-full min-w-0">
              {Array.from(groupedBySchedule.entries()).map(([scheduleName, ops], index) => (
                <ScheduleGroup
                  key={scheduleName}
                  scheduleName={scheduleName}
                  operators={ops}
                  isCollapsed={collapsedGroups.has(scheduleName)}
                  onToggleCollapse={() => toggleGroupCollapse(scheduleName)}
                  onEditOperator={onEditOperator}
                  onManageAbsences={setAbsenceOperator}
                  absences={absences}
                  scheduleOverrides={scheduleOverrides}
                  calendarExceptions={calendarExceptions}
                  timesheets={timesheets}
                  compensationRecordsMap={compensationRecordsMap}
                  overtimeMap={overtimeMap}
                  overtimeRankings={overtimeRankings}
                  medalsEnabled={medalSettings?.is_enabled ?? false}
                  days={days}
                  months={months}
                  period={period}
                  daysCount={daysCount}
                  shiftColorMap={shiftColorMap}
                  calendarGridStyle={calendarGridStyle}
                  employeeColumnWidth={employeeColumnWidth}
                  isMobile={isMobile}
                  isResizing={isResizing}
                  onResizeMouseDown={handleResizeMouseDown}
                  isTodayColumnHovered={isTodayColumnHovered}
                  onTodayColumnHover={setIsTodayColumnHovered}
                  syncingScheduleId={syncingScheduleId}
                  onMassSyncCycleStartDate={handleMassSyncCycleStartDate}
                  registerScrollContainer={registerScrollContainer}
                  registerVerticalScrollContainer={registerVerticalScrollContainer}
                  handleSyncScroll={handleSyncScroll}
                  handleSyncVerticalScroll={handleSyncVerticalScroll}
                  calculateTotalHours={calculateTotalHours}
                  calculatePlanHours={calculatePlanHours}
                  calculateFullPlanHours={calculateFullPlanHours}
                  calculateMonthHours={calculateMonthHours}
                  calculateMonthPlanHours={calculateMonthPlanHours}
                  calculateGroupStats={calculateGroupStats}
                  calculateYearlyTotal={calculateYearlyTotal}
                  calculateGroupYearlyTotal={calculateGroupYearlyTotal}
                  getDayMinutes={getDayMinutes}
                  getPlannedDayMinutes={getPlannedDayMinutes}
                  printRef={printRef}
                  isFirstGroup={index === 0}
                  employmentPeriodsMap={employmentPeriodsMap}
                />
              ))}

              <GrandTotalRow
                days={days}
                months={months}
                period={period}
                filteredOperators={filteredOperators}
                employeeColumnWidth={employeeColumnWidth}
                isMobile={isMobile}
                calendarGridStyle={calendarGridStyle}
                isTodayColumnHovered={isTodayColumnHovered}
                onTodayColumnHover={setIsTodayColumnHovered}
                registerScrollContainer={registerScrollContainer}
                handleSyncScroll={handleSyncScroll}
                calculateMonthHours={calculateMonthHours}
                calculateMonthPlanHours={calculateMonthPlanHours}
                calculateGroupPlanHours={calculateGroupPlanHours}
                calculateGroupYearlyPlanTotal={calculateGroupYearlyPlanTotal}
                grandTotalFact={grandTotalFact}
                calculateMonthFactHours={calculateMonthFactHoursForGrandTotal}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Absence management dialog */}
      <OperatorAbsenceDialog
        open={!!absenceOperator}
        onOpenChange={(open) => !open && setAbsenceOperator(null)}
        operator={absenceOperator}
      />

      {/* Bulk absence dialog */}
      <BulkAbsenceDialog
        open={showBulkAbsenceDialog}
        onOpenChange={setShowBulkAbsenceDialog}
        operators={filteredOperators}
      />

      {/* Bulk delete absence dialog */}
      <BulkDeleteAbsenceDialog
        open={showBulkDeleteAbsenceDialog}
        onOpenChange={setShowBulkDeleteAbsenceDialog}
        operators={filteredOperators}
      />

      {/* Absence export dialog */}
      <AbsenceExportDialog
        open={showExportAbsenceDialog}
        onOpenChange={setShowExportAbsenceDialog}
      />
    </Card>
  );
};
