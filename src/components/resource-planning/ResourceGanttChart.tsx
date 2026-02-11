import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, differenceInMinutes, parseISO, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  User,
  Users as UsersIcon,
  Clock,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOperatorAssignmentsRange, useBrigadeAssignmentsRange } from "@/hooks/useShiftTasks";
import { useActiveOperators, useActiveBrigades, useActiveWorkSchedules } from "@/hooks/useResourcePlanning";

const HOUR_WIDTH = 40;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;

export const ResourceGanttChart = () => {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [resourceType, setResourceType] = useState<"operators" | "brigades">("operators");

  const endDate = viewMode === "week" ? addDays(startDate, 6) : startDate;
  const days = viewMode === "week" 
    ? Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
    : [startDate];

  const { data: operators = [] } = useActiveOperators();
  const { data: brigades = [] } = useActiveBrigades();
  const { data: schedules = [] } = useActiveWorkSchedules();
  const { data: operatorAssignments = [] } = useOperatorAssignmentsRange(startDate, endDate);
  const { data: brigadeAssignments = [] } = useBrigadeAssignmentsRange(startDate, endDate);

  const resources = resourceType === "operators" 
    ? operators.map(o => ({ id: o.id, name: o.full_name, code: o.code, type: "operator" as const }))
    : brigades.map(b => ({ id: b.id, name: b.name, code: b.code, type: "brigade" as const }));

  const assignments = resourceType === "operators" ? operatorAssignments : brigadeAssignments;

  const navigateDate = (direction: number) => {
    const offset = viewMode === "week" ? 7 : 1;
    setStartDate(addDays(startDate, direction * offset));
  };

  // Hours for timeline (8:00 to 20:00 for day view, or condensed for week)
  const hours = viewMode === "day" 
    ? Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 - 20:00
    : [8, 12, 16, 20]; // Key hours for week view

  const getAssignmentPosition = (assignment: any, day: Date) => {
    const assignmentDate = parseISO(assignment.assignment_date);
    if (format(assignmentDate, "yyyy-MM-dd") !== format(day, "yyyy-MM-dd")) {
      return null;
    }

    // Default shift times
    const shift1Start = 8; // 8:00
    const shift1End = 20; // 20:00
    const shift2Start = 20;
    const shift2End = 8; // next day

    let startHour = assignment.shift_number === 1 ? shift1Start : shift2Start;
    let endHour = assignment.shift_number === 1 ? shift1End : shift2End;

    if (assignment.planned_start_time) {
      const start = parseISO(assignment.planned_start_time);
      startHour = start.getHours() + start.getMinutes() / 60;
    }
    if (assignment.planned_end_time) {
      const end = parseISO(assignment.planned_end_time);
      endHour = end.getHours() + end.getMinutes() / 60;
    }

    // Calculate position within day view range (8-20)
    const visibleStartHour = 8;
    const visibleEndHour = 20;
    const totalVisibleHours = visibleEndHour - visibleStartHour;

    const clampedStart = Math.max(startHour, visibleStartHour);
    const clampedEnd = Math.min(endHour, visibleEndHour);

    if (clampedEnd <= clampedStart) return null;

    const left = ((clampedStart - visibleStartHour) / totalVisibleHours) * 100;
    const width = ((clampedEnd - clampedStart) / totalVisibleHours) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "planned": return "bg-primary";
      case "cancelled": return "bg-red-500";
      default: return "bg-muted";
    }
  };

  const totalWidth = viewMode === "day" 
    ? hours.length * HOUR_WIDTH
    : days.length * 4 * HOUR_WIDTH; // 4 hours per day condensed

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="space-y-3">
        {/* Navigation row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-1 sm:gap-2 px-2 sm:px-3 h-8 sm:h-9 text-xs sm:text-sm">
                  <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {viewMode === "week" 
                      ? `${format(startDate, "d MMM", { locale: ru })} - ${format(endDate, "d MMM yyyy", { locale: ru })}`
                      : format(startDate, "d MMMM yyyy", { locale: ru })
                    }
                  </span>
                  <span className="sm:hidden">
                    {viewMode === "week" 
                      ? `${format(startDate, "d", { locale: ru })} - ${format(endDate, "d MMM", { locale: ru })}`
                      : format(startDate, "d MMM", { locale: ru })
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(viewMode === "week" 
                    ? startOfWeek(date, { weekStartsOn: 1 }) 
                    : date
                  )}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={() => setStartDate(viewMode === "week" 
                ? startOfWeek(new Date(), { weekStartsOn: 1 })
                : new Date()
              )}
            >
              <span className="hidden sm:inline">Сегодня</span>
              <span className="sm:hidden">Сег.</span>
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week")}>
            <SelectTrigger className="w-[90px] sm:w-[120px] h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceType} onValueChange={(v) => setResourceType(v as "operators" | "brigades")}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operators">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Операторы</span>
                  <span className="sm:hidden">Опер.</span>
                </div>
              </SelectItem>
              <SelectItem value="brigades">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Бригады</span>
                  <span className="sm:hidden">Бриг.</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Загрузка {resourceType === "operators" ? "операторов" : "бригад"}</span>
            <span className="sm:hidden">Загрузка</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] sm:min-w-[800px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[120px] sm:w-[200px]" style={{ width: viewMode === "day" ? 120 : 200, minWidth: viewMode === "day" ? 120 : 200 }} />
                {viewMode === "day"
                  ? hours.map((hour) => (
                      <col key={hour} style={{ minWidth: HOUR_WIDTH }} />
                    ))
                  : days.map((day) => (
                      <col key={day.toISOString()} style={{ minWidth: HOUR_WIDTH * 4 }} />
                    ))
                }
              </colgroup>
              <thead>
                <tr className="border-b">
                  <th className="p-2 sm:p-3 font-medium bg-muted/50 text-xs sm:text-sm text-left sticky left-0 z-10">
                    {resourceType === "operators" ? "Оператор" : "Бригада"}
                  </th>
                  {viewMode === "day" ? (
                    hours.map((hour) => (
                      <th
                        key={hour}
                        className="text-center py-2 text-sm text-muted-foreground border-l font-normal"
                      >
                        {hour}:00
                      </th>
                    ))
                  ) : (
                    days.map((day) => (
                      <th
                        key={day.toISOString()}
                        className="text-center py-2 text-sm border-l font-normal"
                      >
                        <div className={cn(
                          "font-medium",
                          format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && "text-primary"
                        )}>
                          {format(day, "EEE", { locale: ru })}
                        </div>
                        <div className="text-muted-foreground">
                          {format(day, "d MMM", { locale: ru })}
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={1 + (viewMode === "day" ? hours.length : days.length)} className="p-8 text-center text-muted-foreground">
                      <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Нет {resourceType === "operators" ? "операторов" : "бригад"}</p>
                    </td>
                  </tr>
                ) : (
                  resources.map((resource) => {
                    const resourceAssignments = resourceType === "operators"
                      ? (assignments as any[]).filter(a => a.operator_id === resource.id)
                      : (assignments as any[]).filter(a => a.brigade_id === resource.id);

                    return (
                      <tr key={resource.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 sm:p-3 bg-muted/20 sticky left-0 z-10">
                          <div className="flex items-center gap-1 sm:gap-2">
                            {resource.type === "operator" ? (
                              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <UsersIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="truncate min-w-0">
                              <div className="font-medium text-xs sm:text-sm truncate">{resource.name}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{resource.code}</div>
                            </div>
                          </div>
                        </td>
                        {viewMode === "day" ? (
                          hours.map((hour, i) => {
                            // Find assignments that cover this hour
                            const hourAssignments = resourceAssignments.filter((assignment) => {
                              if (assignment.assignment_date !== format(startDate, "yyyy-MM-dd")) return false;
                              let startHour = assignment.shift_number === 1 ? 8 : 20;
                              let endHour = assignment.shift_number === 1 ? 20 : 8;
                              if (assignment.planned_start_time) {
                                const s = parseISO(assignment.planned_start_time);
                                startHour = s.getHours() + s.getMinutes() / 60;
                              }
                              if (assignment.planned_end_time) {
                                const e = parseISO(assignment.planned_end_time);
                                endHour = e.getHours() + e.getMinutes() / 60;
                              }
                              return hour >= startHour && hour < endHour;
                            });

                            return (
                              <td
                                key={hour}
                                className="border-l relative"
                                style={{ height: ROW_HEIGHT }}
                              >
                                {hourAssignments.map((assignment) => (
                                  <Tooltip key={assignment.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "absolute inset-1 rounded cursor-pointer transition-all hover:brightness-110",
                                          getStatusColor(assignment.status)
                                        )}
                                      >
                                        <span className="text-xs text-white px-1 truncate block">
                                          С{assignment.shift_number}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <div className="font-medium">Смена {assignment.shift_number}</div>
                                        <div className="text-xs">Статус: {assignment.status}</div>
                                        {assignment.notes && (
                                          <div className="text-xs text-muted-foreground">{assignment.notes}</div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </td>
                            );
                          })
                        ) : (
                          days.map((day, i) => {
                            const dayAssignments = resourceAssignments.filter(
                              a => a.assignment_date === format(day, "yyyy-MM-dd")
                            );

                            return (
                              <td
                                key={day.toISOString()}
                                className={cn(
                                  "border-l relative",
                                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && "bg-primary/5"
                                )}
                                style={{ height: ROW_HEIGHT }}
                              >
                                {dayAssignments.map((assignment, idx) => (
                                  <Tooltip key={assignment.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "absolute rounded cursor-pointer transition-all hover:brightness-110",
                                          getStatusColor(assignment.status)
                                        )}
                                        style={{
                                          top: `${4 + idx * 16}px`,
                                          left: '4px',
                                          right: '4px',
                                          height: '14px',
                                        }}
                                      >
                                        <span className="text-[10px] text-white px-1 truncate block leading-[14px]">
                                          С{assignment.shift_number}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <div className="font-medium">
                                          {format(day, "d MMM", { locale: ru })} - Смена {assignment.shift_number}
                                        </div>
                                        <div className="text-xs">Статус: {assignment.status}</div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary" />
          <span>Запланировано</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-500" />
          <span>В работе</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-500" />
          <span>Завершено</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500" />
          <span>Отменено</span>
        </div>
      </div>
    </div>
  );
};
