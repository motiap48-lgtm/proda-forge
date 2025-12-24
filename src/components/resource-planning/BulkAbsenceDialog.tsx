import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateOperatorAbsence, ABSENCE_TYPE_LABELS } from "@/hooks/useOperatorAbsences";
import { toast } from "sonner";

interface BulkAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operators: any[];
}

export const BulkAbsenceDialog: React.FC<BulkAbsenceDialogProps> = ({
  open,
  onOpenChange,
  operators,
}) => {
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<Set<string>>(new Set());
  const [absenceType, setAbsenceType] = useState<string>("annual_leave");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAbsence = useCreateOperatorAbsence();

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

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error("Укажите период отсутствия");
      return;
    }

    if (selectedOperatorIds.size === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    if (startDate > endDate) {
      toast.error("Дата начала не может быть позже даты окончания");
      return;
    }

    setIsSubmitting(true);

    try {
      const promises = Array.from(selectedOperatorIds).map(operatorId =>
        createAbsence.mutateAsync({
          operator_id: operatorId,
          absence_type: absenceType as any,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          status: "approved",
          notes: notes || null,
          created_by: null,
        })
      );

      await Promise.all(promises);
      toast.success(`Отсутствие добавлено для ${selectedOperatorIds.size} сотрудников`);
      
      // Reset form
      setSelectedOperatorIds(new Set());
      setStartDate(undefined);
      setEndDate(undefined);
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating bulk absences:", error);
      toast.error("Ошибка при создании отсутствий");
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedOperators = React.useMemo(() => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Массовое создание отсутствий
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
          {/* Left column: Operator selection */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <Label>Сотрудники</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedOperatorIds.size === operators.length ? "Снять все" : "Выбрать все"}
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-md p-2 min-h-[200px] max-h-[350px]">
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
          </div>

          {/* Right column: Absence details */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Тип отсутствия</Label>
              <Select value={absenceType} onValueChange={setAbsenceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ABSENCE_TYPE_LABELS)
                    .filter(([key]) => key !== 'administrative_leave') // Скрываем устаревший тип
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
                <Label>Дата начала</Label>
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
                      {startDate ? format(startDate, "d MMM yyyy", { locale: ru }) : "Выберите..."}
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
                <Label>Дата окончания</Label>
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
                      {endDate ? format(endDate, "d MMM yyyy", { locale: ru }) : "Выберите..."}
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

            <div className="space-y-2">
              <Label>Примечание (опционально)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: Корпоративный отпуск"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedOperatorIds.size === 0 || !startDate || !endDate}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Создать для {selectedOperatorIds.size} чел.
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
