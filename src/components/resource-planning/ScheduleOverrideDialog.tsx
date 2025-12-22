import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, Trash2 } from "lucide-react";
import {
  ScheduleOverride,
  OVERRIDE_REASON_LABELS,
  useCreateScheduleOverride,
  useDeleteScheduleOverride,
} from "@/hooks/useScheduleOverrides";

interface ScheduleOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  date: Date;
  originalIsWorkingDay: boolean;
  existingOverride?: ScheduleOverride;
  shifts?: { shift_number: number; shift_name: string }[];
}

export const ScheduleOverrideDialog: React.FC<ScheduleOverrideDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  date,
  originalIsWorkingDay,
  existingOverride,
  shifts = [],
}) => {
  const [isWorkingDay, setIsWorkingDay] = useState(
    existingOverride?.is_working_day ?? !originalIsWorkingDay
  );
  const [reason, setReason] = useState(existingOverride?.reason || "production_need");
  const [shiftNumber, setShiftNumber] = useState<string>(
    existingOverride?.shift_number?.toString() || ""
  );
  const [notes, setNotes] = useState(existingOverride?.notes || "");

  const createOverride = useCreateScheduleOverride();
  const deleteOverride = useDeleteScheduleOverride();

  const handleSave = () => {
    createOverride.mutate({
      operator_id: operatorId,
      override_date: format(date, "yyyy-MM-dd"),
      is_working_day: isWorkingDay,
      shift_number: shiftNumber ? parseInt(shiftNumber) : null,
      reason,
      notes: notes || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleDelete = () => {
    if (existingOverride) {
      deleteOverride.mutate(existingOverride.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleResetToDefault = () => {
    if (existingOverride) {
      deleteOverride.mutate(existingOverride.id, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWorkingDay ? (
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
            ) : (
              <CalendarX className="h-5 w-5 text-rose-500" />
            )}
            Изменение графика
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Operator and date info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium">{operatorName}</p>
            <p className="text-sm text-muted-foreground">
              {format(date, "EEEE, d MMMM yyyy", { locale: ru })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={originalIsWorkingDay ? "text-emerald-600" : "text-rose-500"}>
                По графику: {originalIsWorkingDay ? "Рабочий день" : "Выходной"}
              </Badge>
              {existingOverride && (
                <Badge variant="secondary" className="text-amber-600">
                  Есть изменение
                </Badge>
              )}
            </div>
          </div>

          {/* Working day toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is-working-day" className="flex flex-col gap-1">
              <span>Статус дня</span>
              <span className="text-xs font-normal text-muted-foreground">
                {isWorkingDay ? "Рабочий день" : "Выходной день"}
              </span>
            </Label>
            <Switch
              id="is-working-day"
              checked={isWorkingDay}
              onCheckedChange={setIsWorkingDay}
            />
          </div>

          {/* Shift selection (only if working day) */}
          {isWorkingDay && shifts.length > 1 && (
            <div className="space-y-2">
              <Label>Смена</Label>
              <Select value={shiftNumber} onValueChange={setShiftNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="По умолчанию" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="">По умолчанию</SelectItem>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.shift_number} value={shift.shift_number.toString()}>
                      {shift.shift_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Причина</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200]">
                {Object.entries(OVERRIDE_REASON_LABELS).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Примечание</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {existingOverride && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={handleResetToDefault}>
            {existingOverride ? "Вернуть по графику" : "Отмена"}
          </Button>
          <Button onClick={handleSave} disabled={createOverride.isPending}>
            {createOverride.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
