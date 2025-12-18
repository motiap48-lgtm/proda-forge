import { useMemo, useState } from "react";
import { format, addDays, getDay, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScheduleCalendarPreviewProps {
  schedule: {
    schedule_type?: string;
    cycle_days_on?: number;
    cycle_days_off?: number;
    work_schedule_shifts?: any[];
  };
  defaultDays?: number;
  startDate?: Date;
  showPeriodSelector?: boolean;
}

// Check if date is a working day based on schedule type
const isWorkingDay = (schedule: any, date: Date, startDate: Date): boolean => {
  const scheduleType = schedule?.schedule_type;
  const cycleDaysOn = schedule?.cycle_days_on || 5;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  
  // For 5/2 schedule - standard work week (Mon-Fri work, Sat-Sun off)
  if (scheduleType === '5/2' || scheduleType === 'weekly') {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }
  
  // For cyclic schedules (2/2, 3/3, etc.) - calculate based on cycle
  const cycleLength = cycleDaysOn + cycleDaysOff;
  const daysDiff = differenceInDays(date, startDate);
  const dayInCycle = ((daysDiff % cycleLength) + cycleLength) % cycleLength;
  
  return dayInCycle < cycleDaysOn;
};

export const ScheduleCalendarPreview = ({ 
  schedule, 
  defaultDays = 7,
  startDate = new Date(),
  showPeriodSelector = true
}: ScheduleCalendarPreviewProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(String(defaultDays));
  const days = parseInt(selectedPeriod);
  
  // Generate days
  const daysArray = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, [days]);

  const shiftsCount = schedule.work_schedule_shifts?.length || 0;
  
  // Get total work hours per shift
  const totalWorkHours = useMemo(() => {
    if (!schedule.work_schedule_shifts?.length) return 0;
    const totalMinutes = schedule.work_schedule_shifts.reduce((sum: number, shift: any) => {
      return sum + (shift.net_work_minutes || (shift.gross_work_minutes - shift.break_minutes) || 0);
    }, 0);
    return Math.round(totalMinutes / 60);
  }, [schedule.work_schedule_shifts]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Календарь графика</span>
          {totalWorkHours > 0 && (
            <span className="text-muted-foreground">({totalWorkHours} часов)</span>
          )}
        </div>
        {showPeriodSelector && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-6 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="14">14 дней</SelectItem>
              <SelectItem value="30">Месяц</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className={cn(
          "flex gap-1",
          days > 7 ? "w-max" : ""
        )}>
          {daysArray.map((day) => {
            const isWorking = isWorkingDay(schedule, day, startDate);
            const isTodayDate = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "text-center p-1 rounded text-[10px] border",
                  days <= 7 ? "flex-1 min-w-[36px]" : "w-[36px] flex-shrink-0",
                  isWorking 
                    ? "bg-primary/10 border-primary/30 text-primary" 
                    : "bg-muted/50 border-muted text-muted-foreground",
                  isTodayDate && "ring-2 ring-primary/50"
                )}
              >
                <div className={cn(
                  "font-medium uppercase",
                  isWeekend && !isWorking && "text-destructive/70"
                )}>
                  {format(day, "EEE", { locale: ru })}
                </div>
                <div className="text-[9px]">
                  {format(day, "d", { locale: ru })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/10 border border-primary/30"></div>
          <span>Рабочий</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted/50 border border-muted"></div>
          <span>Выходной</span>
        </div>
      </div>
    </div>
  );
};
