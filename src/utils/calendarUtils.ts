// Calendar utilities for working with shortened days and schedule calculations

export interface CalendarException {
  id: string;
  exception_date: string;
  exception_type: "holiday" | "shortened_day" | "extra_working_day";
  is_working_day: boolean;
  reduced_hours?: number | null;
  reduction_hours?: number | null;
  name: string;
  description?: string | null;
}

export interface WorkScheduleShift {
  id: string;
  shift_number: number;
  net_work_minutes: number | null;
  gross_work_minutes: number;
  break_minutes: number;
}

/**
 * Calculate the actual working hours for a given date and schedule shift,
 * taking into account calendar exceptions (shortened days).
 * 
 * @param date - The date to check
 * @param shift - The work schedule shift to use for base hours
 * @param exceptions - List of calendar exceptions
 * @returns Object with hours info
 */
export function calculateWorkingHours(
  date: Date | string,
  shift: WorkScheduleShift | null,
  exceptions: CalendarException[]
): {
  isWorkingDay: boolean;
  isShortenedDay: boolean;
  isHoliday: boolean;
  baseHours: number;
  actualHours: number;
  reductionHours: number;
  exception: CalendarException | null;
} {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
  
  // Find exception for this date
  const exception = exceptions.find(e => e.exception_date === dateStr);
  
  // Calculate base hours from shift
  const baseHours = shift 
    ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) / 60
    : 8; // Default 8 hours if no shift
  
  if (!exception) {
    return {
      isWorkingDay: true,
      isShortenedDay: false,
      isHoliday: false,
      baseHours,
      actualHours: baseHours,
      reductionHours: 0,
      exception: null,
    };
  }
  
  // Holiday or non-working day
  if (exception.exception_type === "holiday" || !exception.is_working_day) {
    return {
      isWorkingDay: false,
      isShortenedDay: false,
      isHoliday: true,
      baseHours,
      actualHours: 0,
      reductionHours: baseHours,
      exception,
    };
  }
  
  // Shortened day
  if (exception.exception_type === "shortened_day") {
    // If absolute value is specified, use it
    if (exception.reduced_hours && exception.reduced_hours > 0) {
      return {
        isWorkingDay: true,
        isShortenedDay: true,
        isHoliday: false,
        baseHours,
        actualHours: exception.reduced_hours,
        reductionHours: baseHours - exception.reduced_hours,
        exception,
      };
    }
    
    // Otherwise calculate based on reduction_hours (default 1 hour)
    const reductionHours = exception.reduction_hours ?? 1;
    const actualHours = Math.max(0, baseHours - reductionHours);
    
    return {
      isWorkingDay: true,
      isShortenedDay: true,
      isHoliday: false,
      baseHours,
      actualHours,
      reductionHours,
      exception,
    };
  }
  
  // Extra working day (transfer from weekend)
  if (exception.exception_type === "extra_working_day") {
    return {
      isWorkingDay: true,
      isShortenedDay: false,
      isHoliday: false,
      baseHours,
      actualHours: baseHours,
      reductionHours: 0,
      exception,
    };
  }
  
  // Default case
  return {
    isWorkingDay: exception.is_working_day,
    isShortenedDay: false,
    isHoliday: !exception.is_working_day,
    baseHours,
    actualHours: exception.is_working_day ? baseHours : 0,
    reductionHours: exception.is_working_day ? 0 : baseHours,
    exception,
  };
}

/**
 * Get shortened day label for display
 */
export function getShortenedDayLabel(
  exception: CalendarException,
  baseHours: number
): string {
  if (exception.reduced_hours && exception.reduced_hours > 0) {
    return `${exception.reduced_hours}ч`;
  }
  
  const reductionHours = exception.reduction_hours ?? 1;
  const actualHours = Math.max(0, baseHours - reductionHours);
  return `${actualHours}ч (${baseHours}ч - ${reductionHours}ч)`;
}
