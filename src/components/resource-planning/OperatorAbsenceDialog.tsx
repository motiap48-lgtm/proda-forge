import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { parseDateOnly } from "@/components/resource-planning/shift-rotation/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Plus, Trash2, Edit2, CalendarRange, UserX, AlertCircle, Merge, Clock, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useOperatorAbsences,
  useCreateOperatorAbsence,
  useUpdateOperatorAbsence,
  useDeleteOperatorAbsence,
  useMergeOperatorAbsences,
  ABSENCE_TYPE_LABELS,
  ABSENCE_STATUS_LABELS,
  isCompensableAbsenceType,
  type OperatorAbsence,
} from "@/hooks/useOperatorAbsences";
import {
  useAbsenceCompensations,
  useDeleteAllOperatorCompensations,
} from "@/hooks/useAbsenceCompensations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OperatorAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: any;
}

export const OperatorAbsenceDialog = ({
  open,
  onOpenChange,
  operator,
}: OperatorAbsenceDialogProps) => {
  const { data: absences, isLoading } = useOperatorAbsences(operator?.id);
  const { data: compensations } = useAbsenceCompensations(operator?.id ? [operator.id] : undefined);
  const createAbsence = useCreateOperatorAbsence();
  const updateAbsence = useUpdateOperatorAbsence();
  const deleteAbsence = useDeleteOperatorAbsence();
  const mergeAbsences = useMergeOperatorAbsences();
  const deleteAllCompensations = useDeleteAllOperatorCompensations();

  // Map absence date ranges to compensation counts
  const absenceCompensationMap = useMemo(() => {
    const map = new Map<string, { count: number; pending: number }>();
    if (!absences || !compensations) return map;
    
    absences.forEach(absence => {
      const startDate = new Date(absence.start_date);
      const endDate = new Date(absence.end_date);
      
      let count = 0;
      let pending = 0;
      
      compensations.forEach(comp => {
        // Cancelled compensations should not be treated as active/assigned.
        if (comp.status === 'cancelled') return;
        const compDate = new Date(comp.absence_date);
        if (compDate >= startDate && compDate <= endDate) {
          count++;
          if (comp.status === 'pending' || comp.status === 'partial') {
            pending++;
          }
        }
      });
      
      if (count > 0) {
        map.set(absence.id, { count, pending });
      }
    });
    
    return map;
  }, [absences, compensations]);

  // Period filter - default to current month
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<OperatorAbsence | null>(null);
  const [formData, setFormData] = useState({
    absence_type: "annual_leave" as OperatorAbsence["absence_type"],
    start_date: "",
    end_date: "",
    status: "approved" as OperatorAbsence["status"],
    notes: "",
    requiresCompensation: false,
  });

  useEffect(() => {
    if (editingAbsence) {
      setFormData({
        absence_type: editingAbsence.absence_type,
        start_date: editingAbsence.start_date,
        end_date: editingAbsence.end_date,
        status: editingAbsence.status,
        notes: editingAbsence.notes || "",
        requiresCompensation: false, // When editing, user can set this manually if needed
      });
    } else {
      setFormData({
        absence_type: "annual_leave",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        status: "approved",
        notes: "",
        requiresCompensation: false,
      });
    }
  }, [editingAbsence, isAddingNew]);

  // Валидация: дата окончания не может быть раньше даты начала
  const isDateRangeValid = formData.start_date <= formData.end_date;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDateRangeValid) return;

    if (editingAbsence) {
      const { requiresCompensation, ...absenceData } = formData;
      updateAbsence.mutate(
        { 
          id: editingAbsence.id, 
          ...absenceData,
          requiresCompensation: !isCompensableAbsenceType(formData.absence_type) && requiresCompensation
        },
        {
          onSuccess: () => {
            setEditingAbsence(null);
          },
        }
      );
    } else {
      createAbsence.mutate(
        {
          operator_id: operator.id,
          ...formData,
          created_by: null,
        },
        {
          onSuccess: () => {
            setIsAddingNew(false);
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteAbsence.mutate(id);
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        <CalendarRange className="h-4 w-4" />
        {editingAbsence ? "Редактировать отсутствие" : "Новое отсутствие"}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Тип отсутствия</Label>
          <Select
            value={formData.absence_type}
            onValueChange={(value) =>
              setFormData({ ...formData, absence_type: value as OperatorAbsence["absence_type"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {Object.entries(ABSENCE_TYPE_LABELS)
                .filter(([key]) => key !== 'administrative_leave') // Скрываем устаревший тип
                .map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Статус</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as OperatorAbsence["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {Object.entries(ABSENCE_STATUS_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Дата начала</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Дата окончания</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
            className={!isDateRangeValid ? "border-destructive" : ""}
          />
        </div>
      </div>

      {/* Date validation error */}
      {!isDateRangeValid && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Дата окончания не может быть раньше даты начала
        </div>
      )}

      {/* Compensation checkbox - show for both new and editing */}
      {formData.status === 'approved' && (
        <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
          <Checkbox
            id="requiresCompensation"
            checked={isCompensableAbsenceType(formData.absence_type) || formData.requiresCompensation}
            disabled={isCompensableAbsenceType(formData.absence_type)}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, requiresCompensation: checked === true })
            }
          />
          <div className="flex-1">
            <Label 
              htmlFor="requiresCompensation" 
              className={`text-sm font-medium cursor-pointer ${
                isCompensableAbsenceType(formData.absence_type) ? 'text-muted-foreground' : ''
              }`}
            >
              <Clock className="h-4 w-4 inline mr-1" />
              Требует отработки
            </Label>
            {isCompensableAbsenceType(formData.absence_type) && (
              <p className="text-xs text-muted-foreground">
                {formData.absence_type === 'unauthorized_absence' 
                  ? 'Прогулы всегда требуют отработки'
                  : 'Административный с отработкой всегда требует отработки'}
              </p>
            )}
            {editingAbsence && !isCompensableAbsenceType(formData.absence_type) && formData.requiresCompensation && (
              <p className="text-xs text-amber-600">
                Будут созданы записи для отработки
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Примечание</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Дополнительная информация..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsAddingNew(false);
            setEditingAbsence(null);
          }}
        >
          Отмена
        </Button>
        <Button 
          type="submit" 
          disabled={createAbsence.isPending || updateAbsence.isPending || !isDateRangeValid}
        >
          {editingAbsence ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Отсутствия: {operator?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Action buttons */}
          {!isAddingNew && !editingAbsence && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить отсутствие
              </Button>
              
              {absences && absences.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="Объединить дубликаты"
                    >
                      <Merge className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Объединить дубликаты?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Все пересекающиеся или смежные отсутствия одного типа будут объединены в одну запись.
                        Это действие нельзя отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => mergeAbsences.mutate({ operatorId: operator.id })}
                        disabled={mergeAbsences.isPending}
                      >
                        {mergeAbsences.isPending ? "Объединение..." : "Объединить"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Delete all compensations button */}
              {compensations && compensations.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Удалить все записи отработки"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить все записи отработки?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Все записи отработки ({compensations.length} шт.) для этого оператора будут удалены.
                        Это действие нельзя отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteAllCompensations.mutate(operator.id)}
                        disabled={deleteAllCompensations.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteAllCompensations.isPending ? "Удаление..." : "Удалить все"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}

          {/* Form */}
          {(isAddingNew || editingAbsence) && renderForm()}

          {/* Period filter */}
          {!isAddingNew && !editingAbsence && (
            <div className="flex items-center justify-center gap-2 py-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(selectedMonth, "LLLL yyyy", { locale: ru })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* List of absences */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">Загрузка...</div>
              ) : (() => {
                // Filter absences by selected period
                const filteredAbsences = absences?.filter((absence) => {
                  const startDate = new Date(absence.start_date);
                  const endDate = new Date(absence.end_date);
                  const monthStart = startOfMonth(selectedMonth);
                  const monthEnd = endOfMonth(selectedMonth);
                  // Include if absence overlaps with selected month
                  return startDate <= monthEnd && endDate >= monthStart;
                }) || [];
                
                return filteredAbsences.length > 0 ? (
                  filteredAbsences.map((absence) => {
                  const typeInfo = ABSENCE_TYPE_LABELS[absence.absence_type];
                  const statusInfo = ABSENCE_STATUS_LABELS[absence.status];

                  return (
                    <div
                      key={absence.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                    >
                      <div className="text-2xl">{typeInfo.icon}</div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{typeInfo.label}</span>
                          <Badge
                            variant="secondary"
                            className={`text-xs text-white ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </Badge>
                          {/* Compensation indicator */}
                          {absenceCompensationMap.has(absence.id) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    absenceCompensationMap.get(absence.id)!.pending > 0 
                                      ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20' 
                                      : 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                  }`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {absenceCompensationMap.get(absence.id)!.count}д
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {absenceCompensationMap.get(absence.id)!.pending > 0 
                                  ? `Ожидает отработки: ${absenceCompensationMap.get(absence.id)!.pending} дней`
                                  : 'Полностью отработано'
                                }
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(parseDateOnly(absence.start_date) ?? new Date(), "d MMM yyyy", { locale: ru })}
                          {absence.start_date !== absence.end_date && (
                            <>
                              {" — "}
                              {format(parseDateOnly(absence.end_date) ?? new Date(), "d MMM yyyy", { locale: ru })}
                            </>
                          )}
                        </div>
                        {absence.notes && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {absence.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingAbsence(absence)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить отсутствие?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Запись об отсутствии будет удалена.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(absence.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Нет записей за {format(selectedMonth, "LLLL yyyy", { locale: ru })}</p>
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
