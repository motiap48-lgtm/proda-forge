// Russian holidays template data
// Based on official production calendar of Russian Federation

export interface HolidayTemplate {
  name: string;
  description?: string;
  exception_type: "holiday" | "shortened_day" | "extra_working_day";
  is_working_day: boolean;
  reduced_hours?: number; // Legacy: absolute hours (kept for backward compatibility)
  reduction_hours?: number; // New: hours to reduce from schedule (default 1)
  // day and month (1-indexed)
  day: number;
  month: number;
}

// Fixed holidays that occur every year on the same date
export const fixedHolidays: HolidayTemplate[] = [
  // New Year holidays (1-8 January)
  { name: "Новый год", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 1, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 2, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 3, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 4, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 5, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 6, month: 1 },
  { name: "Рождество Христово", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 7, month: 1 },
  { name: "Новогодние каникулы", description: "Новогодние каникулы", exception_type: "holiday", is_working_day: false, day: 8, month: 1 },
  
  // February 23 - Defender of the Fatherland Day
  { name: "День защитника Отечества", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 23, month: 2 },
  
  // March 8 - International Women's Day
  { name: "Международный женский день", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 8, month: 3 },
  
  // May 1 - Spring and Labor Day
  { name: "Праздник Весны и Труда", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 1, month: 5 },
  
  // May 9 - Victory Day
  { name: "День Победы", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 9, month: 5 },
  
  // June 12 - Russia Day
  { name: "День России", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 12, month: 6 },
  
  // November 4 - National Unity Day
  { name: "День народного единства", description: "Праздничный день", exception_type: "holiday", is_working_day: false, day: 4, month: 11 },
  
  // December 31 - often a shortened day or holiday (corporate calendar)
  { name: "Предновогодний день", description: "Сокращённый рабочий день", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 31, month: 12 },
];

// Pre-holiday shortened days (day before the holiday)
export const shortenedDays: HolidayTemplate[] = [
  // Day before February 23
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 23 февраля", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 22, month: 2 },
  
  // Day before March 8
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 8 марта", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 7, month: 3 },
  
  // Day before May 1
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 1 мая", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 30, month: 4 },
  
  // Day before May 9
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 9 мая", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 8, month: 5 },
  
  // Day before June 12
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 12 июня", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 11, month: 6 },
  
  // Day before November 4
  { name: "Предпраздничный день", description: "Сокращённый рабочий день перед 4 ноября", exception_type: "shortened_day", is_working_day: true, reduction_hours: 1, day: 3, month: 11 },
];

// Get all holidays for a specific year
export const getHolidaysForYear = (year: number): Array<HolidayTemplate & { date: string }> => {
  const allHolidays = [...fixedHolidays, ...shortenedDays];
  
  return allHolidays.map(h => ({
    ...h,
    date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
  }));
};

// Convert template to database format
export const templateToDbFormat = (template: HolidayTemplate & { date: string }) => ({
  exception_date: template.date,
  exception_type: template.exception_type,
  name: template.name,
  description: template.description || null,
  is_working_day: template.is_working_day,
  reduced_hours: template.reduced_hours || null,
  reduction_hours: template.reduction_hours ?? 1, // Default to 1 hour reduction
});
