import { useMemo, useState, useRef, useEffect } from "react";
import { format, addDays, getDay, differenceInDays, startOfYear } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleCalendarPreviewProps {
  schedule: {
    schedule_type?: string;
    cycle_days_on?: number;
    cycle_days_off?: number;
    cycle_start_date?: string | null;
    work_schedule_shifts?: any[];
  };
  defaultDays?: number;
  cycleStartDate?: Date;
  showPeriodSelector?: boolean;
}

// Check if date is a working day based on schedule type
const isWorkingDay = (schedule: any, date: Date, cycleStartDate: Date): boolean => {
  const scheduleType = schedule?.schedule_type;
  const cycleDaysOn = schedule?.cycle_days_on || 5;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  
  // For 5/2 schedule - standard work week (Mon-Fri work, Sat-Sun off)
  // 'shift' and 'weekly' are also 5/2 patterns
  if (scheduleType === '5/2' || scheduleType === 'weekly' || scheduleType === 'shift') {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }
  
  // For cyclic schedules (2/2, 3/3, etc.) - calculate based on cycle from reference date
  // Use start of current year as reference point for consistent pattern display
  const cycleLength = cycleDaysOn + cycleDaysOff;
  const referenceDate = cycleStartDate || startOfYear(new Date());
  const daysDiff = differenceInDays(date, referenceDate);
  const dayInCycle = ((daysDiff % cycleLength) + cycleLength) % cycleLength;
  
  return dayInCycle < cycleDaysOn;
};

export const ScheduleCalendarPreview = ({ 
  schedule, 
  defaultDays = 7,
  cycleStartDate,
  showPeriodSelector = true
}: ScheduleCalendarPreviewProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(String(defaultDays));
  const days = parseInt(selectedPeriod);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
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

  // Check scroll position
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [days]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 150;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const showScrollControls = days > 7;

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
      <div className="relative">
        {showScrollControls && canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 bg-background/80 backdrop-blur-sm shadow-sm"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-none"
        >
          <div className={cn(
            "flex gap-1",
            days > 7 ? "w-max" : ""
          )}>
            {daysArray.map((day) => {
              // Use schedule's cycle_start_date if available, otherwise fall back to year start
              const scheduleStartDate = schedule.cycle_start_date 
                ? new Date(schedule.cycle_start_date) 
                : startOfYear(new Date());
              const isWorking = isWorkingDay(schedule, day, scheduleStartDate);
              const isTodayDate = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "text-center rounded-full flex flex-col items-center justify-center",
                    days <= 7 ? "flex-1 min-w-[40px] py-1.5 px-1" : "w-[40px] h-[52px] flex-shrink-0",
                    isWorking 
                      ? isTodayDate
                        ? "bg-gradient-to-b from-cyan-400 to-teal-500 text-white"
                        : "bg-background border border-border text-foreground"
                      : "bg-gradient-to-b from-rose-400 to-pink-500 text-white"
                  )}
                >
                  <div className={cn(
                    "font-semibold uppercase text-[10px] leading-tight",
                    !isWorking && "text-white",
                    isWorking && isTodayDate && "text-white",
                    isWorking && !isTodayDate && "text-foreground"
                  )}>
                    {format(day, "EEE", { locale: ru })}
                  </div>
                  <div className={cn(
                    "font-bold text-sm leading-tight",
                    !isWorking && "text-white",
                    isWorking && isTodayDate && "text-white",
                    isWorking && !isTodayDate && "text-foreground"
                  )}>
                    {format(day, "d", { locale: ru })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {showScrollControls && canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 bg-background/80 backdrop-blur-sm shadow-sm"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500"></div>
          <span>Сегодня</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border border-border bg-background"></div>
          <span>Рабочий</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-b from-rose-400 to-pink-500"></div>
          <span>Выходной</span>
        </div>
      </div>
    </div>
  );
};
