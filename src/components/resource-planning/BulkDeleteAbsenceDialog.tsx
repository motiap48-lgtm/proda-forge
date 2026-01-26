import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllOperatorAbsences, ABSENCE_TYPE_LABELS, useBulkDeleteOperatorAbsences } from "@/hooks/useOperatorAbsences";
import { toast } from "sonner";
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

interface BulkDeleteAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operators: any[];
}

export const BulkDeleteAbsenceDialog: React.FC<BulkDeleteAbsenceDialogProps> = ({
  open,
  onOpenChange,
  operators,
}) => {
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<Set<string>>(new Set());
  const [absenceType, setAbsenceType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const { data: allAbsences = [] } = useAllOperatorAbsences();
  const bulkDeleteAbsences = useBulkDeleteOperatorAbsences();

  // Filter absences based on selected criteria
  const filteredAbsences = useMemo(() => {
    return allAbsences.filter((absence) => {
      // Filter by operator
      if (selectedOperatorIds.size > 0 && !selectedOperatorIds.has(absence.operator_id)) {
        return false;
      }

      // Filter by absence type
      if (absenceType !== "all" && absence.absence_type !== absenceType) {
        return false;
      }

      // Filter by date range - normalize dates to compare only date part
      if (startDate) {
        const absenceEnd = new Date(absence.end_date + "T23:59:59");
        const startNormalized = new Date(startDate);
        startNormalized.setHours(0, 0, 0, 0);
        if (absenceEnd < startNormalized) return false;
      }

      if (endDate) {
        const absenceStart = new Date(absence.start_date + "T00:00:00");
        const endNormalized = new Date(endDate);
        endNormalized.setHours(23, 59, 59, 999);
        if (absenceStart > endNormalized) return false;
      }

      return true;
    });
  }, [allAbsences, selectedOperatorIds, absenceType, startDate, endDate]);

  const handleSelectAll = () => {
    if (selectedOperatorIds.size === operators.length) {
      setSelectedOperatorIds(new Set());
    } else {
      setSelectedOperatorIds(new Set(operators.map(op => op.id)));
    }
  };

  const toggleOperator = (operatorId: string) => {
    const newSet = new Set(selectedOperatorIds);
    if (newSet.has(operatorId)) {
      newSet.delete(operatorId);
    } else {
      newSet.add(operatorId);
    }
    setSelectedOperatorIds(newSet);
  };

  const handleDelete = async () => {
    if (filteredAbsences.length === 0) {
      toast.error("Нет отсутствий для удаления");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use optimized bulk delete
      const absenceIds = filteredAbsences.map(a => a.id);
      await bulkDeleteAbsences.mutateAsync(absenceIds);
      
      // Reset form
      setSelectedOperatorIds(new Set());
      setAbsenceType("all");
      setStartDate(undefined);
      setEndDate(undefined);
      setShowConfirmDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting absences:", error);
      // Toast is already shown by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedOperators = useMemo(() => {
    const groups = new Map<string, any[]>();
    operators.forEach(op => {
      const scheduleName = op.work_schedules?.name || "Без графика";
      if (!groups.has(scheduleName)) {
        groups.set(scheduleName, []);
      }
      groups.get(scheduleName)!.push(op);
    });
    return groups;
  }, [operators]);

  // Get operator name by ID
  const getOperatorName = (operatorId: string) => {
    return operators.find(op => op.id === operatorId)?.full_name || "Неизвестный";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Массовое удаление отсутствий
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Left column: Operator selection */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between">
                <Label>Сотрудники (фильтр)</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedOperatorIds.size === operators.length ? "Снять все" : "Выбрать все"}
                </Button>
              </div>
              <ScrollArea className="flex-1 border rounded-md p-2 min-h-[200px] max-h-[250px]">
                {Array.from(groupedOperators.entries()).map(([scheduleName, ops]) => (
                  <div key={scheduleName} className="mb-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                      {scheduleName} ({ops.length})
                    </div>
                    <div className="space-y-1">
                      {ops.map(operator => (
                        <div
                          key={operator.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedOperatorIds.has(operator.id) && "bg-primary/10"
                          )}
                          onClick={() => toggleOperator(operator.id)}
                        >
                          <Checkbox
                            checked={selectedOperatorIds.has(operator.id)}
                            onCheckedChange={() => toggleOperator(operator.id)}
                          />
                          <span className="text-sm truncate">{operator.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              {selectedOperatorIds.size > 0 && (
                <Badge variant="secondary" className="w-fit">
                  Выбрано: {selectedOperatorIds.size}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                Если никто не выбран — удаление коснется всех сотрудников
              </p>
            </div>

            {/* Right column: Filter criteria & preview */}
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Тип отсутствия</Label>
                <Select value={absenceType} onValueChange={setAbsenceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {Object.entries(ABSENCE_TYPE_LABELS)
                      .filter(([key]) => key !== 'administrative_leave')
                      .map(([value, { label, icon }]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span>{icon}</span>
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Дата начала (от)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "d MMM yyyy", { locale: ru }) : "Любая"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Дата окончания (до)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "d MMM yyyy", { locale: ru }) : "Любая"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Preview */}
              <div className="flex-1 space-y-2 min-h-0">
                <Label>Будет удалено: {filteredAbsences.length}</Label>
                <ScrollArea className="border rounded-md p-2 h-[200px]">
                  {filteredAbsences.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Нет отсутствий по заданным критериям
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {(isPreviewExpanded ? filteredAbsences : filteredAbsences.slice(0, 20)).map((absence) => (
                        <div key={absence.id} className="text-xs p-1.5 bg-muted/50 rounded flex items-center gap-2">
                          <span>{ABSENCE_TYPE_LABELS[absence.absence_type]?.icon}</span>
                          <span className="font-medium truncate flex-1">
                            {getOperatorName(absence.operator_id)}
                          </span>
                          <span className="text-muted-foreground">
                            {format(new Date(absence.start_date), "dd.MM")} - {format(new Date(absence.end_date), "dd.MM.yy")}
                          </span>
                        </div>
                      ))}
                      {filteredAbsences.length > 20 && !isPreviewExpanded && (
                        <button
                          type="button"
                          onClick={() => setIsPreviewExpanded(true)}
                          className="text-xs text-primary hover:underline text-center w-full py-1"
                        >
                          ... и ещё {filteredAbsences.length - 20}
                        </button>
                      )}
                      {isPreviewExpanded && filteredAbsences.length > 20 && (
                        <button
                          type="button"
                          onClick={() => setIsPreviewExpanded(false)}
                          className="text-xs text-muted-foreground hover:underline text-center w-full py-1"
                        >
                          Свернуть
                        </button>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isSubmitting || filteredAbsences.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить {filteredAbsences.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Подтвердите удаление
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить <strong>{filteredAbsences.length}</strong> записей об отсутствиях? 
              Это действие также удалит связанные записи об отработках. Отменить это действие невозможно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
