import XLSX from "@/lib/excel";
import { startOfMonth, getDaysInMonth, addDays as addDaysUtil } from "date-fns";
import { format, getDay, isToday, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getShiftForDate, getCycleDayNumber, parseDateOnly, isWorkingDay } from "../utils";
import { type ScheduleOverride } from "@/hooks/useScheduleOverrides";
import { type EmploymentPeriodsMap, isDateOutsideEmployment, isDateBeforeFirstEmployment } from "@/hooks/useEmploymentHistory";

export interface CalendarException {
  id: string;
  exception_date: string;
  exception_type: string;
  is_working_day: boolean;
  name: string;
  reduction_hours?: number | null;
}

export interface ExportData {
  days: Date[];
  months?: Date[];
  period?: string;
  operators: any[];
  groupedBySchedule: Map<string, any[]>;
  timesheets: any[];
  overtimeEntries: any[];
  compensations: any[];
  absences: any[];
  calendarExceptions?: CalendarException[];
  scheduleOverrides?: ScheduleOverride[];
  shiftColorMap: Map<string, any>;
  grandTotal: { hours: number; minutes: number };
  grandTotalFact: { hours: number; minutes: number };
  calculateTotalHours: (operator: any) => { hours: number; minutes: number };
  calculatePlanHours: (operator: any) => { hours: number; minutes: number };
  calculateGroupStats: (ops: any[]) => { 
    workingDays: number; 
    offDays: number; 
    totalHours: number; 
    totalMinutes: number; 
  };
  calculateMonthPlanHours?: (operator: any, month: Date) => { hours: number; minutes: number };
  employmentPeriodsMap?: EmploymentPeriodsMap;
}

// Absence type labels for export (copied from useOperatorAbsences to avoid circular imports)
const ABSENCE_LABELS: Record<string, { label: string; icon: string; shortLabel: string }> = {
  annual_leave: { label: "Ежегодный отпуск", icon: "🏖️", shortLabel: "Отп" },
  sick_leave: { label: "Больничный", icon: "🏥", shortLabel: "Бол" },
  administrative_leave_with_compensation: { label: "Адм. (с отраб.)", icon: "📋", shortLabel: "Адм" },
  administrative_leave_without_compensation: { label: "Адм. (без отраб.)", icon: "📋", shortLabel: "Адм" },
  maternity_leave: { label: "Декретный отпуск", icon: "👶", shortLabel: "Дек" },
  unpaid_leave: { label: "Без сохранения ЗП", icon: "💰", shortLabel: "БЗП" },
  business_trip: { label: "Командировка", icon: "✈️", shortLabel: "Ком" },
  unauthorized_absence: { label: "Прогул", icon: "🚫", shortLabel: "Про" },
  other: { label: "Другое", icon: "📝", shortLabel: "Др" },
};

// Helper function to check if operator is terminated on a given date
// Uses employment periods map if available, otherwise falls back to single termination_date
const isOperatorTerminatedOnDate = (operator: any, date: Date, employmentPeriodsMap?: EmploymentPeriodsMap): boolean => {
  if (employmentPeriodsMap && employmentPeriodsMap.size > 0) {
    const dateStr = format(date, "yyyy-MM-dd");
    if (isDateBeforeFirstEmployment(operator.id, dateStr, employmentPeriodsMap)) {
      return false;
    }
    return isDateOutsideEmployment(operator.id, dateStr, employmentPeriodsMap);
  }
  if (!operator.termination_date) return false;
  const terminationDate = parseDateOnly(operator.termination_date);
  if (!terminationDate) return false;
  return date > terminationDate;
};

// Helper function to check if date is before hire
const isBeforeHireDateOnDate = (operator: any, date: Date, employmentPeriodsMap?: EmploymentPeriodsMap): boolean => {
  if (employmentPeriodsMap && employmentPeriodsMap.size > 0) {
    const dateStr = format(date, "yyyy-MM-dd");
    return isDateBeforeFirstEmployment(operator.id, dateStr, employmentPeriodsMap);
  }
  if (!operator.hire_date) return false;
  const hireDate = parseDateOnly(operator.hire_date);
  if (!hireDate) return false;
  return date < hireDate;
};

// Helper function to get absence for operator on a specific date
const getAbsenceForDate = (operatorId: string, date: Date, absences: any[]): any | null => {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  return absences.find((absence: any) => {
    if (absence.operator_id !== operatorId) return false;
    if (absence.status === 'cancelled' || absence.status === 'rejected') return false;
    
    const startDate = parseDateOnly(absence.start_date);
    const endDate = parseDateOnly(absence.end_date);
    if (!startDate || !endDate) return false;
    
    return dateOnly >= startDate && dateOnly <= endDate;
  }) || null;
};

// Helper to check if schedule is 5/2 type (affected by holidays)
const is52ScheduleType = (operator: any): boolean => {
  const scheduleType = operator.work_schedules?.schedule_type;
  const cycleDaysOn = operator.work_schedules?.cycle_days_on || 5;
  const cycleDaysOff = operator.work_schedules?.cycle_days_off || 2;
  
  return (
    scheduleType === '5/2' || 
    scheduleType === 'weekly' || 
    (scheduleType === 'shift' && cycleDaysOn === 5 && cycleDaysOff === 2) ||
    (cycleDaysOn === 5 && cycleDaysOff === 2 && scheduleType !== 'cyclic')
  );
};

