import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clock, Calendar, Coffee, Edit, Trash2, Wand2, X } from "lucide-react";
import { useWorkSchedules, useDeleteWorkSchedule } from "@/hooks/useResourcePlanning";
import { WorkScheduleDialog } from "./WorkScheduleDialog";
import { ScheduleCalendarPreview } from "./ScheduleCalendarPreview";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const WorkSchedulesTab = () => {
  const { data: schedules, isLoading } = useWorkSchedules();
  const deleteSchedule = useDeleteWorkSchedule();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);

  const filteredSchedules = schedules?.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case "shift": return "Сменный";
      case "weekly": return "Пятидневка";
      case "cyclic": return "Скользящий";
      case "custom": return "Произвольный";
      default: return type;
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  const handleDelete = (schedule: any) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule.mutate(scheduleToDelete.id);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск графиков..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8 h-8 sm:h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Добавить график</span>
          <span className="sm:hidden">Добавить</span>
        </Button>
      </div>

      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Графики работы не найдены</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать график
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((schedule: any) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 sm:pb-2 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground truncate">{schedule.code}</span>
                    </div>
                    <CardTitle className="text-base sm:text-lg truncate">{schedule.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleEdit(schedule)}>
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleDelete(schedule)}>
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Badge variant={schedule.is_active ? "default" : "secondary"} className="text-[10px] sm:text-xs h-5 sm:h-6">
                    {schedule.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] sm:text-xs h-5 sm:h-6">
                    {getScheduleTypeLabel(schedule.schedule_type)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>{schedule.cycle_days_on}/{schedule.cycle_days_off}</span>
                  </div>
                </div>

                {schedule.work_schedule_shifts && schedule.work_schedule_shifts.length > 0 && (
                  <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Смены:</p>
                    <div className="space-y-1.5 sm:space-y-2">
                      {schedule.work_schedule_shifts.map((shift: any) => {
                        const netMinutes = shift.net_work_minutes || (shift.gross_work_minutes - shift.break_minutes) || 0;
                        const hours = Math.floor(netMinutes / 60);
                        const mins = netMinutes % 60;
                        return (
                          <div key={shift.id} className="space-y-1 sm:space-y-1.5">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{shift.shift_name}</span>
                              </div>
                              <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0 ml-2">
                                {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                              </span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end cursor-help">
                                    <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] sm:text-xs font-medium">
                                      {netMinutes} мин
                                    </div>
                                    <div className="px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-medium">
                                      {hours} ч {mins > 0 ? `${mins} мин` : ''}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <div className="space-y-1.5">
                                    <p className="font-medium text-xs">Перерывы ({shift.break_minutes} мин):</p>
                                    {shift.work_schedule_breaks && shift.work_schedule_breaks.length > 0 ? (
                                      <div className="space-y-1">
                                        {shift.work_schedule_breaks.map((breakItem: any) => (
                                          <div key={breakItem.id} className="flex items-center gap-2 text-xs">
                                            <Coffee className="h-3 w-3 text-muted-foreground" />
                                            <span>{breakItem.break_name}</span>
                                            <span className="text-muted-foreground">
                                              {breakItem.start_time?.slice(0, 5)} • {breakItem.duration_minutes} мин
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Нет перерывов</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </div>
                    {/* Total time for all shifts */}
                    {schedule.work_schedule_shifts.length > 1 && (() => {
                      const totalMinutes = schedule.work_schedule_shifts.reduce((sum: number, shift: any) => {
                        return sum + (shift.net_work_minutes || (shift.gross_work_minutes - shift.break_minutes) || 0);
                      }, 0);
                      const totalHours = Math.floor(totalMinutes / 60);
                      const totalMins = totalMinutes % 60;
                      return (
                        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 border-t border-dashed">
                          <span className="text-xs sm:text-sm font-medium">Всего:</span>
                          <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] sm:text-xs font-medium">
                            {totalHours} ч {totalMins > 0 ? `${totalMins} мин` : ''}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Schedule Calendar Preview */}
                <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                  <ScheduleCalendarPreview schedule={schedule} defaultDays={7} />
                </div>

                {schedule.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground">{schedule.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WorkScheduleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        schedule={editingSchedule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить график работы?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. График "{scheduleToDelete?.name}" будет удалён.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
