import { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, differenceInWeeks, differenceInDays, isToday, getDay, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { RefreshCw, User, Pencil, Calendar, FileDown, Printer, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ShiftRotationCalendarProps {
  operators: any[];
  onEditOperator?: (operator: any) => void;
}

type PeriodType = "7" | "14" | "30";

// Check if date is a working day based on schedule type
const isWorkingDay = (schedule: any, date: Date, operator: any): boolean => {
  const scheduleType = schedule?.schedule_type;
  const cycleDaysOn = schedule?.cycle_days_on || 5;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  
  // For 5/2 schedule - standard work week (Mon-Fri work, Sat-Sun off)
  if (scheduleType === '5/2') {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }
  
  // For cyclic schedules (2/2, 3/3, etc.) - calculate based on cycle
  if (scheduleType === 'cyclic' || (cycleDaysOn > 0 && cycleDaysOff > 0 && scheduleType !== '5/2')) {
    const cycleLength = cycleDaysOn + cycleDaysOff;
    const startDate = operator.shift_rotation_start_date 
      ? new Date(operator.shift_rotation_start_date) 
      : operator.hire_date 
        ? new Date(operator.hire_date) 
        : new Date();
    
    const daysDiff = differenceInDays(date, startDate);
    const dayInCycle = ((daysDiff % cycleLength) + cycleLength) % cycleLength;
    
    return dayInCycle < cycleDaysOn;
  }
  
  // Default - always working
  return true;
};

// Calculate shift for a given operator on a specific date
const getShiftForDate = (operator: any, date: Date) => {
  const schedule = operator.work_schedules;
  const shifts = schedule?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return null;
  
  // Check if this is a working day first
  if (!isWorkingDay(schedule, date, operator)) {
    return null; // Day off
  }
  
  // If only one shift - always use it
  if (shifts.length === 1) {
    return shifts[0];
  }
  
  // If rotation enabled
  if (operator.shift_rotation_enabled && shifts.length >= 2) {
    const startDate = operator.shift_rotation_start_date 
      ? new Date(operator.shift_rotation_start_date) 
      : new Date();
    const weeksDiff = differenceInWeeks(date, startDate);
    const startingShift = operator.assigned_shift_number || 1;
    const currentShiftNumber = ((startingShift - 1 + weeksDiff) % shifts.length) + 1;
    return shifts.find((s: any) => s.shift_number === currentShiftNumber);
  }
  
  // Fixed shift
  if (operator.assigned_shift_number) {
    return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number);
  }
  
  return shifts[0];
};

// Get unique shift colors
const getShiftColor = (shiftName: string, index: number) => {
  const colors = [
    { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-700" },
    { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-700" },
    { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-700" },
    { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-700" },
  ];
  return colors[index % colors.length];
};

export const ShiftRotationCalendar = ({ operators, onEditOperator }: ShiftRotationCalendarProps) => {
  const [period, setPeriod] = useState<PeriodType>("7");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);
  const daysCount = parseInt(period);
  
  // Generate days based on selected period
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < daysCount; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, [daysCount]);

  // Get all unique shift names for color mapping
  const shiftColorMap = useMemo(() => {
    const shiftNames = new Set<string>();
    operators.forEach(op => {
      const shifts = op.work_schedules?.work_schedule_shifts;
      shifts?.forEach((s: any) => shiftNames.add(s.shift_name));
    });
    const map = new Map<string, ReturnType<typeof getShiftColor>>();
    Array.from(shiftNames).forEach((name, index) => {
      map.set(name, getShiftColor(name, index));
    });
    return map;
  }, [operators]);

  // Only show operators with schedules
  const operatorsWithSchedules = operators.filter(op => 
    op.is_active && op.work_schedules?.work_schedule_shifts?.length > 0
  );

  // Get unique schedule names for filter
  const uniqueSchedules = useMemo(() => {
    const schedules = new Set<string>();
    operatorsWithSchedules.forEach(op => {
      if (op.work_schedules?.name) {
        schedules.add(op.work_schedules.name);
      }
    });
    return Array.from(schedules).sort();
  }, [operatorsWithSchedules]);

  // Filter operators by selected schedule
  const filteredOperators = useMemo(() => {
    if (scheduleFilter === "all") return operatorsWithSchedules;
    return operatorsWithSchedules.filter(op => op.work_schedules?.name === scheduleFilter);
  }, [operatorsWithSchedules, scheduleFilter]);

  // Group operators by their current shift pattern
  const groupedBySchedule = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    filteredOperators.forEach(op => {
      const scheduleName = op.work_schedules?.name || "Без графика";
      if (!groups.has(scheduleName)) {
        groups.set(scheduleName, []);
      }
      groups.get(scheduleName)!.push(op);
    });
    
    return groups;
  }, [filteredOperators]);

  // Dynamic grid style based on period
  const gridStyle = {
    gridTemplateColumns: `200px repeat(${daysCount}, minmax(${daysCount > 14 ? '50px' : '80px'}, 1fr))`
  };

  // Export to Excel
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Prepare data for export
    const exportData: any[] = [];
    
    // Header row with dates
    const headerRow = ['Сотрудник', 'График', ...days.map(day => format(day, 'dd.MM.yyyy'))];
    exportData.push(headerRow);
    
    // Data rows
    filteredOperators.forEach(operator => {
      const row = [
        operator.full_name,
        operator.work_schedules?.name || 'Без графика',
        ...days.map(day => {
          const shift = getShiftForDate(operator, day);
          if (shift) {
            const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
            const hours = Math.floor(netMinutes / 60);
            const mins = netMinutes % 60;
            return `${shift.shift_name} (${hours}ч${mins > 0 ? ` ${mins}м` : ''})`;
          }
          return 'Выходной';
        })
      ];
      exportData.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Сотрудник
      { wch: 20 }, // График
      ...days.map(() => ({ wch: 18 })) // Даты
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'График ротации');
    
    const startDate = format(days[0], 'dd.MM.yyyy');
    const endDate = format(days[days.length - 1], 'dd.MM.yyyy');
    XLSX.writeFile(wb, `График_ротации_${startDate}-${endDate}.xlsx`);
  };

  // Print handler
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const startDate = format(days[0], 'dd.MM.yyyy');
    const endDate = format(days[days.length - 1], 'dd.MM.yyyy');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>График ротации смен ${startDate} - ${endDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: 600; }
          td:first-child { text-align: left; font-weight: 500; }
          .group-header { background: #eee; font-weight: 600; text-align: left; }
          .day-off { color: #999; }
          .shift-1 { background: #dbeafe; }
          .shift-2 { background: #fef3c7; }
          .shift-3 { background: #d1fae5; }
          .shift-4 { background: #ede9fe; }
          .today { background: #fef08a !important; font-weight: bold; }
          .weekend { background: #f3f4f6; }
          .legend { margin-bottom: 15px; display: flex; gap: 15px; flex-wrap: wrap; }
          .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; }
          .legend-color { width: 16px; height: 16px; border-radius: 3px; border: 1px solid #ccc; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>График ротации смен</h1>
        <h2>Период: ${startDate} — ${endDate}${scheduleFilter !== 'all' ? ` | График: ${scheduleFilter}` : ''}</h2>
        
        <div class="legend">
          ${Array.from(shiftColorMap.entries()).map(([name], idx) => `
            <div class="legend-item">
              <div class="legend-color shift-${(idx % 4) + 1}"></div>
              <span>${name}</span>
            </div>
          `).join('')}
          <div class="legend-item">
            <div class="legend-color" style="background: #f3f4f6;"></div>
            <span>Выходной</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: left; min-width: 150px;">Сотрудник</th>
              ${days.map(day => `
                <th class="${isToday(day) ? 'today' : ''} ${getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : ''}">
                  ${format(day, 'EEE', { locale: ru })}<br/>
                  ${format(day, 'd.MM')}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => `
              <tr>
                <td colspan="${days.length + 1}" class="group-header">${scheduleName} (${ops.length})</td>
              </tr>
              ${ops.map(operator => {
                const shiftNameToIndex = new Map<string, number>();
                Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
                
                return `
                  <tr>
                    <td>${operator.full_name}</td>
                    ${days.map(day => {
                      const shift = getShiftForDate(operator, day);
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
                      const netMinutes = shift?.net_work_minutes ?? (shift?.gross_work_minutes - shift?.break_minutes);
                      const hours = Math.floor(netMinutes / 60);
                      const mins = netMinutes % 60;
                      
                      return `
                        <td class="${isToday(day) ? 'today' : ''} ${shift ? `shift-${shiftIdx}` : isWeekend ? 'weekend' : 'day-off'}">
                          ${shift ? `${shift.shift_name.split(' ')[0]}<br/>${hours}ч${mins > 0 ? ` ${mins}м` : ''}` : '—'}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            `).join('')}
          </tbody>
        </table>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (operatorsWithSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Нет операторов с назначенными графиками</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            График ротации смен
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Все графики" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все графики</SelectItem>
                {uniqueSchedules.map(schedule => (
                  <SelectItem key={schedule} value={schedule}>{schedule}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
                <SelectItem value="30">Месяц</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <FileDown className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
            <div className="flex gap-2">
              {Array.from(shiftColorMap.entries()).map(([name, colors]) => (
                <Badge key={name} variant="outline" className={cn(colors.bg, colors.text, colors.border)}>
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div ref={printRef} style={{ minWidth: daysCount > 14 ? `${200 + daysCount * 55}px` : `${200 + daysCount * 85}px` }}>
            {/* Header with days */}
            <div className="grid gap-1 mb-2" style={gridStyle}>
              <div className="text-sm font-medium text-muted-foreground px-2">Сотрудник</div>
              {days.map((day, idx) => {
                const showMonth = idx === 0 || !isSameMonth(day, days[idx - 1]);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "text-center text-sm p-1 rounded-md",
                      isToday(day) ? "bg-primary/10 font-semibold" : "text-muted-foreground",
                      getDay(day) === 0 || getDay(day) === 6 ? "bg-muted/50" : ""
                    )}
                  >
                    <div className="font-medium text-xs">
                      {format(day, "EEE", { locale: ru })}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isToday(day) ? "text-primary" : ""
                    )}>
                      {daysCount > 14 
                        ? format(day, "d", { locale: ru })
                        : format(day, "d MMM", { locale: ru })
                      }
                    </div>
                    {showMonth && daysCount > 14 && (
                      <div className="text-[9px] text-muted-foreground">
                        {format(day, "MMM", { locale: ru })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Operators grouped by schedule */}
            {Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => (
              <div key={scheduleName} className="mb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2 px-2 py-1 bg-muted/50 rounded">
                  {scheduleName} ({ops.length})
                </div>
                
                {ops.map((operator) => (
                  <div 
                    key={operator.id} 
                    className={cn(
                      "grid gap-1 py-1 rounded group",
                      onEditOperator && "hover:bg-muted/50 cursor-pointer"
                    )}
                    style={gridStyle}
                    onClick={() => onEditOperator?.(operator)}
                  >
                    <div className="px-2 flex items-center gap-2">
                      <span className="text-sm font-medium truncate flex-1">{operator.full_name}</span>
                      {operator.shift_rotation_enabled && (
                        <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      {onEditOperator && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOperator(operator);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {days.map((day) => {
                      const shift = getShiftForDate(operator, day);
                      const colors = shift ? shiftColorMap.get(shift.shift_name) : null;
                      const netMinutes = shift?.net_work_minutes ?? (shift?.gross_work_minutes - shift?.break_minutes);
                      const hours = Math.floor(netMinutes / 60);
                      const mins = netMinutes % 60;
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={cn(
                            "text-center p-1 rounded-md text-xs transition-colors",
                            colors ? cn(colors.bg, colors.text, "border", colors.border) : isWeekend ? "bg-muted/40" : "bg-muted/20",
                            isToday(day) && "ring-2 ring-primary/30"
                          )}
                        >
                          {shift ? (
                            <>
                              <div className="font-medium truncate text-[10px]" title={shift.shift_name}>
                                {daysCount > 14 ? shift.shift_name.charAt(0) : shift.shift_name.split(" ")[0]}
                              </div>
                              {daysCount <= 14 && (
                                <div className="text-[9px] opacity-75">
                                  {mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="opacity-50 text-[10px]">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
