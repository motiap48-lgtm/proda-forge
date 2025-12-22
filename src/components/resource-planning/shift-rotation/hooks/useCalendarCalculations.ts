import { useMemo } from "react";
import { addDays, getDaysInMonth, differenceInDays, startOfMonth } from "date-fns";
import { getShiftForDate, getShiftColor, type PeriodType, type ShiftColors } from "../utils";
import { isDateInAbsence, isOperatorTerminated, isBeforeHireDate, type OperatorAbsence } from "@/hooks/useOperatorAbsences";

interface CalendarCalculationsProps {
  operators: any[];
  period: PeriodType;
  startDate: Date;
  endDate?: Date;
  absences?: OperatorAbsence[];
}

export const useCalendarCalculations = ({
  operators,
  period,
  startDate,
  endDate,
  absences = [],
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

  // Calculate hours for a specific month (with absence consideration)
  const calculateMonthHours = (operator: any, month: Date): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const monthStart = startOfMonth(month);
    const daysInMonth = getDaysInMonth(month);
    
    for (let i = 0; i < daysInMonth; i++) {
      const day = addDays(monthStart, i);
      
      // Skip if operator is not available
      if (!isOperatorAvailable(operator, day)) continue;
      
      const shift = getShiftForDate(operator, day);
      if (shift) {
        const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
        totalMinutes += netMinutes;
      }
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate total working hours for an operator over the period (with absence consideration)
  const calculateTotalHours = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      // Skip if operator is not available
      if (!isOperatorAvailable(operator, day)) return;
      
      const shift = getShiftForDate(operator, day);
      if (shift) {
        const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
        totalMinutes += netMinutes;
      }
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group total hours (with absence consideration)
  const calculateGroupTotalHours = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      days.forEach(day => {
        // Skip if operator is not available
        if (!isOperatorAvailable(operator, day)) return;
        
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
  };

  // Calculate group statistics (with absence consideration)
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
        
        const shift = getShiftForDate(operator, day);
        if (shift) {
          totalWorkingDays++;
          const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
          totalMinutes += netMinutes;
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

  // Calculate yearly total for an operator (with absence consideration)
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

  // Calculate group yearly total (with absence consideration)
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
  };
};
