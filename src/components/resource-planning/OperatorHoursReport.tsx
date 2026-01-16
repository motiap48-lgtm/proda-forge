import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Clock, FileSpreadsheet, Users, TrendingDown, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, addDays, getDaysInMonth, startOfYear, endOfYear, getYear } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useOperators, useCalendarExceptions } from "@/hooks/useResourcePlanning";
import { useAllOperatorAbsences, isDateInAbsence, isOperatorTerminated, isBeforeHireDate } from "@/hooks/useOperatorAbsences";
import { useScheduleOverrides } from "@/hooks/useScheduleOverrides";
import { useOvertimeEntries, createOvertimeMap, OvertimeEntry } from "@/hooks/useOvertimeEntries";
import { getShiftForDate, isWorkingDay } from "./shift-rotation/utils";
import * as XLSX from "xlsx";

type PeriodType = "month" | "quarter" | "year";

interface OvertimeDetail {
  date: string;
  hours: number;
  isWorkingDay: boolean;
}

interface OperatorHoursData {
  operator: any;
  plannedHours: number;
  actualHours: number;
  shortenedDaysCount: number;
  shortenedDaysReduction: number;
  holidaysCount: number;
  holidaysReduction: number;
  absenceDays: number;
  workingDays: number;
  overtimeDays: number;
  overtimeHours: number;
  totalDays: number;
  overtimeDetails: OvertimeDetail[];
}

