import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User } from "lucide-react";
import { format, addDays, getDaysInMonth, getDay, isToday, getMonth, getYear } from "date-fns";
import { ru } from "date-fns/locale";
import { useUpdateOperator, useCalendarExceptions } from "@/hooks/useResourcePlanning";
import { useAllOperatorAbsences, isDateInAbsence } from "@/hooks/useOperatorAbsences";
import { useScheduleOverrides } from "@/hooks/useScheduleOverrides";
import { useOperatorTimesheets } from "@/hooks/useOperatorTimesheets";
import { useAbsenceCompensations, type CompensationRecord } from "@/hooks/useAbsenceCompensations";
import { useOvertimeEntries, createOvertimeMap, type OvertimeEntry } from "@/hooks/useOvertimeEntries";
import { useOvertimeMedalSettings, useCurrentOvertimeRankings } from "@/hooks/useOvertimeMedals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

import {
  useScrollSync,
  useResizableColumn,
  useCalendarCalculations,
  CalendarToolbar,
  ScheduleGroup,
  GrandTotalRow,
  getShiftForDate,
  getCycleDayNumber,
  type PeriodType,
  type AbsenceStatusFilter,
  type AbsenceTypeFilter,
} from "./shift-rotation";
import { OperatorAbsenceDialog } from "./OperatorAbsenceDialog";
import { BulkAbsenceDialog } from "./BulkAbsenceDialog";
import { BulkDeleteAbsenceDialog } from "./BulkDeleteAbsenceDialog";
import { AbsenceExportDialog } from "./AbsenceExportDialog";
import { YearlyMedalRankingDialog } from "./YearlyMedalRankingDialog";

interface ShiftRotationCalendarProps {
  operators: any[];
  onEditOperator?: (operator: any) => void;
}

