import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { parseDateOnly } from "@/components/resource-planning/shift-rotation/utils";
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
import { CalendarPlus, Save, AlertCircle, Clock } from "lucide-react";
import {
  useCreateOperatorAbsence,
  ABSENCE_TYPE_LABELS,
  ABSENCE_STATUS_LABELS,
  isCompensableAbsenceType,
  type OperatorAbsence,
} from "@/hooks/useOperatorAbsences";

interface CreateAbsenceCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  initialDate: string;
  initialEndDate?: string; // For range selection
}

export const CreateAbsenceCellDialog = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  initialDate,
  initialEndDate,
}: CreateAbsenceCellDialogProps) => {
  const createAbsence = useCreateOperatorAbsence();

  const [formData, setFormData] = useState({
    absence_type: "annual_leave" as OperatorAbsence["absence_type"],
    start_date: initialDate,
    end_date: initialEndDate || initialDate,
    status: "approved" as OperatorAbsence["status"],
    notes: "",
  });

  // Синхронизируем formData при изменении initialDate/initialEndDate
  useEffect(() => {
    if (initialDate) {
      setFormData(prev => ({
        ...prev,
        start_date: initialDate,
        end_date: initialEndDate || initialDate,
      }));
    }
  }, [initialDate, initialEndDate]);

  // Горячие клавиши для быстрого выбора типа отсутствия
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус в текстовом поле
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'v':
        case 'м': // Russian 'м' for 'v' position
          e.preventDefault();
          setFormData(prev => ({ ...prev, absence_type: 'annual_leave' }));
          break;
        case 'b':
        case 'и': // Russian 'и' for 'b' position
          e.preventDefault();
          setFormData(prev => ({ ...prev, absence_type: 'sick_leave' }));
          break;
        case 'k':
        case 'л': // Russian 'л' for 'k' position
          e.preventDefault();
          setFormData(prev => ({ ...prev, absence_type: 'business_trip' }));
          break;
        case 'a':
        case 'ф': // Russian 'ф' for 'a' position
          e.preventDefault();
          setFormData(prev => ({ ...prev, absence_type: 'administrative_leave' }));
          break;
        case 'p':
        case 'з': // Russian 'з' for 'p' position
          e.preventDefault();
          // Прогул можно выбрать только до сегодняшнего дня включительно
          if (formData.end_date <= format(new Date(), "yyyy-MM-dd")) {
            setFormData(prev => ({ ...prev, absence_type: 'unauthorized_absence' }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Валидация: дата окончания не может быть раньше даты начала
  const isDateRangeValid = formData.start_date <= formData.end_date;

  // Проверка: прогул можно установить только до сегодняшнего дня включительно
  const today = format(new Date(), "yyyy-MM-dd");
  const isUnauthorizedAbsenceValid =
    formData.absence_type !== "unauthorized_absence" || formData.end_date <= today;

  // Для блокировки выбора типа: если выбранный диапазон содержит будущие даты
  const isDateInFuture = formData.end_date > today;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDateRangeValid) return;
    
    createAbsence.mutate(
      {
        operator_id: operatorId,
        ...formData,
        created_by: null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  // Calculate date range display - use parseDateOnly to avoid timezone shift
  const startParsed = parseDateOnly(formData.start_date);
  const endParsed = parseDateOnly(formData.end_date);
  const dateRangeDisplay = formData.start_date === formData.end_date
    ? format(startParsed ?? new Date(), "d MMMM yyyy", { locale: ru })
    : `${format(startParsed ?? new Date(), "d MMM", { locale: ru })} — ${format(endParsed ?? new Date(), "d MMM yyyy", { locale: ru })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Создание отсутствия
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operator info */}
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex-1">
              <div className="font-medium">{operatorName}</div>
              <div className="text-sm text-muted-foreground">
                Период: {dateRangeDisplay}
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-medium">Горячие клавиши:</span>
            <span><kbd className="px-1 py-0.5 bg-background rounded text-[9px] border">V</kbd> Отпуск</span>
            <span><kbd className="px-1 py-0.5 bg-background rounded text-[9px] border">B</kbd> Больничный</span>
            <span><kbd className="px-1 py-0.5 bg-background rounded text-[9px] border">K</kbd> Командировка</span>
            <span><kbd className="px-1 py-0.5 bg-background rounded text-[9px] border">A</kbd> Административный</span>
            <span><kbd className="px-1 py-0.5 bg-background rounded text-[9px] border">P</kbd> Прогул</span>
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
              <SelectContent position="popper">
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([key, { label, icon }]) => {
                    // Прогул недоступен для будущих дат
                    const isDisabled = key === "unauthorized_absence" && isDateInFuture;
                    return (
                      <SelectItem 
                        key={key} 
                        value={key} 
                        disabled={isDisabled}
                        className={isDisabled ? "opacity-50" : ""}
                      >
                        {icon} {label}
                        {isDisabled && " (только для прошедших дат)"}
                      </SelectItem>
                    );
                  })}
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
                <SelectContent position="popper">
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

          {/* Unauthorized absence validation error */}
          {!isUnauthorizedAbsenceValid && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Прогул можно установить только для прошедших дат
            </div>
          )}

          {/* Compensation info */}
          {isCompensableAbsenceType(formData.absence_type) && formData.status === 'approved' && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              <Clock className="h-4 w-4" />
              Этот тип отсутствия требует отработки
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

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={createAbsence.isPending || !isDateRangeValid || !isUnauthorizedAbsenceValid} 
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};