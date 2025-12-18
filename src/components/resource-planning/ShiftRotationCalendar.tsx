import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { format, addDays, differenceInWeeks, differenceInDays, isToday, getDay, isSameMonth, startOfWeek, startOfMonth, getDaysInMonth, addMonths, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { RefreshCw, User, Pencil, Calendar, FileDown, Printer, Filter, ChevronDown, ChevronRight, Clock, ChevronsUpDown, ChevronsDownUp, CalendarDays, ChevronLeft, ChevronRightIcon, Phone, Mail, Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// Operator info card component for hover
const OperatorInfoCard = ({ operator }: { operator: any }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-semibold">{operator.full_name}</p>
        <p className="text-xs text-muted-foreground">{operator.code}</p>
      </div>
    </div>
    
    <div className="space-y-2 text-sm">
      {operator.position && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{operator.position}</span>
        </div>
      )}
      
      {operator.work_schedules?.name && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{operator.work_schedules.name}</span>
        </div>
      )}
      
      {operator.default_work_center?.name && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>{operator.default_work_center.name}</span>
        </div>
      )}
      
      {operator.phone && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span>{operator.phone}</span>
        </div>
      )}
      
      {operator.email && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>{operator.email}</span>
        </div>
      )}
    </div>
    
    <div className="flex flex-wrap gap-1.5 pt-1">
      {operator.employee_type && (
        <Badge variant="secondary" className="text-xs">
          {operator.employee_type === 'станочник' ? 'Станочник' :
           operator.employee_type === 'сборщик' ? 'Сборщик' :
           operator.employee_type === 'сварщик' ? 'Сварщик' :
           operator.employee_type === 'маляр' ? 'Маляр' :
           operator.employee_type === 'универсал' ? 'Универсал' : operator.employee_type}
        </Badge>
      )}
      {operator.shift_rotation_enabled && (
        <Badge variant="outline" className="text-xs gap-1">
          <RefreshCw className="h-3 w-3" />
          Ротация
        </Badge>
      )}
      {operator.assigned_shift_number && (
        <Badge variant="outline" className="text-xs">
          Смена {operator.assigned_shift_number}
        </Badge>
      )}
    </div>
  </div>
);

interface ShiftRotationCalendarProps {
  operators: any[];
  onEditOperator?: (operator: any) => void;
}

type PeriodType = "7" | "14" | "30" | "month" | "year" | "custom";

// Check if date is a working day based on schedule type
const isWorkingDay = (schedule: any, date: Date, operator: any): boolean => {
  const scheduleType = schedule?.schedule_type;
  const cycleDaysOn = schedule?.cycle_days_on || 5;
  const cycleDaysOff = schedule?.cycle_days_off || 2;
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
  
  // For weekly or shift schedules with 5/2 pattern - standard work week (Mon-Fri work, Sat-Sun off)
  // This applies when: schedule_type is 'weekly', 'shift', '5/2', or when cycle is 5 on / 2 off
  if (
    scheduleType === 'weekly' || 
    scheduleType === '5/2' || 
    (scheduleType === 'shift' && cycleDaysOn === 5 && cycleDaysOff === 2) ||
    (cycleDaysOn === 5 && cycleDaysOff === 2 && scheduleType !== 'cyclic')
  ) {
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Mon-Fri are working days
  }
  
  // For cyclic schedules (2/2, 3/3, etc.) - calculate based on cycle rotation
  if (scheduleType === 'cyclic') {
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
  
  // Default - check by day of week for any 5/2 pattern
  if (cycleDaysOn === 5 && cycleDaysOff === 2) {
    return dayOfWeek !== 0 && dayOfWeek !== 6;
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
    
    // For 5/2 schedules - rotation happens on Mondays (start of calendar week)
    const cycleDaysOn = schedule?.cycle_days_on || 5;
    const cycleDaysOff = schedule?.cycle_days_off || 2;
    const scheduleType = schedule?.schedule_type;
    
    const is52Schedule = 
      scheduleType === 'weekly' || 
      scheduleType === '5/2' || 
      (cycleDaysOn === 5 && cycleDaysOff === 2);
    
    let weeksDiff: number;
    if (is52Schedule) {
      // Use Monday as start of week for 5/2 schedules
      const startOfCurrentWeek = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      const startOfRotationWeek = startOfWeek(startDate, { weekStartsOn: 1 });
      weeksDiff = differenceInWeeks(startOfCurrentWeek, startOfRotationWeek);
    } else {
      weeksDiff = differenceInWeeks(date, startDate);
    }
    
    const startingShift = operator.assigned_shift_number || 1;
    // Handle negative modulo correctly for dates before rotation start
    const shiftIndex = ((((startingShift - 1 + weeksDiff) % shifts.length) + shifts.length) % shifts.length);
    const currentShiftNumber = shiftIndex + 1;
    return shifts.find((s: any) => s.shift_number === currentShiftNumber);
  }
  
  // Fixed shift
  if (operator.assigned_shift_number) {
    return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number);
  }
  
  return shifts[0];
};

