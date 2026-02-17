import { differenceInDays, differenceInMonths, differenceInYears, differenceInHours, differenceInMinutes, differenceInSeconds, parseISO, isAfter, isBefore, isWithinInterval, addDays, startOfDay, endOfDay, min, max } from "date-fns";

export interface EmploymentPeriod {
  startDate: Date;
  endDate: Date | null; // null means currently employed
  startEventType: string;
  endEventType: string | null;
}

export interface AbsenceRecord {
  start_date: string;
  end_date: string;
  status: string;
}

export interface DurationBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  absenceDays: number;
  netDays: number;
}

export interface EmploymentPeriodWithDuration extends EmploymentPeriod {
  duration: DurationBreakdown;
  isCurrent: boolean;
}

export interface EmploymentSummary {
  periods: EmploymentPeriodWithDuration[];
  totalDuration: DurationBreakdown;
  totalAbsenceDays: number;
  isCurrentlyEmployed: boolean;
}

/**
 * Russian pluralization helper
 */
function pluralize(count: number, one: string, few: string, many: string): string {
  const absCount = Math.abs(count);
  const lastTwo = absCount % 100;
  const lastOne = absCount % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return many;
  }

  if (lastOne === 1) {
    return one;
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return few;
  }

  return many;
}

/**
 * Calculate absence days within a specific period
 */
function calculateAbsenceDaysInPeriod(
  periodStart: Date,
  periodEnd: Date,
  absences: AbsenceRecord[]
): number {
  let totalAbsenceDays = 0;

  for (const absence of absences) {
    if (absence.status !== "approved") continue;

    const absenceStart = parseISO(absence.start_date);
    const absenceEnd = parseISO(absence.end_date);

    // Check if absence overlaps with period
    if (isAfter(absenceStart, periodEnd) || isBefore(absenceEnd, periodStart)) {
      continue; // No overlap
    }

    // Calculate overlapping portion
    const overlapStart = max([absenceStart, periodStart]);
    const overlapEnd = min([absenceEnd, periodEnd]);

    const days = differenceInDays(overlapEnd, overlapStart) + 1;
    totalAbsenceDays += days;
  }

  return totalAbsenceDays;
}

/**
 * Calculate detailed duration breakdown
 */
function calculateDurationBreakdown(
  startDate: Date,
  endDate: Date,
  absenceDays: number
): DurationBreakdown {
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const netDays = Math.max(0, totalDays - absenceDays);

  // Convert net days into years, months, days
  const years = Math.floor(netDays / 365);
  const remainingAfterYears = netDays % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const days = remainingAfterYears % 30;

  // For current employment, calculate precise time
  const now = new Date();
  const hours = differenceInHours(now, startOfDay(now));
  const minutes = differenceInMinutes(now, startOfDay(now)) % 60;
  const seconds = differenceInSeconds(now, startOfDay(now)) % 60;

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays,
    absenceDays,
    netDays,
  };
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(duration: DurationBreakdown, includeTime: boolean = false): string {
  const parts: string[] = [];

  if (duration.years > 0) {
    parts.push(`${duration.years} ${pluralize(duration.years, "год", "года", "лет")}`);
  }

  if (duration.months > 0) {
    parts.push(`${duration.months} ${pluralize(duration.months, "месяц", "месяца", "месяцев")}`);
  }

  if (duration.days > 0 || parts.length === 0) {
    parts.push(`${duration.days} ${pluralize(duration.days, "день", "дня", "дней")}`);
  }

  if (includeTime) {
    const timeParts: string[] = [];
    if (duration.hours > 0) {
      timeParts.push(`${duration.hours} ${pluralize(duration.hours, "час", "часа", "часов")}`);
    }
    if (duration.minutes > 0) {
      timeParts.push(`${duration.minutes} ${pluralize(duration.minutes, "минута", "минуты", "минут")}`);
    }
    if (duration.seconds > 0) {
      timeParts.push(`${duration.seconds} ${pluralize(duration.seconds, "секунда", "секунды", "секунд")}`);
    }
    if (timeParts.length > 0) {
      parts.push(timeParts.join(" "));
    }
  }

  return parts.join(" ");
}

