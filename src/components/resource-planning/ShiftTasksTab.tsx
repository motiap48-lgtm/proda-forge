import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Users as UsersIcon,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkCenters } from "@/hooks/useWorkCenters";
import { useOperatorAssignments, useBrigadeAssignments } from "@/hooks/useShiftTasks";
import { ShiftTaskDialog } from "./ShiftTaskDialog";

export const ShiftTasksTab = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: workCenters = [] } = useWorkCenters();
  const { data: operatorAssignments = [] } = useOperatorAssignments(selectedDate);
  const { data: brigadeAssignments = [] } = useBrigadeAssignments(selectedDate);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateWeek = (direction: number) => {
    setSelectedDate(addDays(selectedDate, direction * 7));
  };

  const filteredOperatorAssignments = useMemo(() => {
    return operatorAssignments.filter(a => {
      if (selectedWorkCenter !== "all") {
        // Filter by work center through operation
      }
      if (selectedShift !== "all" && a.shift_number !== parseInt(selectedShift)) {
        return false;
      }
      return true;
    });
  }, [operatorAssignments, selectedWorkCenter, selectedShift]);

  const filteredBrigadeAssignments = useMemo(() => {
    return brigadeAssignments.filter(a => {
      if (selectedShift !== "all" && a.shift_number !== parseInt(selectedShift)) {
        return false;
      }
      return true;
    });
  }, [brigadeAssignments, selectedShift]);

  const getAssignmentsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const ops = filteredOperatorAssignments.filter(a => a.assignment_date === dateStr);
    const brigs = filteredBrigadeAssignments.filter(a => a.assignment_date === dateStr);
    return { operators: ops, brigades: brigs };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-700 border-green-500/30";
      case "in_progress": return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "planned": return "bg-muted text-muted-foreground border-border";
      case "cancelled": return "bg-red-500/20 text-red-700 border-red-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(weekStart, "d MMM", { locale: ru })} - {format(weekEnd, "d MMM yyyy", { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ru}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Сегодня
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedWorkCenter} onValueChange={setSelectedWorkCenter}>
            <SelectTrigger className="w-[200px]">
              <Factory className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все участки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все участки</SelectItem>
              {workCenters.map((wc) => (
                <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedShift} onValueChange={setSelectedShift}>
            <SelectTrigger className="w-[140px]">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все смены" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все смены</SelectItem>
              <SelectItem value="1">Смена 1</SelectItem>
              <SelectItem value="2">Смена 2</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Назначение
          </Button>
        </div>
      </div>

      {/* Week view */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const { operators, brigades } = getAssignmentsForDay(day);
          const totalAssignments = operators.length + brigades.length;

          return (
            <Card 
              key={day.toISOString()} 
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isToday && "border-primary",
                isSelected && "ring-2 ring-primary/30"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className={cn(
                    "capitalize",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, "EEE", { locale: ru })}
                  </span>
                  <span className={cn(
                    "text-lg",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, "d")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 min-h-[100px]">
                {totalAssignments > 0 ? (
                  <div className="space-y-1.5">
                    {operators.slice(0, 2).map((a) => (
                      <div 
                        key={a.id}
                        className={cn(
                          "text-xs p-1.5 rounded border truncate",
                          getStatusColor(a.status)
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{(a as any).operators?.full_name || "Оператор"}</span>
                        </div>
                      </div>
                    ))}
                    {brigades.slice(0, 2).map((a) => (
                      <div 
                        key={a.id}
                        className={cn(
                          "text-xs p-1.5 rounded border truncate",
                          getStatusColor(a.status)
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{(a as any).brigades?.name || "Бригада"}</span>
                        </div>
                      </div>
                    ))}
                    {totalAssignments > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{totalAssignments - 4} ещё
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Нет назначений
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected day details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Назначения на {format(selectedDate, "d MMMM yyyy", { locale: ru })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const { operators, brigades } = getAssignmentsForDay(selectedDate);
            const total = operators.length + brigades.length;

            if (total === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет назначений на выбранную дату</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Создать назначение
                  </Button>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Operator assignments */}
                {operators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Операторы ({operators.length})
                    </h4>
                    <div className="grid gap-2">
                      {operators.map((a) => (
                        <div 
                          key={a.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            getStatusColor(a.status)
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Смена {a.shift_number}</Badge>
                              <span className="font-medium">
                                {(a as any).operators?.full_name}
                              </span>
                            </div>
                            <Badge className={getStatusColor(a.status)}>
                              {a.status === "planned" ? "Запланировано" : 
                               a.status === "in_progress" ? "В работе" :
                               a.status === "completed" ? "Завершено" : "Отменено"}
                            </Badge>
                          </div>
                          {a.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{a.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brigade assignments */}
                {brigades.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Бригады ({brigades.length})
                    </h4>
                    <div className="grid gap-2">
                      {brigades.map((a) => (
                        <div 
                          key={a.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            getStatusColor(a.status)
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Смена {a.shift_number}</Badge>
                              <span className="font-medium">
                                {(a as any).brigades?.name}
                              </span>
                            </div>
                            <Badge className={getStatusColor(a.status)}>
                              {a.status === "planned" ? "Запланировано" : 
                               a.status === "in_progress" ? "В работе" :
                               a.status === "completed" ? "Завершено" : "Отменено"}
                            </Badge>
                          </div>
                          {a.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{a.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <ShiftTaskDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
      />
    </div>
  );
};
