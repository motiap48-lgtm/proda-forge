import { useState } from "react";
import { format } from "date-fns";
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
import { CalendarPlus, Save } from "lucide-react";
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
}

export const CreateAbsenceCellDialog = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  initialDate,
}: CreateAbsenceCellDialogProps) => {
  const createAbsence = useCreateOperatorAbsence();

  const [formData, setFormData] = useState({
    absence_type: "annual_leave" as OperatorAbsence["absence_type"],
    start_date: initialDate,
    end_date: initialDate,
    status: "approved" as OperatorAbsence["status"],
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                Дата: {format(new Date(initialDate), "d MMMM yyyy", { locale: ru })}
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
                <SelectContent>
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
                <SelectContent>
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
              />
            </div>
          </div>

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
            <Button type="submit" disabled={createAbsence.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
