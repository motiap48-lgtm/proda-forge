import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";

export interface TimeAgoResult {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  shortFormatted: string;
}

/**
 * Calculate detailed time elapsed since a given date
 */
export const getTimeAgo = (date: Date | string, endDate?: Date | string | null): TimeAgoResult => {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const end = endDate 
    ? (typeof endDate === "string" ? new Date(endDate) : endDate) 
    : new Date();

  const totalSeconds = differenceInSeconds(end, targetDate);
  const totalMinutes = differenceInMinutes(end, targetDate);
  const totalHours = differenceInHours(end, targetDate);
  const totalDays = differenceInDays(end, targetDate);
  const totalWeeks = differenceInWeeks(end, targetDate);
  const totalMonths = differenceInMonths(end, targetDate);
  const totalYears = differenceInYears(end, targetDate);

  // Calculate remaining values after subtracting larger units
  const years = totalYears;
  const months = totalMonths - years * 12;
  const weeks = Math.floor((totalDays - totalMonths * 30) / 7);
  const days = totalDays - totalMonths * 30 - weeks * 7;
  const hours = totalHours - totalDays * 24;
  const minutes = totalMinutes - totalHours * 60;
  const seconds = totalSeconds - totalMinutes * 60;

  // Format a human-readable string
  const isOngoing = !endDate;
  const formatted = formatTimeAgo(years, months, weeks, days, hours, minutes, seconds);
  const shortFormatted = formatShortTimeAgo(totalYears, totalMonths, totalDays, totalHours, totalMinutes, isOngoing);

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    weeks: Math.max(0, weeks),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    formatted,
    shortFormatted,
  };
};

/**
 * Format full time ago string in Russian
 */
const formatTimeAgo = (
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number
): string => {
  const parts: string[] = [];

  if (years > 0) parts.push(`${years} ${pluralize(years, "год", "года", "лет")}`);
  if (months > 0) parts.push(`${months} ${pluralize(months, "месяц", "месяца", "месяцев")}`);
  if (weeks > 0) parts.push(`${weeks} ${pluralize(weeks, "неделя", "недели", "недель")}`);
  if (days > 0) parts.push(`${days} ${pluralize(days, "день", "дня", "дней")}`);
  if (hours > 0) parts.push(`${hours} ${pluralize(hours, "час", "часа", "часов")}`);
  if (minutes > 0) parts.push(`${minutes} ${pluralize(minutes, "минута", "минуты", "минут")}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${Math.max(0, seconds)} ${pluralize(Math.max(0, seconds), "секунда", "секунды", "секунд")}`);

  return parts.join(", ");
};

/**
 * Format short time ago string (only the most significant unit)
 */
const formatShortTimeAgo = (
  totalYears: number,
  totalMonths: number,
  totalDays: number,
  totalHours: number,
  totalMinutes: number,
  isOngoing: boolean = true
): string => {
  const suffix = isOngoing ? " назад" : "";
  
  if (totalYears > 0) {
    return `${totalYears} ${pluralize(totalYears, "год", "года", "лет")}${suffix}`;
  }
  if (totalMonths > 0) {
    return `${totalMonths} ${pluralize(totalMonths, "месяц", "месяца", "месяцев")}${suffix}`;
  }
  if (totalDays > 0) {
    return `${totalDays} ${pluralize(totalDays, "день", "дня", "дней")}${suffix}`;
  }
  if (totalHours > 0) {
    return `${totalHours} ${pluralize(totalHours, "час", "часа", "часов")}${suffix}`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes} ${pluralize(totalMinutes, "минуту", "минуты", "минут")}${suffix}`;
  }
  return isOngoing ? "только что" : "менее минуты";
};

/**
 * Russian pluralization helper
 */
export const pluralize = (n: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
};
