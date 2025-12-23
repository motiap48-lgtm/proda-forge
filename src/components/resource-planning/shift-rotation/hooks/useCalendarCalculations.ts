import { useMemo } from "react";
import { addDays, getDaysInMonth, differenceInDays, startOfMonth, format } from "date-fns";
import { getShiftForDate, getShiftColor, type PeriodType, type ShiftColors } from "../utils";
import { isDateInAbsence, isOperatorTerminated, isBeforeHireDate, type OperatorAbsence } from "@/hooks/useOperatorAbsences";
import { type ScheduleOverride } from "@/hooks/useScheduleOverrides";

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
}

export const useCalendarCalculations = ({
  operators,
  period,
  startDate,
  endDate,
  absences = [],
  scheduleOverrides = [],
  calendarExceptions = [],
}: CalendarCalculationsProps) => {
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
  const shiftColorMap = useMemo(() => {
    const shiftNames = new Set<string>();
    operators.forEach(op => {
      const shifts = op.work_schedules?.work_schedule_shifts;
      shifts?.forEach((s: any) => shiftNames.add(s.shift_name));
    });
    const map = new Map<string, ShiftColors>();
    Array.from(shiftNames).forEach((name, index) => {
      map.set(name, getShiftColor(name, index));
    });
    return map;
  }, [operators]);

  // Fixed column widths for calendar cells
  const columnWidth = useMemo(() => {
    if (period === "year") return 70;
    if (daysCount <= 7) return 90;
    if (daysCount <= 14) return 75;
    if (daysCount <= 31) return 65;
    return 55;
  }, [period, daysCount]);

  // Calendar grid style
  const calendarGridStyle = useMemo<React.CSSProperties>(() => {
    const colCount = period === "year" ? 12 : daysCount;
    const minColWidth = columnWidth;
    const gapPx = 4;
    const totalColPx = 70;
    // Padding: pl-2 = 8px, pr-0.5 = 2px = 10px total
    const paddingPx = 10;

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
  }, [period, daysCount, columnWidth]);

  // Check if operator is available on a specific date (not on leave, not terminated, hired)
  const isOperatorAvailable = (operator: any, date: Date): boolean => {
    // Check if terminated
    if (isOperatorTerminated(operator, date)) return false;
    
    // Check if before hire date
    if (isBeforeHireDate(operator, date)) return false;
    
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
    
    // Check if it's a holiday (non-working day)
    if (exception && !exception.is_working_day) {
      return { minutes: 0, isShortenedDay: false, reductionMinutes: 0 };
    }
    
    const shift = getShiftForDateWithOverride(operator, day);
    if (!shift) {
      return { minutes: 0, isShortenedDay: false, reductionMinutes: 0 };
    }
    
    const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
    
    // If it's a shortened day
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

  // Calculate total working hours for an operator over the period
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

  // Calculate group total hours
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

  // Calculate group statistics
  const calculateGroupStats = (ops: any[]): { workingDays: number; offDays: number; absenceDays: number; totalHours: number; totalMinutes: number } => {
    let totalWorkingDays = 0;
    let totalOffDays = 0;
    let totalAbsenceDays = 0;
    let totalMinutes = 0;
    
    ops.forEach(operator => {
      days.forEach(day => {
        // Check if operator is on leave
        const absence = isDateInAbsence(day, absences, operator.id);
        if (absence) {
          totalAbsenceDays++;
          return;
        }
        
        // Check if terminated or not hired yet
        if (isOperatorTerminated(operator, day) || isBeforeHireDate(operator, day)) {
          totalOffDays++;
          return;
        }
        
        // Check for calendar exception (holiday)
        const exception = getExceptionForDate(day);
        if (exception && !exception.is_working_day) {
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

  // Calculate group yearly total
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

  return {
    daysCount,
    days,
    months,
    shiftColorMap,
    columnWidth,
    calendarGridStyle,
    calculateMonthHours,
    calculateTotalHours,
    calculateGroupTotalHours,
    calculateGroupStats,
    calculateYearlyTotal,
    calculateGroupYearlyTotal,
    isOperatorAvailable,
    getExceptionForDate,
    calculateDayMinutes,
    getDayMinutes,
    getShiftForDateWithOverride,
  };
};