export const OperatorHoursReport = () => {
  const { data: operators = [] } = useOperators();
  const { data: absences = [] } = useAllOperatorAbsences();
  const { data: calendarExceptions = [] } = useCalendarExceptions();
  
  const operatorIds = useMemo(() => operators.filter((op: any) => op.is_active).map((op: any) => op.id), [operators]);
  const { data: scheduleOverrides = [] } = useScheduleOverrides(operatorIds);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(currentMonth / 3).toString());
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");

  // Get unique schedules for filter
  const uniqueSchedules = useMemo(() => {
    const schedules = new Set<string>();
    operators.forEach((op: any) => {
      if (op.work_schedules?.name) {
        schedules.add(op.work_schedules.name);
      }
    });
    return Array.from(schedules).sort();
  }, [operators]);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const year = parseInt(selectedYear);
    
    if (periodType === "month") {
      const month = parseInt(selectedMonth);
      return {
        start: startOfMonth(new Date(year, month)),
        end: endOfMonth(new Date(year, month)),
      };
    }
    
    if (periodType === "quarter") {
      const quarter = parseInt(selectedQuarter);
      const startMonth = quarter * 3;
      return {
        start: startOfMonth(new Date(year, startMonth)),
        end: endOfMonth(new Date(year, startMonth + 2)),
      };
    }
    
    // Year
    return {
      start: startOfYear(new Date(year, 0)),
      end: endOfYear(new Date(year, 0)),
    };
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  // Generate days array
  const days = useMemo(() => {
    const result: Date[] = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [dateRange]);

  // Fetch overtime entries for the date range
  const { data: overtimeEntries = [] } = useOvertimeEntries(dateRange.start, dateRange.end, operatorIds);
  
  // Create overtime map for fast lookup
  const overtimeMap = useMemo(() => createOvertimeMap(overtimeEntries.filter(e => e.status === 'approved')), [overtimeEntries]);

  // Create exceptions map
  const exceptionsMap = useMemo(() => {
    const map = new Map<string, any>();
    calendarExceptions.forEach((exc: any) => {
      map.set(exc.exception_date, exc);
    });
    return map;
  }, [calendarExceptions]);

  // Filter operators
  const filteredOperators = useMemo(() => {
    let result = operators.filter((op: any) => 
      op.is_active && op.work_schedules?.work_schedule_shifts?.length > 0
    );
    
    if (scheduleFilter !== "all") {
      result = result.filter((op: any) => op.work_schedules?.name === scheduleFilter);
    }
    
    return result;
  }, [operators, scheduleFilter]);

  // Calculate hours for each operator
  const operatorHoursData: OperatorHoursData[] = useMemo(() => {
    return filteredOperators.map((operator: any) => {
      let plannedHours = 0;
      let actualHours = 0;
      let shortenedDaysCount = 0;
      let shortenedDaysReduction = 0;
      let holidaysCount = 0;
      let holidaysReduction = 0;
      let absenceDays = 0;
      let workingDays = 0;
      let overtimeHours = 0;
      const overtimeDaysSet = new Set<string>(); // Track unique overtime days
      const workingDaysSet = new Set<string>(); // Track working days for total calculation
      const overtimeDetailsMap = new Map<string, { hours: number; isWorkingDay: boolean }>();

      const schedule = operator.work_schedules;
      const shifts = schedule?.work_schedule_shifts || [];
      // Check if this is a cyclic schedule (2/2, etc.) - they ignore holidays
      const isCyclicSchedule = schedule?.schedule_type === 'cyclic';

      days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        
        // Check termination/hire
        if (isOperatorTerminated(operator, day) || isBeforeHireDate(operator, day)) {
          return;
        }

        // Get shift for this day to determine if working day
        const shift = getShiftForDate(operator, day);
        const exception = exceptionsMap.get(dateStr);
        
        // Determine if this is a working day for overtime tooltip
        let isDayWorkingDay = false;
        if (shift) {
          // Holiday check for non-cyclic
          if (exception && !exception.is_working_day && !isCyclicSchedule) {
            isDayWorkingDay = false;
          } else {
            isDayWorkingDay = true;
          }
        }

        // Check for overtime on this day
        const overtimeKey = `${operator.id}_${dateStr}`;
        const dayOvertimeEntries = overtimeMap.get(overtimeKey) || [];
        const dayOvertimeMinutes = dayOvertimeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
        
        if (dayOvertimeMinutes > 0) {
          overtimeHours += dayOvertimeMinutes / 60;
          overtimeDaysSet.add(dateStr);
          overtimeDetailsMap.set(dateStr, {
            hours: dayOvertimeMinutes / 60,
            isWorkingDay: isDayWorkingDay,
          });
        }

        // Check absence
        const absence = isDateInAbsence(day, absences, operator.id);
        if (absence) {
          absenceDays++;
          return;
        }

        const normalNetMinutes = shift 
          ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes))
          : 0;
        const normalHours = normalNetMinutes / 60;

        // Holiday (non-working day) - cyclic schedules ignore holidays
        if (exception && !exception.is_working_day && !isCyclicSchedule) {
          if (shift) {
            holidaysCount++;
            holidaysReduction += normalHours;
            plannedHours += normalHours;
          }
          return;
        }

        // Shortened day - cyclic schedules ignore shortened days
        if (exception && exception.exception_type === "shortened_day" && shift && !isCyclicSchedule) {
          plannedHours += normalHours;
          
          let reducedHours: number;
          if (exception.reduced_hours != null && exception.reduced_hours > 0) {
            reducedHours = Math.min(exception.reduced_hours, normalHours);
          } else {
            const reductionHours = schedule?.reduction_hours ?? exception.reduction_hours ?? 1;
            reducedHours = Math.max(0, normalHours - reductionHours);
          }
          
          actualHours += reducedHours;
          shortenedDaysCount++;
          shortenedDaysReduction += normalHours - reducedHours;
          workingDays++;
          workingDaysSet.add(dateStr);
          return;
        }

        // Normal working day
        if (shift) {
          plannedHours += normalHours;
          actualHours += normalHours;
          workingDays++;
          workingDaysSet.add(dateStr);
        }
      });

      // Calculate overtime days that are NOT working days (for total days calculation)
      const overtimeDays = overtimeDaysSet.size;
      let additionalOvertimeDays = 0;
      overtimeDaysSet.forEach(dateStr => {
        if (!workingDaysSet.has(dateStr)) {
          additionalOvertimeDays++;
        }
      });
      const totalDays = workingDays + additionalOvertimeDays;

      // Build overtime details array sorted by date
      const overtimeDetails: OvertimeDetail[] = Array.from(overtimeDetailsMap.entries())
        .map(([date, detail]) => ({
          date,
          hours: detail.hours,
          isWorkingDay: detail.isWorkingDay,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        operator,
        plannedHours,
        actualHours: actualHours + overtimeHours, // Include overtime in actual hours
        shortenedDaysCount,
        shortenedDaysReduction,
        holidaysCount,
        holidaysReduction,
        absenceDays,
        workingDays,
        overtimeDays,
        overtimeHours,
        totalDays,
        overtimeDetails,
      };
    });
  }, [filteredOperators, days, absences, exceptionsMap, overtimeMap]);

  // Calculate totals
  const totals = useMemo(() => {
    return operatorHoursData.reduce(
      (acc, data) => ({
        plannedHours: acc.plannedHours + data.plannedHours,
        actualHours: acc.actualHours + data.actualHours,
        shortenedDaysReduction: acc.shortenedDaysReduction + data.shortenedDaysReduction,
        holidaysReduction: acc.holidaysReduction + data.holidaysReduction,
        totalReduction: acc.totalReduction + data.shortenedDaysReduction + data.holidaysReduction,
        overtimeDays: acc.overtimeDays + data.overtimeDays,
        overtimeHours: acc.overtimeHours + data.overtimeHours,
        totalDays: acc.totalDays + data.totalDays,
        workingDays: acc.workingDays + data.workingDays,
      }),
      { plannedHours: 0, actualHours: 0, shortenedDaysReduction: 0, holidaysReduction: 0, totalReduction: 0, overtimeDays: 0, overtimeHours: 0, totalDays: 0, workingDays: 0 }
    );
  }, [operatorHoursData]);

  // Helper to format overtime details for export
  const formatOvertimeDetailsForExport = (details: OvertimeDetail[]): string => {
    if (details.length === 0) return "";
    return details
      .map(d => {
        const dateFormatted = format(new Date(d.date), "dd.MM", { locale: ru });
        const dayType = d.isWorkingDay ? "раб." : "вых.";
        return `${dateFormatted} (${d.hours.toFixed(1)}ч, ${dayType})`;
      })
      .join("; ");
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = operatorHoursData.map(data => ({
      "Оператор": data.operator.full_name,
      "Должность": data.operator.position || "-",
      "График": data.operator.work_schedules?.name || "-",
      "Рабочих дней": data.workingDays,
      "Дней с переработкой": data.overtimeDays,
      "Детали переработок": formatOvertimeDetailsForExport(data.overtimeDetails),
      "Итого дней": data.totalDays,
      "Праздников": data.holidaysCount,
      "Сокращённых дней": data.shortenedDaysCount,
      "Отсутствий": data.absenceDays,
      "Плановые часы": data.plannedHours.toFixed(1),
      "Переработка (ч)": data.overtimeHours.toFixed(1),
      "Фактические часы": data.actualHours.toFixed(1),
      "Сокращение (праздники)": data.holidaysReduction.toFixed(1),
      "Сокращение (короткие дни)": data.shortenedDaysReduction.toFixed(1),
      "Общее сокращение": (data.holidaysReduction + data.shortenedDaysReduction).toFixed(1),
    }));

    // Add totals row
    exportData.push({
      "Оператор": "ИТОГО",
      "Должность": "",
      "График": "",
      "Рабочих дней": totals.workingDays,
      "Дней с переработкой": totals.overtimeDays,
      "Детали переработок": "",
      "Итого дней": totals.totalDays,
      "Праздников": operatorHoursData.reduce((sum, d) => sum + d.holidaysCount, 0),
      "Сокращённых дней": operatorHoursData.reduce((sum, d) => sum + d.shortenedDaysCount, 0),
      "Отсутствий": operatorHoursData.reduce((sum, d) => sum + d.absenceDays, 0),
      "Плановые часы": totals.plannedHours.toFixed(1),
      "Переработка (ч)": totals.overtimeHours.toFixed(1),
      "Фактические часы": totals.actualHours.toFixed(1),
      "Сокращение (праздники)": totals.holidaysReduction.toFixed(1),
      "Сокращение (короткие дни)": totals.shortenedDaysReduction.toFixed(1),
      "Общее сокращение": totals.totalReduction.toFixed(1),
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    ws["!cols"] = [
      { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 50 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, 
      { wch: 18 }, { wch: 20 }, { wch: 16 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Часы работы");
    
    const periodLabel = periodType === "month" 
      ? format(dateRange.start, "MMMM yyyy", { locale: ru })
      : periodType === "quarter"
        ? `Q${parseInt(selectedQuarter) + 1} ${selectedYear}`
        : selectedYear;
    
    XLSX.writeFile(wb, `Отчёт_часы_работы_${periodLabel}.xlsx`);
  };

  const getPeriodLabel = () => {
    if (periodType === "month") {
      return format(dateRange.start, "LLLL yyyy", { locale: ru });
    }
    if (periodType === "quarter") {
      return `${parseInt(selectedQuarter) + 1} квартал ${selectedYear}`;
    }
    return `${selectedYear} год`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Отчёт по часам работы операторов</span>
            <span className="sm:hidden">Часы работы</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Период</Label>
              <Select value={periodType} onValueChange={(v: PeriodType) => setPeriodType(v)}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="quarter">Квартал</SelectItem>
                  <SelectItem value="year">Год</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Год</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[100px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodType === "month" && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Месяц</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {format(new Date(2024, i), "LLLL", { locale: ru })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === "quarter" && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Квартал</Label>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="w-full sm:w-[120px] h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">1 квартал</SelectItem>
                    <SelectItem value="1">2 квартал</SelectItem>
                    <SelectItem value="2">3 квартал</SelectItem>
                    <SelectItem value="3">4 квартал</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">График</Label>
              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все графики</SelectItem>
                  {uniqueSchedules.map(schedule => (
                    <SelectItem key={schedule} value={schedule}>{schedule}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={handleExport} className="h-8 sm:h-9 text-xs sm:text-sm col-span-2 sm:col-span-1">
              <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Экспорт</span>
              <span className="sm:hidden">Excel</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Операторов</span>
              <span className="sm:hidden">Опер.</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1">{operatorHoursData.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Плановые часы</span>
              <span className="sm:hidden">План</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1">{totals.plannedHours.toFixed(0)}ч</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Фактические часы</span>
              <span className="sm:hidden">Факт</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-primary">{totals.actualHours.toFixed(0)}ч</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Сокращение</span>
              <span className="sm:hidden">Сокр.</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              -{totals.totalReduction.toFixed(0)}ч
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">
              Праздники: -{totals.holidaysReduction.toFixed(0)}ч | Сокращ. дни: -{totals.shortenedDaysReduction.toFixed(0)}ч
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{getPeriodLabel()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Оператор</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>График</TableHead>
                  <TableHead className="text-center">Раб. дней</TableHead>
                  <TableHead className="text-center">Дней с перераб.</TableHead>
                  <TableHead className="text-center">Итого дней</TableHead>
                  <TableHead className="text-center">Праздников</TableHead>
                  <TableHead className="text-center">Сокращ. дней</TableHead>
                  <TableHead className="text-center">Отсутствий</TableHead>
                  <TableHead className="text-right">Плановые</TableHead>
                  <TableHead className="text-right">Переработка</TableHead>
                  <TableHead className="text-right">Фактические</TableHead>
                  <TableHead className="text-right">Сокращение</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operatorHoursData.map(data => {
                  const totalReduction = data.holidaysReduction + data.shortenedDaysReduction;
                  return (
                    <TableRow key={data.operator.id}>
                      <TableCell className="font-medium">{data.operator.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {data.operator.position || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {data.operator.work_schedules?.name || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{data.workingDays}</TableCell>
                      <TableCell className="text-center">
                        {data.overtimeDays > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="secondary" 
                                  className="bg-purple-500/10 text-purple-700 dark:text-purple-400 cursor-help"
                                >
                                  {data.overtimeDays}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium mb-1">Дни с переработкой:</p>
                                  {data.overtimeDetails.map((detail, idx) => (
                                    <div key={idx} className="flex justify-between gap-3">
                                      <span>
                                        {format(new Date(detail.date), "dd.MM (EE)", { locale: ru })}
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        <span className="font-medium">{detail.hours.toFixed(1)}ч</span>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "text-[10px] px-1 py-0",
                                            detail.isWorkingDay 
                                              ? "border-blue-500/30 text-blue-600 dark:text-blue-400" 
                                              : "border-orange-500/30 text-orange-600 dark:text-orange-400"
                                          )}
                                        >
                                          {detail.isWorkingDay ? "раб." : "вых."}
                                        </Badge>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">{data.totalDays}</TableCell>
                      <TableCell className="text-center">
                        {data.holidaysCount > 0 ? (
                          <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400">
                            {data.holidaysCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {data.shortenedDaysCount > 0 ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            {data.shortenedDaysCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {data.absenceDays > 0 ? (
                          <Badge variant="secondary">{data.absenceDays}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{data.plannedHours.toFixed(1)}ч</TableCell>
                      <TableCell className="text-right">
                        {data.overtimeHours > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            +{data.overtimeHours.toFixed(1)}ч
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{data.actualHours.toFixed(1)}ч</TableCell>
                      <TableCell className="text-right">
                        {totalReduction > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            -{totalReduction.toFixed(1)}ч
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>ИТОГО</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center">{totals.workingDays}</TableCell>
                  <TableCell className="text-center">{totals.overtimeDays}</TableCell>
                  <TableCell className="text-center">{totals.totalDays}</TableCell>
                  <TableCell className="text-center">
                    {operatorHoursData.reduce((sum, d) => sum + d.holidaysCount, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {operatorHoursData.reduce((sum, d) => sum + d.shortenedDaysCount, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {operatorHoursData.reduce((sum, d) => sum + d.absenceDays, 0)}
                  </TableCell>
                  <TableCell className="text-right">{totals.plannedHours.toFixed(1)}ч</TableCell>
                  <TableCell className="text-right text-purple-600 dark:text-purple-400">
                    +{totals.overtimeHours.toFixed(1)}ч
                  </TableCell>
                  <TableCell className="text-right">{totals.actualHours.toFixed(1)}ч</TableCell>
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">
                    -{totals.totalReduction.toFixed(1)}ч
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
