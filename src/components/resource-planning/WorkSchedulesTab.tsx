import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clock, Calendar, Coffee, Edit, Trash2, Wand2 } from "lucide-react";
import { useWorkSchedules, useDeleteWorkSchedule } from "@/hooks/useResourcePlanning";
import { WorkScheduleDialog } from "./WorkScheduleDialog";
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск графиков..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить график
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((schedule: any) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{schedule.code}</span>
                    </div>
                    <CardTitle className="text-lg">{schedule.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={schedule.is_active ? "default" : "secondary"}>
                    {schedule.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                  <Badge variant="outline">
                    {getScheduleTypeLabel(schedule.schedule_type)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{schedule.cycle_days_on}/{schedule.cycle_days_off}</span>
                  </div>
                </div>

                {schedule.work_schedule_shifts && schedule.work_schedule_shifts.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Смены:</p>
                    <div className="space-y-2">
                      {schedule.work_schedule_shifts.map((shift: any) => (
                        <div key={shift.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{shift.shift_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</span>
                            <Badge variant="outline" className="text-xs">
                              {shift.net_work_minutes} мин
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {schedule.description && (
                  <p className="text-sm text-muted-foreground">{schedule.description}</p>
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
