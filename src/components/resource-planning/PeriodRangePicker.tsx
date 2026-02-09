import React from "react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, addMonths, subYears, addYears } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodRangePickerProps {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
  className?: string;
}

export const getDefaultYearRange = (): PeriodRange => ({
  startDate: startOfYear(new Date()),
  endDate: endOfYear(new Date()),
});

export const PeriodRangePicker: React.FC<PeriodRangePickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);

  const handleQuickMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      const newStart = startOfMonth(subMonths(value.startDate, 1));
      const newEnd = endOfMonth(subMonths(value.startDate, 1));
      onChange({ startDate: newStart, endDate: newEnd });
    } else {
      const newStart = startOfMonth(addMonths(value.endDate, 1));
      const newEnd = endOfMonth(addMonths(value.endDate, 1));
      onChange({ startDate: newStart, endDate: newEnd });
    }
  };

  const handleQuickYear = (direction: "prev" | "next") => {
    if (direction === "prev") {
      const newStart = startOfYear(subYears(value.startDate, 1));
      const newEnd = endOfYear(subYears(value.startDate, 1));
      onChange({ startDate: newStart, endDate: newEnd });
    } else {
      const newStart = startOfYear(addYears(value.endDate, 1));
      const newEnd = endOfYear(addYears(value.endDate, 1));
      onChange({ startDate: newStart, endDate: newEnd });
    }
  };

  const setCurrentYear = () => {
    onChange({
      startDate: startOfYear(new Date()),
      endDate: endOfYear(new Date()),
    });
  };

  const setCurrentMonth = () => {
    onChange({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    });
  };

  // Check if currently showing full year
  const isFullYear = 
    format(value.startDate, "yyyy-MM-dd") === format(startOfYear(value.startDate), "yyyy-MM-dd") &&
    format(value.endDate, "yyyy-MM-dd") === format(endOfYear(value.startDate), "yyyy-MM-dd");

  // Check if currently showing single month
  const isSingleMonth = 
    format(value.startDate, "yyyy-MM-dd") === format(startOfMonth(value.startDate), "yyyy-MM-dd") &&
    format(value.endDate, "yyyy-MM-dd") === format(endOfMonth(value.startDate), "yyyy-MM-dd");

  const formatRangeLabel = () => {
    if (isFullYear) {
      return format(value.startDate, "yyyy") + " год";
    }
    if (isSingleMonth) {
      return format(value.startDate, "LLLL yyyy", { locale: ru });
    }
    return `${format(value.startDate, "d MMM", { locale: ru })} — ${format(value.endDate, "d MMM yyyy", { locale: ru })}`;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Quick navigation row */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => isFullYear ? handleQuickYear("prev") : handleQuickMonth("prev")}
            title={isFullYear ? "Предыдущий год" : "Предыдущий месяц"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 min-w-[140px] justify-center text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {formatRangeLabel()}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => isFullYear ? handleQuickYear("next") : handleQuickMonth("next")}
            title={isFullYear ? "Следующий год" : "Следующий месяц"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2 text-xs", isSingleMonth && "bg-primary/10")}
            onClick={setCurrentMonth}
          >
            Месяц
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2 text-xs", isFullYear && "bg-primary/10")}
            onClick={setCurrentYear}
          >
            Год
          </Button>
        </div>
      </div>

      {/* Date pickers row */}
      <div className="flex items-center gap-2 text-xs">
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 justify-start text-left font-normal text-xs flex-1",
                !value.startDate && "text-muted-foreground"
              )}
            >
              <CalendarDays className="mr-1 h-3 w-3" />
              {format(value.startDate, "dd.MM.yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.startDate}
              onSelect={(date) => {
                if (date) {
                  onChange({
                    startDate: date,
                    endDate: date > value.endDate ? date : value.endDate,
                  });
                  setStartOpen(false);
                }
              }}
              locale={ru}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-muted-foreground">—</span>
        
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 justify-start text-left font-normal text-xs flex-1",
                !value.endDate && "text-muted-foreground"
              )}
            >
              <CalendarDays className="mr-1 h-3 w-3" />
              {format(value.endDate, "dd.MM.yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value.endDate}
              onSelect={(date) => {
                if (date) {
                  onChange({
                    startDate: date < value.startDate ? date : value.startDate,
                    endDate: date,
                  });
                  setEndOpen(false);
                }
              }}
              locale={ru}
              initialFocus
              disabled={(date) => date < value.startDate}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