/**
 * Format short duration
 */
export function formatShortDuration(duration: DurationBreakdown): string {
  if (duration.years > 0) {
    return `${duration.years}г ${duration.months}м ${duration.days}д`;
  }
  if (duration.months > 0) {
    return `${duration.months}м ${duration.days}д`;
  }
  return `${duration.days}д`;
}

/**
 * Parse employment history and calculate work periods
 */
export function calculateEmploymentSummary(
  history: Array<{ event_type: string; event_date: string; created_at: string }>,
  absences: AbsenceRecord[]
): EmploymentSummary {
  if (!history || history.length === 0) {
    return {
      periods: [],
      totalDuration: {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalDays: 0,
        absenceDays: 0,
        netDays: 0,
      },
      totalAbsenceDays: 0,
      isCurrentlyEmployed: false,
    };
  }

  // Sort history by event_date ascending
  const sortedHistory = [...history].sort(
    (a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime()
  );

  const periods: EmploymentPeriodWithDuration[] = [];
  let currentPeriodStart: Date | null = null;
  let currentPeriodStartType: string = "";
  let isCurrentlyEmployed = false;

  for (const event of sortedHistory) {
    const eventDate = parseISO(event.event_date);

    if (event.event_type === "hired" || event.event_type === "reinstated") {
      // Start new employment period
      currentPeriodStart = eventDate;
      currentPeriodStartType = event.event_type;
      isCurrentlyEmployed = true;
    } else if (event.event_type === "terminated" && currentPeriodStart) {
      // End current employment period
      const absenceDays = calculateAbsenceDaysInPeriod(currentPeriodStart, eventDate, absences);
      const duration = calculateDurationBreakdown(currentPeriodStart, eventDate, absenceDays);

      periods.push({
        startDate: currentPeriodStart,
        endDate: eventDate,
        startEventType: currentPeriodStartType,
        endEventType: "terminated",
        duration,
        isCurrent: false,
      });

      currentPeriodStart = null;
      currentPeriodStartType = "";
      isCurrentlyEmployed = false;
    }
  }

  // If there's an open period (currently employed)
  if (currentPeriodStart) {
    const now = new Date();
    const isFuturePeriod = currentPeriodStart > now;

    if (isFuturePeriod) {
      // Period hasn't started yet — show 0 duration
      const zeroDuration: DurationBreakdown = {
        years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0,
        totalDays: 0, absenceDays: 0, netDays: 0,
      };
      periods.push({
        startDate: currentPeriodStart,
        endDate: null,
        startEventType: currentPeriodStartType,
        endEventType: null,
        duration: zeroDuration,
        isCurrent: true,
      });
    } else {
      const absenceDays = calculateAbsenceDaysInPeriod(currentPeriodStart, now, absences);
      const duration = calculateDurationBreakdown(currentPeriodStart, now, absenceDays);
      periods.push({
        startDate: currentPeriodStart,
        endDate: null,
        startEventType: currentPeriodStartType,
        endEventType: null,
        duration,
        isCurrent: true,
      });
    }

    isCurrentlyEmployed = true;
  }

  // Calculate total duration
  let totalNetDays = 0;
  let totalAbsenceDays = 0;

  for (const period of periods) {
    totalNetDays += period.duration.netDays;
    totalAbsenceDays += period.duration.absenceDays;
  }

  // Convert total net days to years, months, days
  const years = Math.floor(totalNetDays / 365);
  const remainingAfterYears = totalNetDays % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const days = remainingAfterYears % 30;

  const totalDuration: DurationBreakdown = {
    years,
    months,
    days,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: periods.reduce((sum, p) => sum + p.duration.totalDays, 0),
    absenceDays: totalAbsenceDays,
    netDays: totalNetDays,
  };

  return {
    periods,
    totalDuration,
    totalAbsenceDays,
    isCurrentlyEmployed,
  };
}
