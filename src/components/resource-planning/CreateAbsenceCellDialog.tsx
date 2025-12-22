import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { CalendarPlus, Save, AlertCircle } from "lucide-react";
import {
  useCreateOperatorAbsence,
  ABSENCE_TYPE_LABELS,
  ABSENCE_STATUS_LABELS,
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

  // Валидация: дата окончания не может быть раньше даты начала
  const isDateRangeValid = formData.start_date <= formData.end_date;

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

  // Calculate date range display
  const dateRangeDisplay = formData.start_date === formData.end_date
    ? format(parseISO(formData.start_date), "d MMMM yyyy", { locale: ru })
    : `${format(parseISO(formData.start_date), "d MMM", { locale: ru })} — ${format(parseISO(formData.end_date), "d MMM yyyy", { locale: ru })}`;

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
                <SelectContent position="popper" className="z-[200]">
                  {Object.entries(ABSENCE_TYPE_LABELS).map(([key, { label, icon }]) => (
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
                <SelectContent position="popper" className="z-[200]">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createAbsence.isPending || !isDateRangeValid} 
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