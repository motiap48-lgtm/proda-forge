import { useMemo } from "react";
import { addDays, getDaysInMonth, differenceInDays, startOfMonth, format } from "date-fns";
import { getShiftForDate, getShiftColor, isWorkingDay, type PeriodType, type ShiftColors } from "../utils";
import { isDateInAbsence, isOperatorTerminated, isBeforeHireDate, type OperatorAbsence, isAbsenceReducingPlan } from "@/hooks/useOperatorAbsences";
import { type ScheduleOverride } from "@/hooks/useScheduleOverrides";
import { useIsMobile } from "@/hooks/use-mobile";
import { type EmploymentPeriodsMap } from "@/hooks/useEmploymentHistory";
export interface CalendarException {
  id: string;
  exception_date: string;
  exception_type: string;
  name: string;
  description?: string | null;
  is_working_day: boolean;
  reduced_hours?: number | null;
  reduction_hours?: number | null; // New: hours to reduce from schedule
}

interface CalendarCalculationsProps {
  operators: any[];
  period: PeriodType;
  startDate: Date;
  endDate?: Date;
  absences?: OperatorAbsence[];
  scheduleOverrides?: ScheduleOverride[];
  calendarExceptions?: CalendarException[];
  employmentPeriodsMap?: EmploymentPeriodsMap;
}