// Get unique shift colors - matching reference styling
const getShiftColor = (shiftName: string, index: number) => {
  const colors = [
    { bg: "bg-amber-200 dark:bg-amber-800/50", text: "text-amber-800 dark:text-amber-200", border: "border-amber-400 dark:border-amber-600" },
    { bg: "bg-green-200 dark:bg-green-800/50", text: "text-green-800 dark:text-green-200", border: "border-green-400 dark:border-green-600" },
    { bg: "bg-purple-200 dark:bg-purple-800/50", text: "text-purple-800 dark:text-purple-200", border: "border-purple-400 dark:border-purple-600" },
    { bg: "bg-blue-200 dark:bg-blue-800/50", text: "text-blue-800 dark:text-blue-200", border: "border-blue-400 dark:border-blue-600" },
  ];
  return colors[index % colors.length];
};

export const ShiftRotationCalendar = ({ operators, onEditOperator }: ShiftRotationCalendarProps) => {
  const [period, setPeriod] = useState<PeriodType>("7");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Enable horizontal scroll with mouse wheel
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle if there's horizontal overflow
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY + e.deltaX;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const toggleGroupCollapse = (scheduleName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleName)) {
        newSet.delete(scheduleName);
      } else {
        newSet.add(scheduleName);
      }
      return newSet;
    });
  };

  const collapseAll = () => {
    const allScheduleNames = Array.from(groupedBySchedule.keys());
    setCollapsedGroups(new Set(allScheduleNames));
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  // Calculate days count based on period type
  const daysCount = useMemo(() => {
    if (period === "month") {
      return getDaysInMonth(startDate);
    }
    if (period === "year") {
      return 365; // For year view we'll show monthly summaries instead
    }
    if (period === "custom" && endDate) {
      return Math.max(1, differenceInDays(endDate, startDate) + 1);
    }
    return parseInt(period) || 7;
  }, [period, startDate, endDate]);

  // Calculate group total hours
  const calculateGroupTotalHours = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      days.forEach(day => {
        const shift = getShiftForDate(operator, day);
        if (shift) {
          const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
          totalMinutes += netMinutes;
        }
      });
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };
  
  // Generate days based on selected period and start date
  const days = useMemo(() => {
    const result = [];
    let effectiveStartDate = startDate;
    let count = daysCount;
    
    // For month view - always start from 1st of the month
    if (period === "month") {
      effectiveStartDate = startOfMonth(startDate);
    }
    
    // For year view - show all days of the year but we'll display monthly summaries
    if (period === "year") {
      effectiveStartDate = new Date(startDate.getFullYear(), 0, 1); // Jan 1st
      count = 365 + (new Date(startDate.getFullYear(), 1, 29).getDate() === 29 ? 1 : 0); // Account for leap year
    }
    
    for (let i = 0; i < count; i++) {
      result.push(addDays(effectiveStartDate, i));
    }
    return result;
  }, [daysCount, startDate, period]);

  // Generate months for year view
  const months = useMemo(() => {
    if (period !== "year") return [];
    const year = startDate.getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [period, startDate]);

  // Calculate hours for a specific month
  const calculateMonthHours = (operator: any, month: Date): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    const monthStart = startOfMonth(month);
    const daysInMonth = getDaysInMonth(month);
    
    for (let i = 0; i < daysInMonth; i++) {
      const day = addDays(monthStart, i);
      const shift = getShiftForDate(operator, day);
      if (shift) {
        const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
        totalMinutes += netMinutes;
      }
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Navigation functions
  const goToToday = () => {
    setStartDate(new Date());
    if (period === "custom") setEndDate(addDays(new Date(), 6));
  };
  const goToStartOfMonth = () => {
    setStartDate(startOfMonth(new Date()));
    if (period === "custom") setEndDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  };
  const goToStartOfWeek = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    if (period === "custom") setEndDate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
  };
  const goToStartOfYear = () => {
    setStartDate(new Date(new Date().getFullYear(), 0, 1));
  };
  
  const goToPreviousPeriod = () => {
    if (period === "month") {
      setStartDate(subMonths(startDate, 1));
    } else if (period === "year") {
      setStartDate(new Date(startDate.getFullYear() - 1, 0, 1));
    } else if (period === "custom" && endDate) {
      const range = differenceInDays(endDate, startDate);
      setStartDate(addDays(startDate, -(range + 1)));
      setEndDate(addDays(endDate, -(range + 1)));
    } else {
      setStartDate(addDays(startDate, -daysCount));
    }
  };
  
  const goToNextPeriod = () => {
    if (period === "month") {
      setStartDate(addMonths(startDate, 1));
    } else if (period === "year") {
      setStartDate(new Date(startDate.getFullYear() + 1, 0, 1));
    } else if (period === "custom" && endDate) {
      const range = differenceInDays(endDate, startDate);
      setStartDate(addDays(startDate, range + 1));
      setEndDate(addDays(endDate, range + 1));
    } else {
      setStartDate(addDays(startDate, daysCount));
    }
  };

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === "custom" && !endDate) {
      setEndDate(addDays(startDate, 6));
    }
    if (newPeriod === "year") {
      setStartDate(new Date(new Date().getFullYear(), 0, 1));
    }
  };


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

  // Dynamic grid style based on period - includes total column
  const gridStyle = useMemo(() => {
    if (period === "year") {
      return {
        gridTemplateColumns: `200px repeat(12, minmax(70px, 1fr)) 80px`
      };
    }
    return {
      gridTemplateColumns: `200px repeat(${daysCount}, minmax(${daysCount > 14 ? '55px' : '85px'}, 1fr)) 70px`
    };
  }, [period, daysCount]);

  // Calculate yearly total for an operator
  const calculateYearlyTotal = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    months.forEach(month => {
      const monthHours = calculateMonthHours(operator, month);
      totalMinutes += monthHours.hours * 60 + monthHours.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate group yearly total
  const calculateGroupYearlyTotal = (ops: any[]): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    ops.forEach(operator => {
      const yearlyTotal = calculateYearlyTotal(operator);
      totalMinutes += yearlyTotal.hours * 60 + yearlyTotal.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Calculate total working hours for an operator over the period
  const calculateTotalHours = (operator: any): { hours: number; minutes: number } => {
    let totalMinutes = 0;
    days.forEach(day => {
      const shift = getShiftForDate(operator, day);
      if (shift) {
        const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
        totalMinutes += netMinutes;
      }
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Export to Excel with group totals and grand total
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Prepare data for export
    const exportData: any[] = [];
    
    // Header row with dates and total column
    const headerRow = ['Сотрудник', 'График', ...days.map(day => format(day, 'dd.MM.yyyy')), 'Итого'];
    exportData.push(headerRow);
    
    let grandTotalMinutes = 0;

    // Data rows grouped by schedule
    Array.from(groupedBySchedule.entries()).forEach(([scheduleName, ops]) => {
      // Group header
      exportData.push([`--- ${scheduleName} (${ops.length}) ---`]);
      
      let groupTotalMinutes = 0;

      ops.forEach(operator => {
        let operatorTotalMinutes = 0;
        const dayValues = days.map(day => {
          const shift = getShiftForDate(operator, day);
          if (shift) {
            const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
            operatorTotalMinutes += netMinutes;
            const hours = Math.floor(netMinutes / 60);
            const mins = netMinutes % 60;
            return `${shift.shift_name} (${hours}ч${mins > 0 ? ` ${mins}м` : ''})`;
          }
          return 'Выходной';
        });

        const totalHours = Math.floor(operatorTotalMinutes / 60);
        const totalMins = operatorTotalMinutes % 60;
        groupTotalMinutes += operatorTotalMinutes;

        const row = [
          operator.full_name,
          operator.work_schedules?.name || 'Без графика',
          ...dayValues,
          `${totalHours}ч${totalMins > 0 ? ` ${totalMins}м` : ''}`
        ];
        exportData.push(row);
      });

      // Group total row
      const groupHours = Math.floor(groupTotalMinutes / 60);
      const groupMins = groupTotalMinutes % 60;
      grandTotalMinutes += groupTotalMinutes;
      
      const groupTotalRow = [
        `Итого по группе "${scheduleName}":`,
        '',
        ...days.map(() => ''),
        `${groupHours}ч${groupMins > 0 ? ` ${groupMins}м` : ''}`
      ];
      exportData.push(groupTotalRow);
      exportData.push([]); // Empty row for spacing
    });

    // Grand total row
    const grandHours = Math.floor(grandTotalMinutes / 60);
    const grandMins = grandTotalMinutes % 60;
    exportData.push([]);
    exportData.push([
      'ОБЩИЙ ИТОГ:',
      '',
      ...days.map(() => ''),
      `${grandHours}ч${grandMins > 0 ? ` ${grandMins}м` : ''}`
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Сотрудник
      { wch: 25 }, // График
      ...days.map(() => ({ wch: 18 })), // Даты
      { wch: 12 } // Итого
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              График ротации смен
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                <FileDown className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Печать
              </Button>
            </div>
          </div>
          
          {/* Date navigation row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <CalendarDays className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="sm" onClick={goToPreviousPeriod} title="Предыдущий период">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToNextPeriod} title="Следующий период">
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick presets */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
                Сегодня
              </Button>
              <Button variant="outline" size="sm" onClick={goToStartOfWeek} className="text-xs">
                С начала недели
              </Button>
              <Button variant="outline" size="sm" onClick={goToStartOfMonth} className="text-xs">
                С начала месяца
              </Button>
              {period === "year" && (
                <Button variant="outline" size="sm" onClick={goToStartOfYear} className="text-xs">
                  Текущий год
                </Button>
              )}
            </div>

            {/* Date pickers - different UI for custom range */}
            {period === "custom" ? (
              <div className="flex items-center gap-1">
                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(startDate, "d MMM yyyy", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(date);
                          if (endDate && date > endDate) {
                            setEndDate(addDays(date, 7));
                          }
                          setIsStartDatePickerOpen(false);
                        }
                      }}
                      locale={ru}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">—</span>
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      {endDate ? format(endDate, "d MMM yyyy", { locale: ru }) : "Выберите"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(date);
                          setIsEndDatePickerOpen(false);
                        }
                      }}
                      disabled={(date) => date < startDate}
                      locale={ru}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : period === "year" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{startDate.getFullYear()} год</span>
              </div>
            ) : (
              <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(days[0], "d MMM", { locale: ru })} — {format(days[days.length - 1], "d MMM yyyy", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        setIsStartDatePickerOpen(false);
                      }
                    }}
                    locale={ru}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}

            <div className="border-l h-6 mx-1" />

            {/* Schedule filter */}
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

            {/* Collapse/Expand buttons */}
            <div className="flex items-center gap-1 border-l pl-2 ml-1">
              <Button variant="ghost" size="sm" onClick={expandAll} title="Развернуть все">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} title="Свернуть все">
                <ChevronsDownUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Shift legend */}
            <div className="flex gap-2 border-l pl-3 ml-1">
              {Array.from(shiftColorMap.entries()).map(([name, colors]) => (
                <Badge key={name} variant="outline" className={cn(colors.bg, colors.text, colors.border)}>
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div ref={printRef} className="p-6" style={{ minWidth: period === "year" ? "1200px" : daysCount > 14 ? `${270 + daysCount * 55}px` : `${270 + daysCount * 85}px` }}>
            {/* Operators grouped by schedule */}
            {Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
              const isCollapsed = collapsedGroups.has(scheduleName);
              return (
              <div key={scheduleName} className="mb-6">
                {/* Group name - clickable to collapse */}
                <button 
                  className="w-full text-left text-sm font-medium text-muted-foreground mb-2 px-2 py-1.5 bg-muted/50 rounded hover:bg-muted/70 transition-colors flex items-center gap-2"
                  onClick={() => toggleGroupCollapse(scheduleName)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                  {scheduleName} ({ops.length})
                </button>

                {!isCollapsed && period === "year" ? (
                  <>
                    {/* Year view - monthly summary header */}
                    <div className="grid gap-1 mb-2 sticky top-0 z-20 bg-background py-1" style={gridStyle}>
                      <div className="text-sm font-medium text-muted-foreground px-2 sticky left-0 z-10 bg-background min-w-[200px]">Сотрудник</div>
                      {months.map((month) => (
                        <div 
                          key={month.toISOString()} 
                          className="text-center text-sm p-1 rounded-md text-muted-foreground"
                        >
                          <div className="font-medium text-xs">
                            {format(month, "LLL", { locale: ru })}
                          </div>
                        </div>
                      ))}
                      <div className="text-center text-sm p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                        <Clock className="h-3 w-3 mx-auto mb-0.5" />
                        <div className="text-[10px]">Год</div>
                      </div>
                    </div>
                    
                    {ops.map((operator) => {
                      const yearlyTotal = calculateYearlyTotal(operator);
                      return (
                        <div 
                          key={operator.id} 
                          className={cn(
                            "grid gap-1 py-1 rounded group",
                            onEditOperator && "hover:bg-muted/50 cursor-pointer"
                          )}
                          style={gridStyle}
                          onClick={() => onEditOperator?.(operator)}
                        >
                          <HoverCard openDelay={300}>
                            <HoverCardTrigger asChild>
                              <div className="px-2 flex items-center gap-2 sticky left-0 z-10 bg-background min-w-[200px]">
                                <span className="text-sm font-medium truncate flex-1 cursor-default" onClick={(e) => e.stopPropagation()}>
                                  {operator.full_name}
                                </span>
                                {operator.shift_rotation_enabled && (
                                  <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80" side="right" align="start">
                              <OperatorInfoCard operator={operator} />
                            </HoverCardContent>
                          </HoverCard>
                          
                          {months.map((month) => {
                            const monthHours = calculateMonthHours(operator, month);
                            return (
                              <div 
                                key={month.toISOString()} 
                                className="text-center p-1.5 rounded-md text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              >
                                <div className="font-medium">{monthHours.hours}ч</div>
                                {monthHours.minutes > 0 && (
                                  <div className="text-[10px] opacity-80">{monthHours.minutes}м</div>
                                )}
                              </div>
                            );
                          })}

                          <div className="text-center p-1.5 rounded-md text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                            <div>{yearlyTotal.hours}ч</div>
                            {yearlyTotal.minutes > 0 && (
                              <div className="text-[10px] opacity-80">{yearlyTotal.minutes}м</div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Group summary row for year view */}
                    {(() => {
                      const groupYearlyTotal = calculateGroupYearlyTotal(ops);
                      return (
                        <div 
                          className="grid gap-1 py-2 mt-2 border-t border-dashed"
                          style={gridStyle}
                        >
                          <div className="px-2 text-sm font-medium text-muted-foreground sticky left-0 z-10 bg-background min-w-[200px]">
                            Итого по группе:
                          </div>
                          {months.map((month) => {
                            let monthTotal = 0;
                            ops.forEach(op => {
                              const mh = calculateMonthHours(op, month);
                              monthTotal += mh.hours * 60 + mh.minutes;
                            });
                            const h = Math.floor(monthTotal / 60);
                            const m = monthTotal % 60;
                            return (
                              <div key={month.toISOString()} className="text-center text-xs text-muted-foreground">
                                {h}ч{m > 0 ? ` ${m}м` : ''}
                              </div>
                            );
                          })}
                          <div className="text-center p-1.5 rounded-md text-xs bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 font-bold">
                            <div>{groupYearlyTotal.hours}ч</div>
                            {groupYearlyTotal.minutes > 0 && (
                              <div className="text-[10px]">{groupYearlyTotal.minutes}м</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : !isCollapsed && (
                  <>
                    {/* Regular day view - Header row with days for each group - sticky */}
                    <div className="grid gap-1 mb-2 sticky top-0 z-20 bg-background py-1" style={gridStyle}>
                      <div className="text-sm font-medium text-muted-foreground px-2 sticky left-0 z-10 bg-background min-w-[200px]">Сотрудник</div>
                      {days.map((day, idx) => {
                        const showMonth = idx === 0 || !isSameMonth(day, days[idx - 1]);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={cn(
                              "text-center text-sm p-1 rounded-md",
                              isToday(day) ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground",
                              isWeekend && !isToday(day) && "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            )}
                          >
                            <div className="font-medium text-xs">
                              {format(day, "EEE", { locale: ru })}
                            </div>
                            <div className="text-xs">
                              {daysCount > 14 
                                ? format(day, "d", { locale: ru })
                                : format(day, "d MMM", { locale: ru })
                              }
                            </div>
                            {showMonth && daysCount > 14 && (
                              <div className="text-[9px] opacity-70">
                                {format(day, "MMM", { locale: ru })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Total hours header */}
                      <div className="text-center text-sm p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                        <Clock className="h-3 w-3 mx-auto mb-0.5" />
                        <div className="text-[10px]">Итого</div>
                      </div>
                    </div>
                    
                    {ops.map((operator) => {
                      const totalHours = calculateTotalHours(operator);
                      return (
                        <div 
                          key={operator.id} 
                          className={cn(
                            "grid gap-1 py-1 rounded group",
                            onEditOperator && "hover:bg-muted/50 cursor-pointer"
                          )}
                          style={gridStyle}
                          onClick={() => onEditOperator?.(operator)}
                        >
                          <HoverCard openDelay={300}>
                            <HoverCardTrigger asChild>
                              <div className="px-2 flex items-center gap-2 sticky left-0 z-10 bg-background min-w-[200px]">
                                <span className="text-sm font-medium truncate flex-1 cursor-default" onClick={(e) => e.stopPropagation()}>
                                  {operator.full_name}
                                </span>
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
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80" side="right" align="start">
                              <OperatorInfoCard operator={operator} />
                            </HoverCardContent>
                          </HoverCard>
                          
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
                                  "text-center p-1.5 rounded-md text-xs transition-colors",
                                  colors 
                                    ? cn(colors.bg, colors.text, "border", colors.border) 
                                    : isWeekend 
                                      ? "bg-rose-50 dark:bg-rose-900/20" 
                                      : "bg-muted/20",
                                  isToday(day) && "ring-2 ring-primary/30"
                                )}
                              >
                                {shift ? (
                                  <>
                                    <div className="font-medium truncate text-[11px]" title={shift.shift_name}>
                                      {daysCount > 14 ? shift.shift_name.charAt(0) : shift.shift_name}
                                    </div>
                                    {daysCount <= 14 && (
                                      <div className="text-[10px] opacity-80">
                                        {mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className={cn(
                                    "text-sm",
                                    isWeekend ? "text-rose-400 dark:text-rose-500" : "text-muted-foreground"
                                  )}>—</span>
                                )}
                              </div>
                            );
                          })}

                          {/* Total hours cell */}
                          <div className="text-center p-1.5 rounded-md text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                            <div>{totalHours.hours}ч</div>
                            {totalHours.minutes > 0 && (
                              <div className="text-[10px] opacity-80">{totalHours.minutes}м</div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Group summary row */}
                    {(() => {
                      const groupTotal = calculateGroupTotalHours(ops);
                      return (
                        <div 
                          className="grid gap-1 py-2 mt-2 border-t border-dashed"
                          style={gridStyle}
                        >
                          <div className="px-2 text-sm font-medium text-muted-foreground sticky left-0 z-10 bg-background min-w-[200px]">
                            Итого по группе:
                          </div>
                          {days.map((day) => (
                            <div key={day.toISOString()} className="text-center text-xs text-muted-foreground">
                              —
                            </div>
                          ))}
                          <div className="text-center p-1.5 rounded-md text-xs bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 font-bold">
                            <div>{groupTotal.hours}ч</div>
                            {groupTotal.minutes > 0 && (
                              <div className="text-[10px]">{groupTotal.minutes}м</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            );
            })}

            {/* Grand total */}
            {filteredOperators.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-primary/20">
                <div 
                  className="grid gap-1 py-2 bg-primary/5 rounded-lg"
                  style={gridStyle}
                >
                  <div className="px-2 text-sm font-bold flex items-center gap-2 sticky left-0 z-10 bg-primary/5 min-w-[200px]">
                    <Clock className="h-4 w-4" />
                    ОБЩИЙ ИТОГ:
                  </div>
                  {period === "year" ? (
                    <>
                      {months.map((month) => {
                        let monthTotal = 0;
                        filteredOperators.forEach(op => {
                          const mh = calculateMonthHours(op, month);
                          monthTotal += mh.hours * 60 + mh.minutes;
                        });
                        const h = Math.floor(monthTotal / 60);
                        const m = monthTotal % 60;
                        return (
                          <div key={month.toISOString()} className="text-center text-xs font-medium">
                            {h}ч{m > 0 ? ` ${m}м` : ''}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    days.map((day) => (
                      <div key={day.toISOString()} className="text-center text-xs text-muted-foreground">
                        —
                      </div>
                    ))
                  )}
                  {(() => {
                    const grandTotal = period === "year" 
                      ? calculateGroupYearlyTotal(filteredOperators)
                      : calculateGroupTotalHours(filteredOperators);
                    return (
                      <div className="text-center p-2 rounded-md text-sm bg-primary text-primary-foreground font-bold">
                        <div>{grandTotal.hours}ч</div>
                        {grandTotal.minutes > 0 && (
                          <div className="text-xs opacity-80">{grandTotal.minutes}м</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
