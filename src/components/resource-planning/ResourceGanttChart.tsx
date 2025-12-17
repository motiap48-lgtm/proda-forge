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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {viewMode === "week" 
                  ? `${format(startDate, "d MMM", { locale: ru })} - ${format(endDate, "d MMM yyyy", { locale: ru })}`
                  : format(startDate, "d MMMM yyyy", { locale: ru })
                }
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

          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setStartDate(viewMode === "week" 
              ? startOfWeek(new Date(), { weekStartsOn: 1 })
              : new Date()
            )}
          >
            Сегодня
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceType} onValueChange={(v) => setResourceType(v as "operators" | "brigades")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operators">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Операторы
                </div>
              </SelectItem>
              <SelectItem value="brigades">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />
                  Бригады
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Загрузка {resourceType === "operators" ? "операторов" : "бригад"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Timeline header */}
              <div className="flex border-b">
                <div className="w-[200px] flex-shrink-0 p-3 font-medium bg-muted/50">
                  {resourceType === "operators" ? "Оператор" : "Бригада"}
                </div>
                <div className="flex-1">
                  {viewMode === "day" ? (
                    <div className="flex">
                      {hours.map((hour) => (
                        <div 
                          key={hour} 
                          className="flex-1 text-center py-2 text-sm text-muted-foreground border-l"
                          style={{ minWidth: HOUR_WIDTH }}
                        >
                          {hour}:00
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex">
                      {days.map((day) => (
                        <div 
                          key={day.toISOString()} 
                          className="flex-1 text-center py-2 text-sm border-l"
                          style={{ minWidth: HOUR_WIDTH * 4 }}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resource rows */}
              {resources.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет {resourceType === "operators" ? "операторов" : "бригад"}</p>
                </div>
              ) : (
                resources.map((resource) => {
                  const resourceAssignments = resourceType === "operators"
                    ? (assignments as any[]).filter(a => a.operator_id === resource.id)
                    : (assignments as any[]).filter(a => a.brigade_id === resource.id);

                  return (
                    <div key={resource.id} className="flex border-b hover:bg-muted/30">
                      <div className="w-[200px] flex-shrink-0 p-3 flex items-center gap-2 bg-muted/20">
                        {resource.type === "operator" ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="truncate">
                          <div className="font-medium text-sm truncate">{resource.name}</div>
                          <div className="text-xs text-muted-foreground">{resource.code}</div>
                        </div>
                      </div>
                      <div className="flex-1 relative" style={{ height: ROW_HEIGHT }}>
                        {viewMode === "day" ? (
                          <>
                            {/* Hour grid lines */}
                            {hours.map((hour) => (
                              <div 
                                key={hour}
                                className="absolute top-0 bottom-0 border-l border-border/50"
                                style={{ left: `${((hour - 8) / 12) * 100}%` }}
                              />
                            ))}
                            {/* Assignments */}
                            {resourceAssignments.map((assignment) => {
                              const position = getAssignmentPosition(assignment, startDate);
                              if (!position) return null;

                              return (
                                <Tooltip key={assignment.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:brightness-110",
                                        getStatusColor(assignment.status)
                                      )}
                                      style={{
                                        left: position.left,
                                        width: position.width,
                                      }}
                                    >
                                      <span className="text-xs text-white px-1 truncate block">
                                        Смена {assignment.shift_number}
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
                              );
                            })}
                          </>
                        ) : (
                          <>
                            {/* Day grid lines */}
                            {days.map((day, i) => (
                              <div 
                                key={day.toISOString()}
                                className={cn(
                                  "absolute top-0 bottom-0 border-l",
                                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") 
                                    ? "bg-primary/5" 
                                    : ""
                                )}
                                style={{ 
                                  left: `${(i / days.length) * 100}%`,
                                  width: `${100 / days.length}%`
                                }}
                              >
                                {/* Assignments for this day */}
                                {resourceAssignments
                                  .filter(a => a.assignment_date === format(day, "yyyy-MM-dd"))
                                  .map((assignment, idx) => (
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
                                  ))
                                }
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Запланировано</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>В работе</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Завершено</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Отменено</span>
        </div>
      </div>
    </div>
  );
};
