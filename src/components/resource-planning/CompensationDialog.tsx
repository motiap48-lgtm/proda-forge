import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Plus, Trash2, CalendarIcon, CheckCircle, AlertCircle, CalendarDays, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useAbsenceCompensations,
  useCreateAbsenceCompensation,
  useAddCompensationRecord,
  useDeleteAbsenceCompensation,
  useDeleteCompensationRecord,
  useConfirmCompensationRecord,
  useRestoreAbsenceCompensation,
  useForceDeleteAbsenceCompensation,
  COMPENSATION_STATUS_LABELS,
  AbsenceCompensation,
} from "@/hooks/useAbsenceCompensations";
import { BulkCompensationDialog } from "./BulkCompensationDialog";

interface CompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
}

// Hook to get operator's schedule hours
const useOperatorScheduleHours = (operatorId: string) => {
  return useQuery({
    queryKey: ["operator-schedule-hours", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select(`
          work_schedule_id,
          work_schedules (
            id,
            name,
            work_schedule_shifts (
              net_work_minutes,
              gross_work_minutes,
              break_minutes
            )
          )
        `)
        .eq("id", operatorId)
        .single();

      if (error) throw error;
      
      // Get hours from first shift
      const shifts = data?.work_schedules?.work_schedule_shifts || [];
      if (shifts.length > 0) {
        const netMinutes = shifts[0].net_work_minutes || (shifts[0].gross_work_minutes - shifts[0].break_minutes);
        return netMinutes / 60;
      }
      
      return 8; // Default fallback
    },
    enabled: !!operatorId,
  });
};

