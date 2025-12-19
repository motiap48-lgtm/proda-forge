import { differenceInCalendarDays, differenceInWeeks, startOfDay, startOfWeek, getDay } from "date-fns";

// Parse backend date strings safely ("YYYY-MM-DD" should be treated as local date)
export const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;

  // Typical Postgres date comes as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m - 1, d);
    }
  }

  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

// Check if date is a working day based on schedule type
export const isWorkingDay = (schedule: any, date: Date, operator: any): boolean => {
  const scheduleType = schedule?.schedule_type;
  const cycleDaysOn = schedule?.cycle_days_on || 5;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday

  // For weekly or shift schedules with 5/2 pattern - standard work week (Mon-Fri work, Sat-Sun off)
  if (
    scheduleType === "weekly" ||
    scheduleType === "5/2" ||
    (scheduleType === "shift" && cycleDaysOn === 5 && cycleDaysOff === 2) ||
    (cycleDaysOn === 5 && cycleDaysOff === 2 && scheduleType !== "cyclic")
  ) {
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  // For cyclic schedules (2/2, 3/3, etc.)
  if (scheduleType === "cyclic") {
    const cycleLength = cycleDaysOn + cycleDaysOff;
    const reference =
      parseDateOnly(operator?.shift_rotation_start_date) ??
      parseDateOnly(schedule?.cycle_start_date) ??
      new Date(2024, 0, 1);

    const daysDiff = differenceInCalendarDays(startOfDay(date), startOfDay(reference));
    const dayInCycle = ((daysDiff % cycleLength) + cycleLength) % cycleLength;

    return dayInCycle < cycleDaysOn;
  }

  // Default - check by day of week for any 5/2 pattern
  if (cycleDaysOn === 5 && cycleDaysOff === 2) {
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  return true;
};

// Get cycle day number for cyclic schedules (1-based index within cycle)
export const getCycleDayNumber = (
  schedule: any, 
  date: Date, 
  operator: any
): { dayInCycle: number; cycleLength: number; isWorkDay: boolean } | null => {
  const scheduleType = schedule?.schedule_type;
  if (scheduleType !== "cyclic") return null;

  const cycleDaysOn = schedule?.cycle_days_on || 2;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  const cycleLength = cycleDaysOn + cycleDaysOff;

  const reference =
    parseDateOnly(operator?.shift_rotation_start_date) ??
    parseDateOnly(schedule?.cycle_start_date) ??
    new Date(2024, 0, 1);

  const daysDiff = differenceInCalendarDays(startOfDay(date), startOfDay(reference));
  const dayInCycle = ((daysDiff % cycleLength) + cycleLength) % cycleLength;

  return {
    dayInCycle: dayInCycle + 1,
    cycleLength,
    isWorkDay: dayInCycle < cycleDaysOn
  };
};

// Calculate shift for a given operator on a specific date
export const getShiftForDate = (operator: any, date: Date) => {
  const schedule = operator.work_schedules;
  const shifts = schedule?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return null;
  
  if (!isWorkingDay(schedule, date, operator)) {
    return null;
  }
  
  if (shifts.length === 1) {
    return shifts[0];
  }
  
  if (operator.shift_rotation_enabled && shifts.length >= 2) {
    const startDate = operator.shift_rotation_start_date 
      ? new Date(operator.shift_rotation_start_date) 
      : new Date();
    
    const cycleDaysOn = schedule?.cycle_days_on || 5;
    const cycleDaysOff = schedule?.cycle_days_off || 2;
    const scheduleType = schedule?.schedule_type;
    
    const is52Schedule = 
      scheduleType === 'weekly' || 
      scheduleType === '5/2' || 
      (cycleDaysOn === 5 && cycleDaysOff === 2);
    
    let weeksDiff: number;
    if (is52Schedule) {
      const startOfCurrentWeek = startOfWeek(date, { weekStartsOn: 1 });
      const startOfRotationWeek = startOfWeek(startDate, { weekStartsOn: 1 });
      weeksDiff = differenceInWeeks(startOfCurrentWeek, startOfRotationWeek);
    } else {
      weeksDiff = differenceInWeeks(date, startDate);
    }
    
    const startingShift = operator.assigned_shift_number || 1;
    const shiftIndex = ((((startingShift - 1 + weeksDiff) % shifts.length) + shifts.length) % shifts.length);
    const currentShiftNumber = shiftIndex + 1;
    return shifts.find((s: any) => s.shift_number === currentShiftNumber);
  }
  
  if (operator.assigned_shift_number) {
    return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number);
  }
  
  return shifts[0];
};

// Get unique shift colors - matching reference styling with gradients
export const getShiftColor = (shiftName: string, index: number) => {
  const colors = [
    { bg: "bg-gradient-to-b from-amber-300 to-amber-400 dark:from-amber-700 dark:to-amber-800", text: "text-amber-900 dark:text-amber-100", border: "border-amber-500 dark:border-amber-600" },
    { bg: "bg-gradient-to-b from-green-300 to-green-400 dark:from-green-700 dark:to-green-800", text: "text-green-900 dark:text-green-100", border: "border-green-500 dark:border-green-600" },
    { bg: "bg-gradient-to-b from-purple-300 to-purple-400 dark:from-purple-700 dark:to-purple-800", text: "text-purple-900 dark:text-purple-100", border: "border-purple-500 dark:border-purple-600" },
    { bg: "bg-gradient-to-b from-blue-300 to-blue-400 dark:from-blue-700 dark:to-blue-800", text: "text-blue-900 dark:text-blue-100", border: "border-blue-500 dark:border-blue-600" },
  ];
  return colors[index % colors.length];
};

export type ShiftColors = ReturnType<typeof getShiftColor>;
export type PeriodType = "1" | "7" | "14" | "30" | "month" | "year" | "custom";
