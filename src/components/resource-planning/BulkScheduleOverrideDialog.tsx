import React, { useState, useMemo } from "react";
import { format, eachDayOfInterval, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CalendarCheck, CalendarX, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OVERRIDE_REASON_LABELS,
  useBulkCreateScheduleOverrides,
} from "@/hooks/useScheduleOverrides";

interface BulkScheduleOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date;
}

export const BulkScheduleOverrideDialog: React.FC<BulkScheduleOverrideDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
}) => {
  const [isWorkingDay, setIsWorkingDay] = useState(false);
  const [reason, setReason] = useState("production_need");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const bulkCreate = useBulkCreateScheduleOverrides();

  // Calculate the dates in the range
  const dates = useMemo(() => {
    if (startDate > endDate) {
      return eachDayOfInterval({ start: endDate, end: startDate });
    }
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const handleSaveClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmedSave = () => {
    setShowConfirmation(false);
    
    const overrides = dates.map(date => ({
      operator_id: operatorId,
      override_date: format(date, "yyyy-MM-dd"),
      is_working_day: isWorkingDay,
      reason,
      notes: notes || null,
    }));

    bulkCreate.mutate(overrides, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Массовое изменение графика
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Operator and date range info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium">{operatorName}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-primary">
                {format(dates[0], "d MMM", { locale: ru })}
              </Badge>
              <span>→</span>
              <Badge variant="outline" className="text-primary">
                {format(dates[dates.length - 1], "d MMM", { locale: ru })}
              </Badge>
              <span className="text-xs">({dates.length} дн.)</span>
            </div>
          </div>

          {/* Working day toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="bulk-is-working-day" className="flex flex-col gap-1">
              <span>Статус дней</span>
              <span className="text-xs font-normal text-muted-foreground">
                {isWorkingDay ? "Рабочие дни" : "Выходные дни"}
              </span>
            </Label>
            <Switch
              id="bulk-is-working-day"
              checked={isWorkingDay}
              onCheckedChange={setIsWorkingDay}
            />
          </div>

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

          {/* Preview of dates */}
          <div className="space-y-2">
            <Label>Дни для изменения</Label>
            <div className="flex flex-wrap gap-1 p-2 rounded-lg border max-h-24 overflow-y-auto">
              {dates.map((date) => (
                <Badge 
                  key={date.toISOString()} 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    isWorkingDay 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  )}
                >
                  {format(date, "d MMM", { locale: ru })}
                </Badge>
              ))}
            </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveClick} disabled={bulkCreate.isPending}>
            {bulkCreate.isPending ? "Сохранение..." : `Применить к ${dates.length} дням`}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Подтверждение массового изменения
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Вы собираетесь изменить график для <strong>{operatorName}</strong>:
              </p>
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p>
                  <span className="text-muted-foreground">Период:</span>{" "}
                  <strong>
                    {format(dates[0], "d MMMM", { locale: ru })} — {format(dates[dates.length - 1], "d MMMM yyyy", { locale: ru })}
                  </strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Количество дней:</span>{" "}
                  <strong>{dates.length}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Новый статус:</span>{" "}
                  <Badge variant="outline" className={isWorkingDay ? "text-emerald-600" : "text-rose-500"}>
                    {isWorkingDay ? "Рабочие дни" : "Выходные дни"}
                  </Badge>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave}>
              Подтвердить изменение
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