export const CompensationDialog: React.FC<CompensationDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
}) => {
  const { data: scheduleHours = 8 } = useOperatorScheduleHours(operatorId);
  
  const [showAddAbsence, setShowAddAbsence] = useState(false);
  const [absenceDate, setAbsenceDate] = useState<Date | undefined>(new Date());
  const [absenceHours, setAbsenceHours] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  
  const [addingCompensationFor, setAddingCompensationFor] = useState<string | null>(null);
  const [compensationDate, setCompensationDate] = useState<Date | undefined>(new Date());
  const [compensationHours, setCompensationHours] = useState<string>("");
  const [compensationNotes, setCompensationNotes] = useState("");
  
  // Helper to round hours to 2 decimal places
  const roundHours = (hours: number): number => Math.round(hours * 100) / 100;
  
  const [bulkCompensationFor, setBulkCompensationFor] = useState<AbsenceCompensation | null>(null);

  // Update absenceHours when scheduleHours is loaded
  useEffect(() => {
    if (scheduleHours && !absenceHours) {
      setAbsenceHours(scheduleHours.toString());
    }
  }, [scheduleHours]);

  const { data: compensations = [], isLoading } = useAbsenceCompensations([operatorId]);
  const createAbsence = useCreateAbsenceCompensation();
  const addCompensation = useAddCompensationRecord();
  const deleteAbsence = useDeleteAbsenceCompensation();
  const deleteRecord = useDeleteCompensationRecord();
  const confirmRecord = useConfirmCompensationRecord();
  const restoreAbsence = useRestoreAbsenceCompensation();
  const forceDeleteAbsence = useForceDeleteAbsenceCompensation();

  // Check if a record can be confirmed (date has passed and compensation is not cancelled)
  const canConfirmRecord = (compensationDate: string, compensationStatus: string): boolean => {
    if (compensationStatus === "cancelled") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(compensationDate);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate <= today;
  };

  const handleAddAbsence = () => {
    if (!absenceDate) return;
    
    createAbsence.mutate({
      operator_id: operatorId,
      absence_date: format(absenceDate, "yyyy-MM-dd"),
      absence_hours: parseFloat(absenceHours) || scheduleHours,
      reason: absenceReason || undefined,
    }, {
      onSuccess: () => {
        setShowAddAbsence(false);
        setAbsenceDate(new Date());
        setAbsenceHours(scheduleHours.toString());
        setAbsenceReason("");
      },
    });
  };

  const handleAddCompensation = (absenceCompensationId: string, defaultHours: number) => {
    if (!compensationDate) return;
    
    const hoursToAdd = compensationHours ? parseFloat(compensationHours) : defaultHours;
    if (!hoursToAdd || hoursToAdd <= 0) return;
    
    addCompensation.mutate({
      absence_compensation_id: absenceCompensationId,
      operator_id: operatorId,
      compensation_date: format(compensationDate, "yyyy-MM-dd"),
      hours_worked: roundHours(hoursToAdd),
      notes: compensationNotes || undefined,
    }, {
      onSuccess: () => {
        setAddingCompensationFor(null);
        setCompensationDate(new Date());
        setCompensationHours("");
        setCompensationNotes("");
      },
    });
  };

  const handleDeleteAbsence = (id: string) => {
    deleteAbsence.mutate(id);
  };

  const handleRestoreAbsence = (id: string) => {
    restoreAbsence.mutate(id);
  };

  const handleForceDeleteAbsence = (id: string) => {
    forceDeleteAbsence.mutate(id);
  };

  const totalPending = roundHours(compensations
    .filter((c) => c.status === "pending" || c.status === "partial")
    .reduce((sum, c) => {
      const compensated = c.compensation_records?.reduce(
        (s, r) => s + Number(r.hours_worked),
        0
      ) || 0;
      return sum + (Number(c.absence_hours) - compensated);
    }, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Учет отработки - {operatorName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className={`p-3 rounded-lg border ${
          totalPending > 0
            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {totalPending > 0 ? (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
              <span className="font-medium">
                {totalPending > 0
                  ? `К отработке: ${totalPending} ч`
                  : "Все часы отработаны"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddAbsence(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить отсутствие
            </Button>
          </div>
        </div>

        {/* Add absence form */}
        {showAddAbsence && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium">Новое отсутствие (с отработкой)</h4>
            <p className="text-xs text-muted-foreground">
              Типы с обязательной отработкой: Прогул, Административный, Без сохранения ЗП, Другое
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Дата отсутствия</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !absenceDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {absenceDate ? format(absenceDate, "PPP", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={absenceDate}
                      onSelect={setAbsenceDate}
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Часов к отработке</Label>
                <Input
                  type="number"
                  value={absenceHours}
                  onChange={(e) => setAbsenceHours(e.target.value)}
                  min="0.5"
                  step="0.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Причина</Label>
              <Textarea
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Причина отсутствия..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddAbsence(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddAbsence} disabled={createAbsence.isPending}>
                Добавить
              </Button>
            </div>
          </div>
        )}

        {/* List of compensations */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Загрузка...</p>
            ) : compensations.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Нет записей</p>
            ) : (
              compensations.map((comp) => {
                const compensatedHours = roundHours(comp.compensation_records?.reduce(
                  (sum, r) => sum + Number(r.hours_worked),
                  0
                ) || 0);
                const remaining = roundHours(Number(comp.absence_hours) - compensatedHours);
                const statusInfo = COMPENSATION_STATUS_LABELS[comp.status];

                return (
                  <div
                    key={comp.id}
                    className={`p-3 border rounded-lg ${
                      comp.status === "cancelled" ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(new Date(comp.absence_date), "d MMMM yyyy", { locale: ru })}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${statusInfo.bgColor} ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Отсутствие: {roundHours(Number(comp.absence_hours))}ч | Отработано: {compensatedHours}ч
                          {remaining > 0 && comp.status !== "cancelled" && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {" "}| Осталось: {remaining}ч
                            </span>
                          )}
                        </div>
                        {comp.reason && (
                          <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                            {comp.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {comp.status === "cancelled" ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleRestoreAbsence(comp.id)}
                              title="Восстановить"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-rose-600"
                              onClick={() => handleForceDeleteAbsence(comp.id)}
                              title="Удалить полностью"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {comp.status !== "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAddingCompensationFor(comp.id)}
                                  title="Добавить одну отработку"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setBulkCompensationFor(comp)}
                                  title="Массовая отработка"
                                >
                                  <CalendarDays className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-rose-600"
                              onClick={() => handleDeleteAbsence(comp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Compensation records */}
                    {comp.compensation_records && comp.compensation_records.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-1">
                        {comp.compensation_records.map((record) => {
                          const isConfirmed = record.status === "confirmed";
                          const canConfirm = canConfirmRecord(record.compensation_date, comp.status);
                          const isCancelled = comp.status === "cancelled";
                          
                          return (
                            <div
                              key={record.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {isConfirmed ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Clock className={`h-3.5 w-3.5 ${isCancelled ? "text-gray-400" : "text-amber-500"}`} />
                                )}
                                <span className={!isConfirmed || isCancelled ? "text-muted-foreground" : ""}>
                                  {format(new Date(record.compensation_date), "d MMM", { locale: ru })}
                                  : {record.hours_worked}ч
                                  {!isConfirmed && !isCancelled && (
                                    <span className="text-amber-600 ml-1">(ожидает)</span>
                                  )}
                                  {record.notes && (
                                    <span className="text-muted-foreground"> - {record.notes}</span>
                                  )}
                                </span>
                              </div>
                              {!isCancelled && (
                                <div className="flex gap-1">
                                  {!isConfirmed && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={`h-6 w-6 p-0 ${
                                        canConfirm 
                                          ? "text-emerald-600 hover:text-emerald-700" 
                                          : "text-muted-foreground cursor-not-allowed"
                                      }`}
                                      onClick={() => {
                                        if (canConfirm) {
                                          confirmRecord.mutate({
                                            id: record.id,
                                            absence_compensation_id: comp.id,
                                          });
                                        }
                                      }}
                                      disabled={!canConfirm}
                                      title={canConfirm ? "Подтвердить отработку" : "Можно подтвердить только после наступления даты"}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                                    onClick={() =>
                                      deleteRecord.mutate({
                                        id: record.id,
                                        absence_compensation_id: comp.id,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add compensation form */}
                    {addingCompensationFor === comp.id && (
                      <div className="mt-3 p-3 border rounded-lg bg-muted/30 space-y-3">
                        <h5 className="text-sm font-medium">Добавить отработку</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Дата</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start"
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {compensationDate
                                    ? format(compensationDate, "d MMM", { locale: ru })
                                    : "Дата"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={compensationDate}
                                  onSelect={setCompensationDate}
                                  locale={ru}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Часов</Label>
                            <Input
                              type="number"
                              size={1}
                              value={compensationHours}
                              onChange={(e) => setCompensationHours(e.target.value)}
                              placeholder={remaining.toString()}
                              min="0.5"
                              step="0.5"
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Примечание</Label>
                          <Input
                            value={compensationNotes}
                            onChange={(e) => setCompensationNotes(e.target.value)}
                            placeholder="Необязательно"
                            className="h-9"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingCompensationFor(null)}
                          >
                            Отмена
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddCompensation(comp.id, remaining)}
                            disabled={addCompensation.isPending}
                          >
                            Добавить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Bulk compensation dialog */}
        <BulkCompensationDialog
          open={!!bulkCompensationFor}
          onOpenChange={(open) => !open && setBulkCompensationFor(null)}
          compensation={bulkCompensationFor}
          operatorId={operatorId}
        />
      </DialogContent>
    </Dialog>
  );
};
