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
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, Save, CalendarRange } from "lucide-react";
import {
  useUpdateOperatorAbsence,
  useDeleteOperatorAbsence,
  ABSENCE_TYPE_LABELS,
  ABSENCE_STATUS_LABELS,
  type OperatorAbsence,
} from "@/hooks/useOperatorAbsences";
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

interface AbsenceCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absence: OperatorAbsence;
  operatorName: string;
}

export const AbsenceCellDialog = ({
  open,
  onOpenChange,
  absence,
  operatorName,
}: AbsenceCellDialogProps) => {
  const updateAbsence = useUpdateOperatorAbsence();
  const deleteAbsence = useDeleteOperatorAbsence();

  const [formData, setFormData] = useState({
    absence_type: absence.absence_type,
    start_date: absence.start_date,
    end_date: absence.end_date,
    status: absence.status,
    notes: absence.notes || "",
  });

  const typeInfo = ABSENCE_TYPE_LABELS[absence.absence_type];
  const statusInfo = ABSENCE_STATUS_LABELS[absence.status];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAbsence.mutate(
      { id: absence.id, ...formData },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteAbsence.mutate(absence.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Редактирование отсутствия
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operator info */}
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{operatorName}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(absence.start_date), "d MMM", { locale: ru })}
                {absence.start_date !== absence.end_date && (
                  <> — {format(new Date(absence.end_date), "d MMM yyyy", { locale: ru })}</>
                )}
              </div>
            </div>
            <Badge variant="secondary" className={`text-white ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
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

          <DialogFooter className="gap-2 sm:gap-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Удалить
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
                  <AlertDialogAction onClick={handleDelete}>
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={updateAbsence.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