// Helper to get holiday exception for a date
const getHolidayException = (dateStr: string, calendarExceptions: CalendarException[]): CalendarException | null => {
  return calendarExceptions.find(
    ex => ex.exception_date === dateStr && 
         ex.exception_type === 'holiday' && 
         !ex.is_working_day
  ) || null;
};

// Helper to get shortened day exception
const getShortenedDayException = (dateStr: string, calendarExceptions: CalendarException[]): CalendarException | null => {
  return calendarExceptions.find(
    ex => ex.exception_date === dateStr && 
         ex.exception_type === 'shortened_day' && 
         ex.is_working_day
  ) || null;
};

// Helper to get shift for date considering schedule overrides and extra working day exceptions
// This mirrors the logic in useCalendarCalculations.getShiftForDateWithOverride
const getShiftWithOverride = (
  operator: any, 
  day: Date, 
  scheduleOverrides: ScheduleOverride[], 
  calendarExceptions: CalendarException[]
): any => {
  const dateStr = format(day, "yyyy-MM-dd");
  const override = scheduleOverrides.find(
    (o) => o.operator_id === operator.id && o.override_date === dateStr
  );

  if (override) {
    if (!override.is_working_day) return null;
    const schedule = operator.work_schedules;
    const shifts = schedule?.work_schedule_shifts;
    if (!shifts || shifts.length === 0) return null;
    if (override.shift_number) {
      return shifts.find((s: any) => s.shift_number === override.shift_number) || shifts[0];
    }
    return getShiftForDate(operator, day) || shifts[0];
  }

  // Handle extra_working_day exceptions for non-cyclic schedules
  const isCyclic = operator.work_schedules?.schedule_type === 'cyclic';
  if (!isCyclic) {
    const exception = calendarExceptions.find(ex => ex.exception_date === dateStr);
    if (exception && exception.is_working_day && exception.exception_type === 'extra_working_day') {
      const normallyWorking = isWorkingDay(operator.work_schedules, day, operator);
      if (!normallyWorking) {
        const shifts = operator.work_schedules?.work_schedule_shifts;
        if (shifts && shifts.length > 0) {
          if (operator.assigned_shift_number) {
            return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number) || shifts[0];
          }
          return shifts[0];
        }
      }
    }
  }

  return getShiftForDate(operator, day);
}

// Helper function to get fact minutes for a specific operator and date
const getFactMinutesForDay = (
  operatorId: string, 
  dateStr: string,
  timesheets: any[],
  overtimeEntries: any[],
  compensations: any[]
): number => {
  let factMinutes = 0;
  
  // Timesheet
  const dayTimesheet = timesheets.find(
    ts => ts.operator_id === operatorId && ts.work_date === dateStr
  );
  if (dayTimesheet) {
    factMinutes = dayTimesheet.actual_minutes || 0;
  }
  
  // Approved overtime
  const dayOvertime = overtimeEntries.filter(
    oe => oe.operator_id === operatorId && 
          oe.work_date === dateStr && 
          oe.status === 'approved'
  );
  dayOvertime.forEach(oe => {
    factMinutes += oe.duration_minutes || 0;
  });
  
  // Confirmed compensation
  compensations.forEach(comp => {
    if (comp.status === 'cancelled') return;
    comp.compensation_records?.forEach((record: any) => {
      if (record.operator_id === operatorId && 
          record.compensation_date === dateStr && 
          record.status === 'confirmed') {
        factMinutes += (record.hours_worked || 0) * 60;
      }
    });
  });
  
  return factMinutes;
};

// Get operator fact total for period
const getOperatorFactTotal = (
  operatorId: string, 
  days: Date[],
  timesheets: any[],
  overtimeEntries: any[],
  compensations: any[]
) => {
  let totalFactMinutes = 0;
  days.forEach(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    totalFactMinutes += getFactMinutesForDay(operatorId, dateStr, timesheets, overtimeEntries, compensations);
  });
  const hours = Math.floor(totalFactMinutes / 60);
  const mins = totalFactMinutes % 60;
  return { hours, minutes: mins };
};

// Get group fact total
const getGroupFactTotal = (
  ops: any[], 
  days: Date[],
  timesheets: any[],
  overtimeEntries: any[],
  compensations: any[]
) => {
  let totalFactMinutes = 0;
  ops.forEach(operator => {
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      totalFactMinutes += getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
    });
  });
  const hours = Math.floor(totalFactMinutes / 60);
  const mins = totalFactMinutes % 60;
  return { hours, minutes: mins };
};