export const useCalendarCalculations = ({
  operators,
  period,
  startDate,
  endDate,
  absences = [],
  scheduleOverrides = [],
  calendarExceptions = [],
  employmentPeriodsMap,
}: CalendarCalculationsProps) => {
  const isMobile = useIsMobile();

  // Calculate days count based on period type
  const daysCount = useMemo(() => {
    if (period === "month") {
      return getDaysInMonth(startDate);
    }
    if (period === "year") {
      return 365;
    }
    if (period === "custom" && endDate) {
      return Math.max(1, differenceInDays(endDate, startDate) + 1);
    }
    return parseInt(period) || 7;
  }, [period, startDate, endDate]);

  // Generate days based on selected period and start date
  const days = useMemo(() => {
    const result: Date[] = [];
    let effectiveStartDate = startDate;
    let count = daysCount;
    
    if (period === "month") {
      effectiveStartDate = startOfMonth(startDate);
    }
    
    if (period === "year") {
      effectiveStartDate = new Date(startDate.getFullYear(), 0, 1);
      count = 365 + (new Date(startDate.getFullYear(), 1, 29).getDate() === 29 ? 1 : 0);
    }
    
    for (let i = 0; i < count; i++) {
      result.push(addDays(effectiveStartDate, i));
    }
    return result;
  }, [daysCount, startDate, period]);

  // Generate months for year view
  const months = useMemo(() => {
    if (period !== "year") return [];
    const year = startDate.getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [period, startDate]);

  // Create a map of calendar exceptions by date for fast lookup
  const exceptionsMap = useMemo(() => {
    const map = new Map<string, CalendarException>();
    calendarExceptions.forEach(exc => {
      map.set(exc.exception_date, exc);
    });
    return map;
  }, [calendarExceptions]);

  // Get calendar exception for a specific date
  const getExceptionForDate = (date: Date): CalendarException | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return exceptionsMap.get(dateStr);
  };

  // Get all unique shift names for color mapping
  // IMPORTANT: Sort shift names to ensure consistent colors across filters/views
  const shiftColorMap = useMemo(() => {
    const shiftNames = new Set<string>();
    operators.forEach(op => {
      const shifts = op.work_schedules?.work_schedule_shifts;
      shifts?.forEach((s: any) => shiftNames.add(s.shift_name));
    });
    const map = new Map<string, ShiftColors>();
    // Sort alphabetically to ensure consistent color assignment
    Array.from(shiftNames).sort().forEach((name, index) => {
      map.set(name, getShiftColor(name, index));
    });
    return map;
  }, [operators]);

  // Fixed column widths for calendar cells - responsive for mobile
  const columnWidth = useMemo(() => {
    if (isMobile) {
      // Mobile: much smaller columns
      if (period === "year") return 40;
      return 36; // Fixed small width for mobile
    }
    // Desktop
    if (period === "year") return 70;
    if (daysCount <= 7) return 90;
    if (daysCount <= 14) return 75;
    if (daysCount <= 31) return 65;
    return 55;
  }, [period, daysCount, isMobile]);

  // Total column width - responsive
  const totalColumnWidth = useMemo(() => {
    return isMobile ? 40 : 70;
  }, [isMobile]);

  // Calendar grid style - responsive
  const calendarGridStyle = useMemo<React.CSSProperties>(() => {
    const colCount = period === "year" ? 12 : daysCount;
    const minColWidth = columnWidth;
    const gapPx = isMobile ? 2 : 4;
    const totalColPx = totalColumnWidth;
    // Padding: pl-2 = 8px, pr-0.5 = 2px = 10px total (reduce for mobile)
    const paddingPx = isMobile ? 6 : 10;

    // Total min-width = (columns * width) + total column + (gaps between all columns) + padding
    const totalMinWidth = colCount * minColWidth + totalColPx + (colCount) * gapPx + paddingPx;

    return {
      display: "grid",
      gridTemplateColumns: `repeat(${colCount}, minmax(${minColWidth}px, 1fr)) ${totalColPx}px`,
      columnGap: `${gapPx}px`,
      rowGap: `${gapPx}px`,
      width: "100%",
      minWidth: `${totalMinWidth}px`,
    };
  }, [period, daysCount, columnWidth, totalColumnWidth, isMobile]);

  // Check if operator is available on a specific date (not on leave, not terminated, hired)
  const isOperatorAvailable = (operator: any, date: Date): boolean => {
    // Check if outside employment periods
    if (isOperatorTerminated(operator, date, employmentPeriodsMap)) return false;
    
    // Check if before hire date (only used when no employment periods map)
    if (isBeforeHireDate(operator, date, employmentPeriodsMap)) return false;
    
    // Check if on leave
    const absence = isDateInAbsence(date, absences, operator.id);
    if (absence) return false;
    
    return true;
  };

  // Helper to get schedule override for a specific operator and date
  const getOverrideForDate = (operatorId: string, date: Date): ScheduleOverride | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return scheduleOverrides.find(
      (o) => o.operator_id === operatorId && o.override_date === dateStr
    );
  };

  // Helper to check if schedule is cyclic (2/2, 3/3, etc.) - holidays don't apply to cyclic schedules
  const isCyclicSchedule = (operator: any): boolean => {
    const schedule = operator.work_schedules;
    return schedule?.schedule_type === 'cyclic';
  };

  // Get shift for date considering overrides
  const getShiftForDateWithOverride = (operator: any, date: Date) => {
    const override = getOverrideForDate(operator.id, date);
    
    if (override) {
      // If override says it's not a working day, return null
      if (!override.is_working_day) {
        return null;
      }
      // If override says it's a working day, get the shift (based on override shift_number or default)
      const schedule = operator.work_schedules;
      const shifts = schedule?.work_schedule_shifts;
      if (!shifts || shifts.length === 0) return null;
      
      if (override.shift_number) {
        return shifts.find((s: any) => s.shift_number === override.shift_number) || shifts[0];
      }
      // Return default shift for the day
      return getShiftForDate(operator, date) || shifts[0];
    }
    
   // Check for calendar exception that makes a non-working day into a working day
   // This handles ONLY "extra_working_day" - shortened days on weekends should be ignored for 5/2 schedules
   const isCyclic = isCyclicSchedule(operator);
   if (!isCyclic) {
     const exception = getExceptionForDate(date);
     if (exception && exception.is_working_day && exception.exception_type === 'extra_working_day') {
       // Only extra_working_day should turn a weekend into a working day
       // Shortened days on weekends should be ignored for 5/2 schedules
       // Check if normally this would be a non-working day
       const normallyWorkingDay = isWorkingDay(operator.work_schedules, date, operator);
       if (!normallyWorkingDay) {
         // This is a transferred working day (e.g., Saturday before a holiday)
         // Return the first shift as default for this extra working day
         const schedule = operator.work_schedules;
         const shifts = schedule?.work_schedule_shifts;
         if (shifts && shifts.length > 0) {
           // Use assigned shift or first available
           if (operator.assigned_shift_number) {
             return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number) || shifts[0];
           }
           return shifts[0];
         }
       }
     }
   }
   
    // No override, use normal logic
    return getShiftForDate(operator, date);
  };

  // Calculate working minutes for a specific day, considering calendar exceptions
  const calculateDayMinutes = (operator: any, day: Date): { minutes: number; isShortenedDay: boolean; reductionMinutes: number } => {
    // Skip if operator is not available
    if (!isOperatorAvailable(operator, day)) {
      return { minutes: 0, isShortenedDay: false, reductionMinutes: 0 };
    }
    
    const exception = getExceptionForDate(day);
    const isCyclic = isCyclicSchedule(operator);
    
    // Check if it's a holiday (non-working day)
    // IMPORTANT: Cyclic schedules (2/2, etc.) ignore holidays - they work on holidays
    if (exception && !exception.is_working_day && !isCyclic) {
      return { minutes: 0, isShortenedDay: false, reductionMinutes: 0 };
    }
    
    const shift = getShiftForDateWithOverride(operator, day);
    if (!shift) {
      return { minutes: 0, isShortenedDay: false, reductionMinutes: 0 };
    }
    
    const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
    
     // If it's a shortened day - apply reduction for ALL schedules including cyclic
     // Cyclic schedules work through holidays but shortened days still apply when working
     if (exception && exception.exception_type === "shortened_day") {
      // ALWAYS use schedule-specific reduction_hours for relative reduction
      // The reduced_hours field in calendar_exceptions is for display/reference only (e.g., for 8-hour schedules)
      // Each schedule has its own reduction_hours that should be applied
      const scheduleReductionHours = operator.work_schedules?.reduction_hours;
      const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
      const reductionMinutes = reductionHours * 60;
      const actualMinutes = Math.max(0, normalNetMinutes - reductionMinutes);
      return { 
        minutes: actualMinutes, 
        isShortenedDay: true, 
        reductionMinutes 
      };
    }
    
    return { minutes: normalNetMinutes, isShortenedDay: false, reductionMinutes: 0 };
  };

  // Simple version that returns just minutes (for backward compatibility)
  const getDayMinutes = (operator: any, day: Date): number => {
    return calculateDayMinutes(operator, day).minutes;
  };
  
  // Get planned minutes for a day WITHOUT checking absences
  // Used for calculating how much would have been worked on absence days
  const getPlannedDayMinutes = (operator: any, day: Date): number => {
    // Skip if terminated or not hired
    if (isOperatorTerminated(operator, day, employmentPeriodsMap)) return 0;
    if (isBeforeHireDate(operator, day, employmentPeriodsMap)) return 0;
    
    const exception = getExceptionForDate(day);
    const isCyclic = isCyclicSchedule(operator);
    
    // Check if it's a holiday (non-working day) - cyclic schedules ignore holidays
    if (exception && !exception.is_working_day && !isCyclic) return 0;
    
    const shift = getShiftForDateWithOverride(operator, day);
    if (!shift) return 0;
    
    const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
    
     // If it's a shortened day - apply reduction for ALL schedules including cyclic
     if (exception && exception.exception_type === "shortened_day") {
      const scheduleReductionHours = operator.work_schedules?.reduction_hours;
      const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
      const reductionMinutes = reductionHours * 60;
      return Math.max(0, normalNetMinutes - reductionMinutes);
    }
    
    return normalNetMinutes;
  };

  // Calculate hours for a specific month (with absence, override, and exception consideration)
  const calculateMonthHours = (operator: any, month: Date): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const monthStart = startOfMonth(month);
    const daysInMonth = getDaysInMonth(month);
    
    for (let i = 0; i < daysInMonth; i++) {
      const day = addDays(monthStart, i);
      totalMinutes += getDayMinutes(operator, day);
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate PLAN hours for a specific month (only plan-reducing absences subtracted)
  const calculateMonthPlanHours = (operator: any, month: Date): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const schedule = operator.work_schedules;
    const isCyclic = isCyclicSchedule(operator);
    const monthStart = startOfMonth(month);
    const monthDaysCount = getDaysInMonth(month);
    
    for (let i = 0; i < monthDaysCount; i++) {
      const day = addDays(monthStart, i);
      
      if (isOperatorTerminated(operator, day, employmentPeriodsMap)) continue;
      if (isBeforeHireDate(operator, day, employmentPeriodsMap)) continue;
      
      const exception = getExceptionForDate(day);
      if (exception && !exception.is_working_day && !isCyclic) continue;
      
      const absence = isDateInAbsence(day, absences, operator.id);
      if (absence && isAbsenceReducingPlan(absence.absence_type)) continue;
      
      const shift = getShiftForDateWithOverride(operator, day);
      if (!shift) continue;
      
      const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      
      if (exception && exception.exception_type === "shortened_day") {
        const scheduleReductionHours = schedule?.reduction_hours;
        const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
        const reductionMinutes = reductionHours * 60;
        totalMinutes += Math.max(0, normalNetMinutes - reductionMinutes);
      } else {
        totalMinutes += normalNetMinutes;
      }
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate total working hours for an operator over the period (subtracts absences)
  const calculateTotalHours = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      totalMinutes += getDayMinutes(operator, day);
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate PLAN hours = Full schedule MINUS only annual_leave (non-compensable absences)
  // Compensable absences (like unauthorized_absence, administrative_leave_with_compensation) 
  // do NOT reduce the plan - they must be worked off
  const calculatePlanHours = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const schedule = operator.work_schedules;
    const isCyclic = isCyclicSchedule(operator);
    
    days.forEach(day => {
      // Skip if terminated or not hired
      if (isOperatorTerminated(operator, day, employmentPeriodsMap)) return;
      if (isBeforeHireDate(operator, day, employmentPeriodsMap)) return;
      
      // Check for holiday (non-working calendar exception) - cyclic schedules ignore holidays
      const exception = getExceptionForDate(day);
      if (exception && !exception.is_working_day && !isCyclic) return;
      
      // Check if operator has an absence that reduces plan
      // Only annual_leave, maternity_leave, unpaid_leave, administrative_leave_without_compensation reduce plan
      // Sick leave, business trips, and compensable absences do NOT reduce plan
      const absence = isDateInAbsence(day, absences, operator.id);
      if (absence && isAbsenceReducingPlan(absence.absence_type)) {
        // This absence type reduces plan (e.g., vacation) - skip this day
        return;
      }
      // Other absences (sick leave, business trips, compensable) keep the plan intact
      
      // Get shift for this day (considering overrides)
      const shift = getShiftForDateWithOverride(operator, day);
      if (!shift) return;
      
      const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      
       // Apply shortened day reduction if applicable for ALL schedules including cyclic
       if (exception && exception.exception_type === "shortened_day") {
        const scheduleReductionHours = schedule?.reduction_hours;
        const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
        const reductionMinutes = reductionHours * 60;
        totalMinutes += Math.max(0, normalNetMinutes - reductionMinutes);
      } else {
        totalMinutes += normalNetMinutes;
      }
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate FULL plan hours (without subtracting absences) - what should be worked according to schedule
  const calculateFullPlanHours = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const schedule = operator.work_schedules;
    const isCyclic = isCyclicSchedule(operator);
    
    days.forEach(day => {
      // Skip if terminated or not hired
      if (isOperatorTerminated(operator, day, employmentPeriodsMap)) return;
      if (isBeforeHireDate(operator, day, employmentPeriodsMap)) return;
      
      // Check for holiday (non-working calendar exception) - cyclic schedules ignore holidays
      const exception = getExceptionForDate(day);
      if (exception && !exception.is_working_day && !isCyclic) return;
      
      // Get shift for this day (considering overrides)
      const shift = getShiftForDateWithOverride(operator, day);
      if (!shift) return;
      
      const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      
       // Apply shortened day reduction if applicable for ALL schedules including cyclic
       if (exception && exception.exception_type === "shortened_day") {
        const scheduleReductionHours = schedule?.reduction_hours;
        const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
        const reductionMinutes = reductionHours * 60;
        totalMinutes += Math.max(0, normalNetMinutes - reductionMinutes);
      } else {
        totalMinutes += normalNetMinutes;
      }
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group total hours (working hours minus ALL absences)
  const calculateGroupTotalHours = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      days.forEach(day => {
        totalMinutes += getDayMinutes(operator, day);
      });
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group PLAN hours (only plan-reducing absences subtracted)
  const calculateGroupPlanHours = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      const planHours = calculatePlanHours(operator);
      totalMinutes += planHours.hours * 60 + planHours.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group statistics
  const calculateGroupStats = (ops: any[]): { workingDays: number; offDays: number; absenceDays: number; totalHours: number; totalMinutes: number } => {
    let totalWorkingDays = 0;
    let totalOffDays = 0;
    let totalAbsenceDays = 0;
    let totalMinutes = 0;
    
    ops.forEach(operator => {
      const isCyclic = isCyclicSchedule(operator);
      
      days.forEach(day => {
        // Skip days outside employment period - they should not be counted in stats at all
        if (isOperatorTerminated(operator, day, employmentPeriodsMap) || isBeforeHireDate(operator, day, employmentPeriodsMap)) {
          return; // Don't count as working or off days
        }
        
        // Check if operator is on leave
        const absence = isDateInAbsence(day, absences, operator.id);
        if (absence) {
          totalAbsenceDays++;
          return;
        }
        
        // Check for calendar exception (holiday) - cyclic schedules ignore holidays
        const exception = getExceptionForDate(day);
        if (exception && !exception.is_working_day && !isCyclic) {
          totalOffDays++;
          return;
        }
        
        const shift = getShiftForDateWithOverride(operator, day);
        if (shift) {
          totalWorkingDays++;
          totalMinutes += getDayMinutes(operator, day);
        } else {
          totalOffDays++;
        }
      });
    });
    
    return {
      workingDays: totalWorkingDays,
      offDays: totalOffDays,
      absenceDays: totalAbsenceDays,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60
    };
  };

  // Calculate yearly total for an operator
  const calculateYearlyTotal = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    months.forEach(month => {
      const monthHours = calculateMonthHours(operator, month);
      totalMinutes += monthHours.hours * 60 + monthHours.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group yearly total (working hours minus ALL absences)
  const calculateGroupYearlyTotal = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      const yearlyTotal = calculateYearlyTotal(operator);
      totalMinutes += yearlyTotal.hours * 60 + yearlyTotal.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group yearly PLAN total (only plan-reducing absences subtracted)
  const calculateGroupYearlyPlanTotal = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      // Use calculatePlanHours which already handles all days in the period
      // For year view, we still use calculatePlanHours since it iterates over all `days`
      const planHours = calculatePlanHours(operator);
      totalMinutes += planHours.hours * 60 + planHours.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  return {
    daysCount,
    days,
    months,
    shiftColorMap,
    columnWidth,
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
    isOperatorAvailable,
    getExceptionForDate,
    calculateDayMinutes,
    getDayMinutes,
    getPlannedDayMinutes,
    getShiftForDateWithOverride,
  };
};