export const ShiftRotationCalendar = ({ operators, onEditOperator }: ShiftRotationCalendarProps) => {
  const { data: absences = [] } = useAllOperatorAbsences();
  const { data: calendarExceptions = [] } = useCalendarExceptions();
  const { data: medalSettings } = useOvertimeMedalSettings();
  const operatorIds = useMemo(() => operators.filter(op => op.is_active).map(op => op.id), [operators]);
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

  // Only show operators with schedules
  const operatorsWithSchedules = operators.filter(op => 
    op.is_active && op.work_schedules?.work_schedule_shifts?.length > 0
  );

  // Get unique schedule names for filter
  const uniqueSchedules = useMemo(() => {
    const schedules = new Set<string>();
    operatorsWithSchedules.forEach(op => {
      if (op.work_schedules?.name) {
        schedules.add(op.work_schedules.name);
      }
    });
    return Array.from(schedules).sort();
  }, [operatorsWithSchedules]);

  // Filter operators by selected schedule, cyclic filter, rotation filter, absence status, and absence type
  const filteredOperators = useMemo(() => {
    let result = operatorsWithSchedules;
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
          return !absence;
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
  }, [operatorsWithSchedules, scheduleFilter, showOnlyCyclic, rotationFilter, absenceStatusFilter, absenceTypeFilter, absences]);

  const {
    daysCount,
    days,
    months,
    shiftColorMap,
    calendarGridStyle,
    calculateMonthHours,
    calculateTotalHours,
    calculatePlanHours,
    calculateFullPlanHours,
    calculateGroupTotalHours,
    calculateGroupStats,
    calculateYearlyTotal,
    calculateGroupYearlyTotal,
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
    
    filteredOperators.forEach(op => {
      const scheduleName = op.work_schedules?.name || "Без графика";
      if (!groups.has(scheduleName)) {
        groups.set(scheduleName, []);
      }
      groups.get(scheduleName)!.push(op);
    });
    
    return groups;
  }, [filteredOperators]);

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
    return count;
  }, [scheduleFilter, showOnlyCyclic, rotationFilter, absenceStatusFilter, absenceTypeFilter]);

  // Reset all filters
  const resetFilters = () => {
    setScheduleFilter("all");
    setShowOnlyCyclic(false);
    setRotationFilter("all");
    setAbsenceStatusFilter("all");
    setAbsenceTypeFilter("all");
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

  // Calculate grand total
  const grandTotal = useMemo(() => {
    let totalMinutes = 0;
    filteredOperators.forEach(operator => {
      const opTotal = calculateTotalHours(operator);
      totalMinutes += opTotal.hours * 60 + opTotal.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }, [filteredOperators, calculateTotalHours]);

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
    const wb = XLSX.utils.book_new();
    const exportData: any[] = [];
    
    const headerRow = ['Сотрудник', 'График', ...days.map(day => format(day, 'dd.MM.yyyy')), 'Итого'];
    exportData.push(headerRow);
    
    let grandTotalMinutes = 0;

    Array.from(groupedBySchedule.entries()).forEach(([scheduleName, ops]) => {
      exportData.push([`--- ${scheduleName} (${ops.length}) ---`]);
      
      let groupTotalMinutes = 0;

      ops.forEach(operator => {
        let operatorTotalMinutes = 0;
        const dayValues = days.map(day => {
          const shift = getShiftForDate(operator, day);
          if (shift) {
            const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
            operatorTotalMinutes += netMinutes;
            const hours = Math.floor(netMinutes / 60);
            const mins = netMinutes % 60;
            return `${shift.shift_name} (${hours}ч${mins > 0 ? ` ${mins}м` : ''})`;
          }
          return 'Выходной';
        });

        const totalHours = Math.floor(operatorTotalMinutes / 60);
        const totalMins = operatorTotalMinutes % 60;
        groupTotalMinutes += operatorTotalMinutes;

        const row = [
          operator.full_name,
          operator.work_schedules?.name || 'Без графика',
          ...dayValues,
          `${totalHours}ч${totalMins > 0 ? ` ${totalMins}м` : ''}`
        ];
        exportData.push(row);
      });

      const groupHours = Math.floor(groupTotalMinutes / 60);
      const groupMins = groupTotalMinutes % 60;
      grandTotalMinutes += groupTotalMinutes;
      
      exportData.push([
        `Итого по группе "${scheduleName}":`,
        '',
        ...days.map(() => ''),
        `${groupHours}ч${groupMins > 0 ? ` ${groupMins}м` : ''}`
      ]);
      exportData.push([]);
    });

    const grandHours = Math.floor(grandTotalMinutes / 60);
    const grandMins = grandTotalMinutes % 60;
    exportData.push([]);
    exportData.push([
      'ОБЩИЙ ИТОГ:',
      '',
      ...days.map(() => ''),
      `${grandHours}ч${grandMins > 0 ? ` ${grandMins}м` : ''}`
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 25 },
      ...days.map(() => ({ wch: 18 })),
      { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'График ротации');
    
    const startDateStr = format(days[0], 'dd.MM.yyyy');
    const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
    XLSX.writeFile(wb, `График_ротации_${startDateStr}-${endDateStr}.xlsx`);
  };

  // Print handler
  const handlePrint = () => {
    const startDateStr = format(days[0], 'dd.MM.yyyy');
    const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>График ротации смен ${startDateStr} - ${endDateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: 600; }
          td:first-child { text-align: left; font-weight: 500; }
          .group-header { background: #eee; font-weight: 600; text-align: left; }
          .day-off { color: #999; }
          .shift-1 { background: #dbeafe; }
          .shift-2 { background: #fef3c7; }
          .shift-3 { background: #d1fae5; }
          .shift-4 { background: #ede9fe; }
          .today { background: #fef08a !important; font-weight: bold; }
          .weekend { background: #fee2e2; }
          .cycle-day { font-size: 9px; color: #888; }
          .group-stats { background: #f8fafc; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>📅 График ротации смен</h1>
        <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${filteredOperators.length}</h2>
        
        <table>
          <thead>
            <tr>
              <th>Сотрудник</th>
              ${days.map(day => `
                <th class="${isToday(day) ? 'today' : ''} ${getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : ''}">
                  ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd MMM', { locale: ru })}
                </th>
              `).join('')}
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
              const groupStats = calculateGroupStats(ops);
              return `
                <tr class="group-header">
                  <td colspan="${days.length + 2}">${scheduleName} (${ops.length} чел.)</td>
                </tr>
                ${ops.map(operator => {
                  const shiftNameToIndex = new Map<string, number>();
                  Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
                  const opTotal = calculateTotalHours(operator);
                  
                  return `
                    <tr>
                      <td>${operator.full_name}</td>
                      ${days.map(day => {
                        const shift = getShiftForDate(operator, day);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                        const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
                        const netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
                        const hours = Math.floor(netMinutes / 60);
                        const mins = netMinutes % 60;
                        const cycleInfo = getCycleDayNumber(operator.work_schedules, day, operator);
                        
                        return `
                          <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'}">
                            ${shift ? `${shift.shift_name.split(' ')[0]}<br/>${hours}ч${mins > 0 ? ' ' + mins + 'м' : ''}` : '—'}
                            ${cycleInfo ? '<br/><span class="cycle-day">Д' + cycleInfo.dayInCycle + '</span>' : ''}
                          </td>
                        `;
                      }).join('')}
                      <td>${opTotal.hours}ч${opTotal.minutes > 0 ? ' ' + opTotal.minutes + 'м' : ''}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="group-stats">
                  <td colspan="2" style="text-align: left; font-weight: 500;">
                    Итого: ✓${groupStats.workingDays} раб. | ✗${groupStats.offDays} вых. | ${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? ' ' + groupStats.totalMinutes + 'м' : ''}
                  </td>
                  <td colspan="${days.length}"></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // PDF export
  const handleExportToPdf = () => {
    const startDateStr = format(days[0], 'dd.MM.yyyy');
    const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
    
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) return;

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>График ротации смен ${startDateStr} - ${endDateStr}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 10px; }
          h1 { font-size: 16px; margin-bottom: 8px; color: #1f2937; }
          h2 { font-size: 12px; color: #666; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #e5e7eb; padding: 4px 3px; text-align: center; }
          th { background: #f3f4f6; font-weight: 600; font-size: 9px; }
          td:first-child { text-align: left; font-weight: 500; min-width: 100px; }
          .group-header { background: #1f2937; color: white; font-weight: 600; text-align: left; font-size: 11px; }
          .shift-1 { background: #fef3c7; color: #92400e; }
          .shift-2 { background: #d1fae5; color: #065f46; }
          .shift-3 { background: #ddd6fe; color: #5b21b6; }
          .shift-4 { background: #dbeafe; color: #1e40af; }
          .day-off { background: #fef2f2; color: #991b1b; }
          .weekend { background: #fee2e2; }
          .today { background: #fef08a !important; font-weight: bold; }
          .total-col { background: #d1fae5; color: #065f46; font-weight: 600; }
          .summary { margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📅 График ротации смен</h1>
        <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${filteredOperators.length}</h2>
        
        ${Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
          const groupStats = calculateGroupStats(ops);
          const schedule = ops[0]?.work_schedules;
          const isCyclic = schedule?.schedule_type === 'cyclic';
          
          return `
          <table>
            <thead>
              <tr>
                <th colspan="${days.length + 2}" class="group-header">
                  ${scheduleName} (${ops.length} чел.)
                  ${isCyclic ? ' — Циклический ' + (schedule?.cycle_days_on || 2) + '/' + (schedule?.cycle_days_off || 2) : ''}
                </th>
              </tr>
              <tr>
                <th style="text-align: left;">Сотрудник</th>
                ${days.map(day => `
                  <th class="${isToday(day) ? 'today' : ''} ${getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : ''}">
                    ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd')}
                  </th>
                `).join('')}
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              ${ops.map(operator => {
                const shiftNameToIndex = new Map<string, number>();
                Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
                const opTotal = calculateTotalHours(operator);
                
                return `
                  <tr>
                    <td>${operator.full_name}${operator.shift_rotation_enabled ? ' 🔄' : ''}</td>
                    ${days.map(day => {
                      const shift = getShiftForDate(operator, day);
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
                      const netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
                      const hours = Math.floor(netMinutes / 60);
                      const mins = netMinutes % 60;
                      
                      return `
                        <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'}">
                          ${shift ? hours + 'ч' + (mins > 0 ? mins + 'м' : '') : '—'}
                        </td>
                      `;
                    }).join('')}
                    <td class="total-col">${opTotal.hours}ч${opTotal.minutes > 0 ? opTotal.minutes + 'м' : ''}</td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: #f9fafb; font-weight: 500;">
                <td style="text-align: left;"><strong>Итого:</strong></td>
                <td colspan="${days.length}">✅ Рабочих: ${groupStats.workingDays} | ⛔ Выходных: ${groupStats.offDays}</td>
                <td class="total-col">${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? groupStats.totalMinutes + 'м' : ''}</td>
              </tr>
            </tbody>
          </table>
        `;
        }).join('')}
        
        <div class="summary">
          <strong>ОБЩИЙ ИТОГ:</strong> ${filteredOperators.length} операторов, ${grandTotal.hours}ч${grandTotal.minutes > 0 ? ' ' + grandTotal.minutes + 'м' : ''}
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    pdfWindow.document.close();
  };

  if (operatorsWithSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Нет операторов с назначенными графиками</p>
        </CardContent>
      </Card>
    );
  }

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
          filteredOperatorsCount={filteredOperators.length}
          grandTotal={grandTotal}
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
                  calculateGroupStats={calculateGroupStats}
                  calculateYearlyTotal={calculateYearlyTotal}
                  calculateGroupYearlyTotal={calculateGroupYearlyTotal}
                  getDayMinutes={getDayMinutes}
                  getPlannedDayMinutes={getPlannedDayMinutes}
                  printRef={printRef}
                  isFirstGroup={index === 0}
                />
              ))}

              <GrandTotalRow
                days={days}
                months={months}
                period={period}
                filteredOperators={filteredOperators}
                employeeColumnWidth={employeeColumnWidth}
                calendarGridStyle={calendarGridStyle}
                isTodayColumnHovered={isTodayColumnHovered}
                onTodayColumnHover={setIsTodayColumnHovered}
                registerScrollContainer={registerScrollContainer}
                handleSyncScroll={handleSyncScroll}
                calculateMonthHours={calculateMonthHours}
                calculateGroupTotalHours={calculateGroupTotalHours}
                calculateGroupYearlyTotal={calculateGroupYearlyTotal}
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