// Format minutes as hours string
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}ч${m > 0 ? ` ${m}м` : ''}`;
};

// Get operator fact total for a specific month
const getOperatorMonthFactTotal = (
  operatorId: string,
  month: Date,
  timesheets: any[],
  overtimeEntries: any[],
  compensations: any[]
) => {
  let totalMinutes = 0;
  const monthStart = startOfMonth(month);
  const monthDays = getDaysInMonth(month);
  
  for (let i = 0; i < monthDays; i++) {
    const day = addDaysUtil(monthStart, i);
    const dateStr = format(day, "yyyy-MM-dd");
    totalMinutes += getFactMinutesForDay(operatorId, dateStr, timesheets, overtimeEntries, compensations);
  }
  
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
};
export const exportToExcel = (data: ExportData) => {
  const { 
    days, months = [], period, operators, groupedBySchedule, timesheets, overtimeEntries, 
    compensations, absences, calendarExceptions = [], scheduleOverrides = [], calculatePlanHours, calculateMonthPlanHours, employmentPeriodsMap 
  } = data;
  
  const wb = XLSX.utils.book_new();
  const exportData: any[] = [];
  
  if (period === 'year' && months.length > 0 && calculateMonthPlanHours) {
    // YEAR MODE: Monthly columns
    const headerRow1 = ['Сотрудник', 'График'];
    const headerRow2 = ['', ''];
    months.forEach(month => {
      headerRow1.push(format(month, 'LLLL yyyy', { locale: ru }));
      headerRow1.push('');
      headerRow2.push('План');
      headerRow2.push('Факт');
    });
    headerRow1.push('Итого');
    headerRow1.push('');
    headerRow2.push('План');
    headerRow2.push('Факт');
    
    exportData.push(headerRow1);
    exportData.push(headerRow2);
    
    let grandTotalPlanMin = 0;
    let grandTotalFactMin = 0;

    Array.from(groupedBySchedule.entries()).forEach(([scheduleName, ops]) => {
      exportData.push([`--- ${scheduleName} (${ops.length}) ---`]);
      
      let groupPlanMin = 0;
      let groupFactMin = 0;

      ops.forEach(operator => {
        const isTerminated = operator.termination_date != null;
        const operatorName = isTerminated 
          ? `${operator.full_name} (уволен ${format(parseDateOnly(operator.termination_date)!, 'dd.MM.yy')})`
          : operator.full_name;
        
        let opPlanMin = 0;
        let opFactMin = 0;
        const monthValues: string[] = [];
        
        months.forEach(month => {
          const mp = calculateMonthPlanHours(operator, month);
          const mf = getOperatorMonthFactTotal(operator.id, month, timesheets, overtimeEntries, compensations);
          const planMin = mp.hours * 60 + mp.minutes;
          const factMin = mf.hours * 60 + mf.minutes;
          opPlanMin += planMin;
          opFactMin += factMin;
          monthValues.push(formatMinutes(planMin));
          monthValues.push(factMin > 0 ? formatMinutes(factMin) : '—');
        });

        groupPlanMin += opPlanMin;
        groupFactMin += opFactMin;

        exportData.push([
          operatorName,
          operator.work_schedules?.name || 'Без графика',
          ...monthValues,
          formatMinutes(opPlanMin),
          opFactMin > 0 ? formatMinutes(opFactMin) : '—'
        ]);
      });

      grandTotalPlanMin += groupPlanMin;
      grandTotalFactMin += groupFactMin;
      
      const emptyMonthCells = months.flatMap(() => ['', '']);
      exportData.push([
        `Итого по группе "${scheduleName}":`,
        '',
        ...emptyMonthCells,
        formatMinutes(groupPlanMin),
        groupFactMin > 0 ? formatMinutes(groupFactMin) : '—'
      ]);
      exportData.push([]);
    });

    const emptyMonthCells = months.flatMap(() => ['', '']);
    exportData.push([]);
    exportData.push([
      'ОБЩИЙ ИТОГ:',
      '',
      ...emptyMonthCells,
      formatMinutes(grandTotalPlanMin),
      grandTotalFactMin > 0 ? formatMinutes(grandTotalFactMin) : '—'
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    for (let i = 0; i < months.length; i++) {
      merges.push({ s: { r: 0, c: 2 + i * 2 }, e: { r: 0, c: 3 + i * 2 } });
    }
    merges.push({ s: { r: 0, c: 2 + months.length * 2 }, e: { r: 0, c: 3 + months.length * 2 } });
    (ws as any)['!merges'] = merges;
    
    ws['!cols'] = [
      { wch: 35 },
      { wch: 25 },
      ...months.flatMap(() => [{ wch: 10 }, { wch: 10 }]),
      { wch: 12 },
      { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'График ротации (год)');
    XLSX.writeFile(wb, `График_ротации_${format(months[0], 'yyyy')}.xlsx`);
    return;
  }
  
  // DAY MODE (original logic)
  // Header rows with Plan/Fact for each day
  const headerRow1 = ['Сотрудник', 'График'];
  const headerRow2 = ['', ''];
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const holidayEx = getHolidayException(dateStr, calendarExceptions);
    const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
    
    let dateHeader = format(day, 'dd.MM.yyyy');
    if (holidayEx) {
      dateHeader += ' 🎉';
    } else if (shortenedEx) {
      dateHeader += ' ⏰';
    }
    
    headerRow1.push(dateHeader);
    headerRow1.push('');
    headerRow2.push('План');
    headerRow2.push('Факт');
  });
  headerRow1.push('Итого');
  headerRow1.push('');
  headerRow2.push('План');
  headerRow2.push('Факт');
  
  exportData.push(headerRow1);
  exportData.push(headerRow2);
  
  let grandTotalMinutes = 0;
  let grandTotalFactMinutes = 0;

  Array.from(groupedBySchedule.entries()).forEach(([scheduleName, ops]) => {
    exportData.push([`--- ${scheduleName} (${ops.length}) ---`]);
    
    let groupTotalMinutes = 0;
    let groupTotalFactMinutes = 0;

    ops.forEach(operator => {
      let operatorTotalMinutes = 0;
      let operatorTotalFactMinutes = 0;
      const dayValues: string[] = [];
      
      const isTerminated = operator.termination_date != null;
      const operatorName = isTerminated 
        ? `${operator.full_name} (уволен ${format(parseDateOnly(operator.termination_date)!, 'dd.MM.yy')})`
        : operator.full_name;
      
      const is52 = is52ScheduleType(operator);
      
      days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const shift = getShiftWithOverride(operator, day, scheduleOverrides, calendarExceptions);
        
        const terminatedOnDate = isOperatorTerminatedOnDate(operator, day, employmentPeriodsMap);
        const beforeHire = isBeforeHireDateOnDate(operator, day, employmentPeriodsMap);
        
        const absence = getAbsenceForDate(operator.id, day, absences);
        const absenceInfo = absence ? ABSENCE_LABELS[absence.absence_type] : null;
        
        const holidayEx = getHolidayException(dateStr, calendarExceptions);
        const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
        const isHolidayForSchedule = is52 && !!holidayEx;
        
        let planMinutes = 0;
        let planText = '—';
        let factText = '—';
        
        if (terminatedOnDate) {
          planText = '🚪';
          factText = '—';
        } else if (beforeHire) {
          planText = '—';
          factText = '—';
        } else if (absence) {
          planText = absenceInfo?.icon || '📝';
          
          const nonCompensableTypes = ['annual_leave', 'unpaid_leave', 'maternity_leave', 'administrative_leave_without_compensation'];
          if (!nonCompensableTypes.includes(absence.absence_type) && shift) {
            planMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
          }
        } else if (isHolidayForSchedule) {
          planText = '🎉';
          planMinutes = 0;
        } else if (shift) {
          let netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
          
          if (shortenedEx) {
            const scheduleReductionHours = operator.work_schedules?.reduction_hours;
            const reductionHours = scheduleReductionHours ?? shortenedEx.reduction_hours ?? 1;
            netMinutes = Math.max(0, netMinutes - (reductionHours * 60));
            planText = formatMinutes(netMinutes) + '⏰';
          } else {
            planText = formatMinutes(netMinutes);
          }
          
          planMinutes = netMinutes;
        }
        
        operatorTotalMinutes += planMinutes;
        
        const factMinutes = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
        operatorTotalFactMinutes += factMinutes;
        factText = factMinutes > 0 ? formatMinutes(factMinutes) : '—';
        
        dayValues.push(planText);
        dayValues.push(factText);
      });

      // Use calculatePlanHours for consistent totals (matches calendar view)
      const opPlan = calculatePlanHours(operator);
      const opPlanMinutes = opPlan.hours * 60 + opPlan.minutes;
      groupTotalMinutes += opPlanMinutes;
      groupTotalFactMinutes += operatorTotalFactMinutes;

      const opPlanFormatted = formatMinutes(opPlanMinutes);

      const row = [
        operatorName,
        operator.work_schedules?.name || 'Без графика',
        ...dayValues,
        opPlanFormatted,
        formatMinutes(operatorTotalFactMinutes)
      ];
      exportData.push(row);
    });

    grandTotalMinutes += groupTotalMinutes;
    grandTotalFactMinutes += groupTotalFactMinutes;
    
    const emptyDayCells = days.flatMap(() => ['', '']);
    exportData.push([
      `Итого по группе "${scheduleName}":`,
      '',
      ...emptyDayCells,
      formatMinutes(groupTotalMinutes),
      formatMinutes(groupTotalFactMinutes)
    ]);
    exportData.push([]);
  });

  const emptyDayCells = days.flatMap(() => ['', '']);
  exportData.push([]);
  exportData.push([
    'ОБЩИЙ ИТОГ:',
    '',
    ...emptyDayCells,
    formatMinutes(grandTotalMinutes),
    formatMinutes(grandTotalFactMinutes)
  ]);
  
  exportData.push([]);
  exportData.push(['ЛЕГЕНДА:']);
  exportData.push(['🏖️ - Отпуск', '🏥 - Больничный', '✈️ - Командировка', '📋 - Административный']);
  exportData.push(['👶 - Декрет', '💰 - Без сохранения ЗП', '🚫 - Прогул', '🚪 - Уволен']);
  exportData.push(['🎉 - Праздничный день', '⏰ - Сокращенный день']);
  
  const ws = XLSX.utils.aoa_to_sheet(exportData);
  
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  for (let i = 0; i < days.length; i++) {
    merges.push({ s: { r: 0, c: 2 + i * 2 }, e: { r: 0, c: 3 + i * 2 } });
  }
  merges.push({ s: { r: 0, c: 2 + days.length * 2 }, e: { r: 0, c: 3 + days.length * 2 } });
  (ws as any)['!merges'] = merges;
  
  ws['!cols'] = [
    { wch: 35 },
    { wch: 25 },
    ...days.flatMap(() => [{ wch: 8 }, { wch: 8 }]),
    { wch: 10 },
    { wch: 10 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'График ротации');
  
  const startDateStr = format(days[0], 'dd.MM.yyyy');
  const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
  XLSX.writeFile(wb, `График_ротации_${startDateStr}-${endDateStr}.xlsx`);
};

export const printCalendar = (data: ExportData) => {
  const { 
    days, months = [], period, operators, groupedBySchedule, timesheets, overtimeEntries, 
    compensations, absences, calendarExceptions = [], scheduleOverrides = [], shiftColorMap, grandTotal, grandTotalFact,
    calculateTotalHours, calculatePlanHours, calculateGroupStats, calculateMonthPlanHours, employmentPeriodsMap 
  } = data;
  
  const startDateStr = format(days[0], 'dd.MM.yyyy');
  const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const groupsHtml = Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
    const groupStats = calculateGroupStats(ops);
    const groupFact = getGroupFactTotal(ops, days, timesheets, overtimeEntries, compensations);
    
    const operatorsHtml = ops.map(operator => {
      const shiftNameToIndex = new Map<string, number>();
      Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
      const opTotal = calculatePlanHours(operator);
      const opFact = getOperatorFactTotal(operator.id, days, timesheets, overtimeEntries, compensations);
      
      // Check if operator is terminated
      const isTerminated = operator.termination_date != null;
      const terminationDate = isTerminated ? parseDateOnly(operator.termination_date) : null;
      const operatorNameHtml = isTerminated 
        ? `${operator.full_name} <span class="terminated-badge">уволен ${format(terminationDate!, 'd.MM')}</span>`
        : operator.full_name;
      
      // Check if 5/2 schedule
      const is52 = is52ScheduleType(operator);
      
      const daysHtml = days.map(day => {
        const shift = getShiftWithOverride(operator, day, scheduleOverrides, calendarExceptions);
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
        const cycleInfo = getCycleDayNumber(operator.work_schedules, day, operator);
        const dateStr = format(day, "yyyy-MM-dd");
        const factMins = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
        const factH = Math.floor(factMins / 60);
        const factM = factMins % 60;
        
        // Check employment status
        const terminatedOnDate = isOperatorTerminatedOnDate(operator, day, employmentPeriodsMap);
        const beforeHire = isBeforeHireDateOnDate(operator, day, employmentPeriodsMap);
        
        // Get absence for this day
        const absence = getAbsenceForDate(operator.id, day, absences);
        const absenceInfo = absence ? ABSENCE_LABELS[absence.absence_type] : null;
        
        // Get holiday/shortened day exceptions
        const holidayEx = getHolidayException(dateStr, calendarExceptions);
        const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
        const isHolidayForSchedule = is52 && !!holidayEx;
        
        if (terminatedOnDate) {
          return `<td class="terminated"><span class="termination-icon">🚪</span></td>`;
        }
        
        if (beforeHire) {
          return `<td class="before-hire">—</td>`;
        }
        
        if (absence) {
          const absenceClass = absence.absence_type === 'sick_leave' ? 'absence-sick' 
            : absence.absence_type === 'annual_leave' ? 'absence-vacation'
            : absence.absence_type === 'business_trip' ? 'absence-trip'
            : absence.absence_type === 'unauthorized_absence' ? 'absence-unauthorized'
            : 'absence-other';
          
          return `
            <td class="${absenceClass}" title="${absenceInfo?.label || ''}">
              <span class="absence-icon">${absenceInfo?.icon || '📝'}</span>
              ${factMins > 0 ? `<br/><span class="fact">${factH}ч${factM > 0 ? factM + 'м' : ''}</span>` : ''}
            </td>
          `;
        }
        
        if (isHolidayForSchedule) {
          return `
            <td class="holiday" title="${holidayEx?.name || 'Праздничный день'}">
              <span class="holiday-icon">🎉</span>
              ${factMins > 0 ? `<br/><span class="fact">${factH}ч${factM > 0 ? factM + 'м' : ''}</span>` : ''}
            </td>
          `;
        }
        
        // Calculate actual hours with shortened day reduction
        let netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
        if (shortenedEx && shift) {
          const scheduleReductionHours = operator.work_schedules?.reduction_hours;
          const reductionHours = scheduleReductionHours ?? shortenedEx.reduction_hours ?? 1;
          netMinutes = Math.max(0, netMinutes - (reductionHours * 60));
        }
        const hours = Math.floor(netMinutes / 60);
        const mins = netMinutes % 60;
        
        const shortenedIndicator = shortenedEx && shift ? '<span class="shortened-icon">⏰</span>' : '';
        
        return `
          <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'} ${shortenedEx ? 'shortened' : ''}">
            <span class="plan">${shift ? `${hours}ч${mins > 0 ? mins + 'м' : ''}` : '—'}</span>${shortenedIndicator}
            <span class="${factMins > 0 ? 'fact' : 'fact-zero'}"> / ${factMins > 0 ? factH + 'ч' + (factM > 0 ? factM + 'м' : '') : '—'}</span>
            ${cycleInfo ? '<br/><span class="cycle-day">Д' + cycleInfo.dayInCycle + '</span>' : ''}
          </td>
        `;
      }).join('');
      
      return `
        <tr>
          <td class="${isTerminated ? 'operator-terminated' : ''}">${operatorNameHtml}</td>
          ${daysHtml}
          <td class="total-cell">
            <span class="total-plan">${opTotal.hours}ч${opTotal.minutes > 0 ? opTotal.minutes + 'м' : ''}</span>
            <br/>
            <span class="total-fact">${opFact.hours}ч${opFact.minutes > 0 ? opFact.minutes + 'м' : ''}</span>
          </td>
        </tr>
      `;
    }).join('');
    
    return `
      <tr class="group-header">
        <td colspan="${days.length + 2}">${scheduleName} (${ops.length} чел.)</td>
      </tr>
      ${operatorsHtml}
      <tr class="group-stats">
        <td style="text-align: left; font-weight: 500;">
          Итого: ✓${groupStats.workingDays} раб. | ✗${groupStats.offDays} вых.
        </td>
        <td colspan="${days.length}"></td>
        <td class="total-cell">
          <span class="total-plan">${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? groupStats.totalMinutes + 'м' : ''}</span>
          <br/>
          <span class="total-fact">${groupFact.hours}ч${groupFact.minutes > 0 ? groupFact.minutes + 'м' : ''}</span>
        </td>
      </tr>
    `;
  }).join('');

  const daysHeaderHtml = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const holidayEx = getHolidayException(dateStr, calendarExceptions);
    const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
    
    let headerClass = isToday(day) ? 'today' : '';
    if (holidayEx) headerClass += ' holiday-header';
    else if (isWeekend) headerClass += ' weekend';
    
    const holidayIcon = holidayEx ? '<br/><span class="holiday-badge">🎉</span>' : '';
    const shortenedIcon = shortenedEx ? '<br/><span class="shortened-badge">⏰</span>' : '';
    
    return `
      <th class="${headerClass}" title="${holidayEx?.name || ''}">
        ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd MMM', { locale: ru })}${holidayIcon}${shortenedIcon}
      </th>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>График ротации смен ${startDateStr} - ${endDateStr}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 10px; font-size: 7px; }
        h1 { font-size: 14px; margin-bottom: 6px; }
        h2 { font-size: 10px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 7px; }
        th, td { border: 1px solid #ddd; padding: 2px 3px; text-align: center; white-space: nowrap; }
        th { background: #f5f5f5; font-weight: 600; font-size: 7px; }
        td:first-child { text-align: left; font-weight: 500; white-space: normal; max-width: 120px; }
        .group-header { background: #eee; font-weight: 600; text-align: left; }
        .day-off { color: #999; }
        .shift-1 { background: #dbeafe; }
        .shift-2 { background: #fef3c7; }
        .shift-3 { background: #d1fae5; }
        .shift-4 { background: #ede9fe; }
        .today { background: #fef08a !important; font-weight: bold; }
        .weekend { background: #fee2e2; }
        .cycle-day { font-size: 6px; color: #888; }
        .group-stats { background: #f8fafc; font-style: italic; }
        .plan { color: #1d4ed8; font-size: 7px; }
        .fact { color: #16a34a; font-size: 7px; }
        .fact-zero { color: #9ca3af; }
        .total-cell { font-weight: 600; white-space: nowrap; }
        .total-plan { color: #1d4ed8; font-size: 7px; }
        .total-fact { color: #16a34a; font-size: 7px; }
        
        /* Absence styles */
        .absence-vacation { background: #dbeafe; }
        .absence-sick { background: #fecaca; }
        .absence-trip { background: #e9d5ff; }
        .absence-unauthorized { background: #fda4af; }
        .absence-other { background: #fef3c7; }
        .absence-icon { font-size: 10px; }
        
        /* Holiday & shortened day styles */
        .holiday { background: #fef3c7; }
        .holiday-icon { font-size: 10px; }
        .holiday-header { background: #fef3c7 !important; }
        .holiday-badge { font-size: 8px; }
        .shortened { border: 1px dashed #f59e0b; }
        .shortened-icon { font-size: 6px; color: #d97706; }
        .shortened-badge { font-size: 8px; }
        
        /* Termination styles */
        .terminated { background: #e5e7eb; color: #6b7280; }
        .termination-icon { font-size: 10px; }
        .before-hire { background: #f3f4f6; color: #9ca3af; }
        .operator-terminated { color: #6b7280; }
        .terminated-badge { 
          font-size: 6px; 
          background: #ef4444; 
          color: white; 
          padding: 1px 3px; 
          border-radius: 2px; 
          margin-left: 3px;
        }
        
        .legend { margin-top: 10px; font-size: 8px; border-top: 1px solid #ddd; padding-top: 8px; }
        .legend-item { display: inline-block; margin-right: 12px; }
        
        @media print { @page { size: landscape; margin: 10mm; } }
      </style>
    </head>
    <body>
      <h1>📅 График ротации смен</h1>
      <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${operators.length} | План: ${grandTotal.hours}ч${grandTotal.minutes > 0 ? ' ' + grandTotal.minutes + 'м' : ''} | Факт: ${grandTotalFact.hours}ч${grandTotalFact.minutes > 0 ? ' ' + grandTotalFact.minutes + 'м' : ''}</h2>
      
      <table>
        <thead>
          <tr>
            <th>Сотрудник</th>
            ${daysHeaderHtml}
            <th>Итого<br/><span class="plan">План</span> / <span class="fact">Факт</span></th>
          </tr>
        </thead>
        <tbody>
          ${groupsHtml}
        </tbody>
      </table>
      
      <div class="legend">
        <strong>Легенда:</strong>
        <span class="legend-item">🏖️ Отпуск</span>
        <span class="legend-item">🏥 Больничный</span>
        <span class="legend-item">✈️ Командировка</span>
        <span class="legend-item">📋 Административный</span>
        <span class="legend-item">👶 Декрет</span>
        <span class="legend-item">💰 Без ЗП</span>
        <span class="legend-item">🚫 Прогул</span>
        <span class="legend-item">🚪 Уволен</span>
        <span class="legend-item">🎉 Праздник</span>
        <span class="legend-item">⏰ Сокр. день</span>
      </div>
      
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

export const exportToPdf = (data: ExportData) => {
  const { 
    days, months = [], period, operators, groupedBySchedule, timesheets, overtimeEntries, 
    compensations, absences, calendarExceptions = [], scheduleOverrides = [], shiftColorMap, grandTotal, grandTotalFact,
    calculateTotalHours, calculatePlanHours, calculateGroupStats, calculateMonthPlanHours, employmentPeriodsMap 
  } = data;
  
  const startDateStr = format(days[0], 'dd.MM.yyyy');
  const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
  
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) return;

  const groupsHtml = Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
    const groupStats = calculateGroupStats(ops);
    const groupFact = getGroupFactTotal(ops, days, timesheets, overtimeEntries, compensations);
    const schedule = ops[0]?.work_schedules;
    const isCyclic = schedule?.schedule_type === 'cyclic';
    
    const daysHeaderHtml = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const holidayEx = getHolidayException(dateStr, calendarExceptions);
      const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
      
      let headerClass = isToday(day) ? 'today' : '';
      if (holidayEx) headerClass += ' holiday-header';
      else if (isWeekend) headerClass += ' weekend';
      
      const holidayIcon = holidayEx ? ' 🎉' : '';
      const shortenedIcon = shortenedEx ? ' ⏰' : '';
      
      return `
        <th class="${headerClass}" title="${holidayEx?.name || ''}">
          ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd')}${holidayIcon}${shortenedIcon}
        </th>
      `;
    }).join('');
    
    const operatorsHtml = ops.map(operator => {
      const shiftNameToIndex = new Map<string, number>();
      Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
      const opTotal = calculatePlanHours(operator);
      const opFact = getOperatorFactTotal(operator.id, days, timesheets, overtimeEntries, compensations);
      
      // Check if operator is terminated
      const isTerminated = operator.termination_date != null;
      const terminationDate = isTerminated ? parseDateOnly(operator.termination_date) : null;
      const operatorNameHtml = isTerminated 
        ? `${operator.full_name} <span class="terminated-badge">уволен</span>`
        : operator.full_name + (operator.shift_rotation_enabled ? ' 🔄' : '');
      
      // Check if 5/2 schedule
      const is52 = is52ScheduleType(operator);
      
      const daysHtml = days.map(day => {
        const shift = getShiftForDate(operator, day);
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
        const dateStr = format(day, "yyyy-MM-dd");
        const factMins = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
        const factH = Math.floor(factMins / 60);
        const factM = factMins % 60;
        
        // Check employment status
        const terminatedOnDate = isOperatorTerminatedOnDate(operator, day, employmentPeriodsMap);
        const beforeHire = isBeforeHireDateOnDate(operator, day, employmentPeriodsMap);
        
        // Get absence for this day
        const absence = getAbsenceForDate(operator.id, day, absences);
        const absenceInfo = absence ? ABSENCE_LABELS[absence.absence_type] : null;
        
        // Get holiday/shortened day exceptions
        const holidayEx = getHolidayException(dateStr, calendarExceptions);
        const shortenedEx = getShortenedDayException(dateStr, calendarExceptions);
        const isHolidayForSchedule = is52 && !!holidayEx;
        
        if (terminatedOnDate) {
          return `<td class="terminated"><span class="termination-icon">🚪</span></td>`;
        }
        
        if (beforeHire) {
          return `<td class="before-hire">—</td>`;
        }
        
        if (absence) {
          const absenceClass = absence.absence_type === 'sick_leave' ? 'absence-sick' 
            : absence.absence_type === 'annual_leave' ? 'absence-vacation'
            : absence.absence_type === 'business_trip' ? 'absence-trip'
            : absence.absence_type === 'unauthorized_absence' ? 'absence-unauthorized'
            : 'absence-other';
          
          return `
            <td class="${absenceClass}" title="${absenceInfo?.label || ''}">
              <div class="cell-content">
                <span class="absence-icon">${absenceInfo?.icon || '📝'}</span>
                ${factMins > 0 ? `<br/><span class="fact">${factH}ч${factM > 0 ? factM + 'м' : ''}</span>` : ''}
              </div>
            </td>
          `;
        }
        
        if (isHolidayForSchedule) {
          return `
            <td class="holiday" title="${holidayEx?.name || 'Праздничный день'}">
              <div class="cell-content">
                <span class="holiday-icon">🎉</span>
                ${factMins > 0 ? `<br/><span class="fact">${factH}ч${factM > 0 ? factM + 'м' : ''}</span>` : ''}
              </div>
            </td>
          `;
        }
        
        // Calculate actual hours with shortened day reduction
        let netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
        if (shortenedEx && shift) {
          const scheduleReductionHours = operator.work_schedules?.reduction_hours;
          const reductionHours = scheduleReductionHours ?? shortenedEx.reduction_hours ?? 1;
          netMinutes = Math.max(0, netMinutes - (reductionHours * 60));
        }
        const hours = Math.floor(netMinutes / 60);
        const mins = netMinutes % 60;
        
        const shortenedIndicator = shortenedEx && shift ? '<span class="shortened-icon">⏰</span>' : '';
        
        return `
          <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'} ${shortenedEx ? 'shortened' : ''}">
            <div class="cell-content">
              <span class="plan">${shift ? hours + 'ч' + (mins > 0 ? mins + 'м' : '') : '—'}</span>${shortenedIndicator}
              <br/>
              <span class="${factMins > 0 ? 'fact' : 'fact-zero'}">${factMins > 0 ? factH + 'ч' + (factM > 0 ? factM + 'м' : '') : '—'}</span>
            </div>
          </td>
        `;
      }).join('');
      
      return `
        <tr>
          <td class="${isTerminated ? 'operator-terminated' : ''}">${operatorNameHtml}</td>
          ${daysHtml}
          <td class="total-col">
            <span class="plan">${opTotal.hours}ч${opTotal.minutes > 0 ? opTotal.minutes + 'м' : ''}</span>
            <br/>
            <span class="fact">${opFact.hours}ч${opFact.minutes > 0 ? opFact.minutes + 'м' : ''}</span>
          </td>
        </tr>
      `;
    }).join('');
    
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
            ${daysHeaderHtml}
            <th>План<br/>Факт</th>
          </tr>
        </thead>
        <tbody>
          ${operatorsHtml}
          <tr style="background: #f9fafb; font-weight: 500;">
            <td style="text-align: left;"><strong>Итого:</strong></td>
            <td colspan="${days.length}">✅ Рабочих: ${groupStats.workingDays} | ⛔ Выходных: ${groupStats.offDays}</td>
            <td class="total-col">
              <span class="plan">${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? groupStats.totalMinutes + 'м' : ''}</span>
              <br/>
              <span class="fact">${groupFact.hours}ч${groupFact.minutes > 0 ? groupFact.minutes + 'м' : ''}</span>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }).join('');

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
        .plan { color: #1d4ed8; }
        .fact { color: #16a34a; }
        .fact-zero { color: #9ca3af; }
        .cell-content { font-size: 8px; }
        
        /* Absence styles */
        .absence-vacation { background: #dbeafe; }
        .absence-sick { background: #fecaca; }
        .absence-trip { background: #e9d5ff; }
        .absence-unauthorized { background: #fda4af; }
        .absence-other { background: #fef3c7; }
        .absence-icon { font-size: 12px; }
        
        /* Holiday & shortened day styles */
        .holiday { background: #fef3c7; }
        .holiday-icon { font-size: 12px; }
        .holiday-header { background: #fef3c7 !important; }
        .shortened { border: 1px dashed #f59e0b; }
        .shortened-icon { font-size: 7px; color: #d97706; }
        
        /* Termination styles */
        .terminated { background: #e5e7eb; color: #6b7280; }
        .termination-icon { font-size: 12px; }
        .before-hire { background: #f3f4f6; color: #9ca3af; }
        .operator-terminated { color: #6b7280; }
        .terminated-badge { 
          font-size: 7px; 
          background: #ef4444; 
          color: white; 
          padding: 1px 4px; 
          border-radius: 2px; 
          margin-left: 4px;
        }
        
        .legend { 
          margin-top: 15px; 
          padding: 10px; 
          background: #f9fafb; 
          border: 1px solid #e5e7eb; 
          border-radius: 4px;
          font-size: 9px;
        }
        .legend-title { font-weight: 600; margin-bottom: 5px; }
        .legend-item { display: inline-block; margin-right: 15px; }
        
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>📅 График ротации смен</h1>
      <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${operators.length}</h2>
      
      ${groupsHtml}
      
      <div class="summary">
        <strong>ОБЩИЙ ИТОГ:</strong> ${operators.length} операторов | 
        <span class="plan">План: ${grandTotal.hours}ч${grandTotal.minutes > 0 ? ' ' + grandTotal.minutes + 'м' : ''}</span> | 
        <span class="fact">Факт: ${grandTotalFact.hours}ч${grandTotalFact.minutes > 0 ? ' ' + grandTotalFact.minutes + 'м' : ''}</span>
      </div>
      
      <div class="legend">
        <div class="legend-title">Условные обозначения:</div>
        <span class="legend-item">🏖️ Отпуск</span>
        <span class="legend-item">🏥 Больничный</span>
        <span class="legend-item">✈️ Командировка</span>
        <span class="legend-item">📋 Административный</span>
        <span class="legend-item">👶 Декрет</span>
        <span class="legend-item">💰 Без сохранения ЗП</span>
        <span class="legend-item">🚫 Прогул</span>
        <span class="legend-item">🚪 Уволен</span>
        <span class="legend-item">🎉 Праздник</span>
        <span class="legend-item">⏰ Сокр. день</span>
      </div>
      
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  pdfWindow.document.close();
};
