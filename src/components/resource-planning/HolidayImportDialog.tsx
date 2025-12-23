import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Download, Clock, CalendarOff, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getHolidaysForYear, templateToDbFormat, type HolidayTemplate } from "@/data/russianHolidays";
import { useBulkCreateCalendarExceptions } from "@/hooks/useResourcePlanning";
import { useCalendarExceptions } from "@/hooks/useResourcePlanning";

interface HolidayImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HolidayImportDialog = ({ open, onOpenChange }: HolidayImportDialogProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());
  const [importType, setImportType] = useState<"all" | "holidays" | "shortened">("all");
  
  const { data: existingExceptions = [] } = useCalendarExceptions();
  const bulkCreate = useBulkCreateCalendarExceptions();

  // Get years for selection (current year + 5 years ahead)
  const availableYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  }, [currentYear]);

  // Get holidays for selected year
  const holidays = useMemo(() => {
    const year = parseInt(selectedYear);
    let result = getHolidaysForYear(year);
    
    if (importType === "holidays") {
      result = result.filter(h => h.exception_type === "holiday");
    } else if (importType === "shortened") {
      result = result.filter(h => h.exception_type === "shortened_day");
    }
    
    return result;
  }, [selectedYear, importType]);

  // Check which holidays already exist
  const existingDates = useMemo(() => {
    return new Set(existingExceptions.map((e: any) => e.exception_date));
  }, [existingExceptions]);

  // Count new and existing
  const stats = useMemo(() => {
    let newCount = 0;
    let existingCount = 0;
    
    holidays.forEach(h => {
      if (existingDates.has(h.date)) {
        existingCount++;
      } else {
        newCount++;
      }
    });
    
    return { newCount, existingCount, total: holidays.length };
  }, [holidays, existingDates]);

  // Toggle single holiday selection
  const toggleHoliday = (date: string) => {
    setSelectedHolidays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Select all new holidays
  const selectAllNew = () => {
    const newDates = holidays
      .filter(h => !existingDates.has(h.date))
      .map(h => h.date);
    setSelectedHolidays(new Set(newDates));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedHolidays(new Set());
  };

  // Handle import
  const handleImport = async () => {
    const toImport = holidays
      .filter(h => selectedHolidays.has(h.date) && !existingDates.has(h.date))
      .map(templateToDbFormat);
    
    if (toImport.length === 0) return;
    
    await bulkCreate.mutateAsync(toImport);
    onOpenChange(false);
    setSelectedHolidays(new Set());
  };

  // Reset on year change
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedHolidays(new Set());
  };

  const getTypeIcon = (type: string, isWorkingDay: boolean) => {
    if (type === "shortened_day") {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    return <CalendarOff className="h-4 w-4 text-rose-500" />;
  };

  const selectedNewCount = Array.from(selectedHolidays).filter(d => !existingDates.has(d)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Импорт праздников России
          </DialogTitle>
          <DialogDescription>
            Выберите год и праздничные дни для добавления в производственный календарь
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Год</Label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={importType} onValueChange={(v: any) => setImportType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="holidays">Только праздники</SelectItem>
                <SelectItem value="shortened">Только сокращённые</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllNew}>
              Выбрать новые ({stats.newCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Сбросить
            </Button>
          </div>
        </div>

        {stats.existingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>
              {stats.existingCount} из {stats.total} дат уже существуют в календаре и будут пропущены
            </span>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[400px] border rounded-md">
          <div className="p-4 space-y-2">
            {holidays.map(holiday => {
              const exists = existingDates.has(holiday.date);
              const isSelected = selectedHolidays.has(holiday.date);
              const date = new Date(holiday.date);
              
              return (
                <div
                  key={holiday.date}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    exists 
                      ? "bg-muted/30 opacity-60 cursor-not-allowed" 
                      : isSelected 
                        ? "bg-primary/5 border-primary/30" 
                        : "hover:bg-muted/50 cursor-pointer"
                  )}
                  onClick={() => !exists && toggleHoliday(holiday.date)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={exists}
                    onCheckedChange={() => !exists && toggleHoliday(holiday.date)}
                  />
                  
                  <div className="flex-shrink-0">
                    {getTypeIcon(holiday.exception_type, holiday.is_working_day)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{holiday.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(date, "d MMMM yyyy (EEEE)", { locale: ru })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {holiday.exception_type === "shortened_day" && holiday.reduced_hours && (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {holiday.reduced_hours}ч
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {holiday.exception_type === "holiday" ? "Праздник" : "Сокращённый"}
                    </Badge>
                    {exists && (
                      <Badge variant="secondary" className="text-xs">
                        Уже есть
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedNewCount === 0 || bulkCreate.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Импортировать ({selectedNewCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
