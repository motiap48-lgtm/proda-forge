import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format, addDays, differenceInWeeks, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { RefreshCw, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftRotationCalendarProps {
  operators: any[];
  onEditOperator?: (operator: any) => void;
}

// Calculate shift for a given operator on a specific date
const getShiftForDate = (operator: any, date: Date) => {
  const shifts = operator.work_schedules?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return null;
  
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
  
  return null;
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
  // Generate next 7 days
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

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

  // Group operators by their current shift pattern
  const groupedBySchedule = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    operatorsWithSchedules.forEach(op => {
      const scheduleName = op.work_schedules?.name || "Без графика";
      if (!groups.has(scheduleName)) {
        groups.set(scheduleName, []);
      }
      groups.get(scheduleName)!.push(op);
    });
    
    return groups;
  }, [operatorsWithSchedules]);

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            График ротации смен
          </CardTitle>
          <div className="flex gap-2">
            {Array.from(shiftColorMap.entries()).map(([name, colors]) => (
              <Badge key={name} variant="outline" className={cn(colors.bg, colors.text, colors.border)}>
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-2">
              <div className="text-sm font-medium text-muted-foreground px-2">Сотрудник</div>
              {days.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "text-center text-sm p-2 rounded-md",
                    isToday(day) ? "bg-primary/10 font-semibold" : "text-muted-foreground"
                  )}
                >
                  <div className="font-medium">
                    {format(day, "EEE", { locale: ru })}
                  </div>
                  <div className={cn(
                    "text-xs",
                    isToday(day) ? "text-primary" : ""
                  )}>
                    {format(day, "d MMM", { locale: ru })}
                  </div>
                </div>
              ))}
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
                      "grid grid-cols-[200px_repeat(7,1fr)] gap-1 py-1 rounded group",
                      onEditOperator && "hover:bg-muted/50 cursor-pointer"
                    )}
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
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={cn(
                            "text-center p-1.5 rounded-md text-xs transition-colors",
                            colors ? cn(colors.bg, colors.text, "border", colors.border) : "bg-muted/30 text-muted-foreground",
                            isToday(day) && "ring-2 ring-primary/30"
                          )}
                        >
                          {shift ? (
                            <>
                              <div className="font-medium truncate" title={shift.shift_name}>
                                {shift.shift_name.split(" ")[0]}
                              </div>
                              <div className="text-[10px] opacity-75">
                                {mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`}
                              </div>
                            </>
                          ) : (
                            <span className="opacity-50">—</span>
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
