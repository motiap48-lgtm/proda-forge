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
import { CalendarCheck, CalendarX, Calendar, AlertTriangle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OVERRIDE_REASON_LABELS,
  useBulkCreateScheduleOverrides,
} from "@/hooks/useScheduleOverrides";
import { type OperatorTimesheet } from "@/hooks/useOperatorTimesheets";

interface BulkScheduleOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date;
  timesheetMap?: Map<string, OperatorTimesheet>;
}

export const BulkScheduleOverrideDialog: React.FC<BulkScheduleOverrideDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
  timesheetMap,
}) => {
  const [isWorkingDay, setIsWorkingDay] = useState(false);
  const [reason, setReason] = useState("production_need");
  const [notes, setNotes] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const bulkCreate = useBulkCreateScheduleOverrides();

  // Calculate the dates in the range
  const allDates = useMemo(() => {
    if (startDate > endDate) {
      return eachDayOfInterval({ start: endDate, end: startDate });
    }
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Filter out dates with filled timesheets
  const { validDates, skippedDates } = useMemo(() => {
    const valid: Date[] = [];
    const skipped: Date[] = [];
    
    allDates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const key = `${operatorId}_${dateStr}`;
      const ts = timesheetMap?.get(key);
      
      if (ts && ts.actual_minutes > 0) {
        skipped.push(date);
      } else {
        valid.push(date);
      }
    });
    
    return { validDates: valid, skippedDates: skipped };
  }, [allDates, operatorId, timesheetMap]);

  const handleSaveClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmedSave = () => {
    setShowConfirmation(false);
    
    // Only save valid dates (without filled timesheets)
    const overrides = validDates.map(date => ({
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
                {format(allDates[0], "d MMM", { locale: ru })}
              </Badge>
              <span>→</span>
              <Badge variant="outline" className="text-primary">
                {format(allDates[allDates.length - 1], "d MMM", { locale: ru })}
              </Badge>
              <span className="text-xs">({allDates.length} дн.)</span>
            </div>
          </div>

          {/* Warning about skipped dates */}
          {skippedDates.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ClipboardCheck className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {skippedDates.length} {skippedDates.length === 1 ? 'день пропущен' : 'дней пропущено'}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                На эти даты уже есть записи табеля, изменение графика невозможно:
              </p>
              <div className="flex flex-wrap gap-1">
                {skippedDates.slice(0, 7).map((date) => (
                  <Badge 
                    key={date.toISOString()} 
                    variant="outline" 
                    className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300"
                  >
                    {format(date, "d MMM", { locale: ru })}
                  </Badge>
                ))}
                {skippedDates.length > 7 && (
                  <Badge variant="outline" className="text-xs text-amber-600">
                    +{skippedDates.length - 7}
                  </Badge>
                )}
              </div>
            </div>
          )}

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
              <SelectContent position="popper">
                {Object.entries(OVERRIDE_REASON_LABELS).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    {icon} {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview of valid dates */}
          <div className="space-y-2">
            <Label>Дни для изменения ({validDates.length})</Label>
            <div className="flex flex-wrap gap-1 p-2 rounded-lg border max-h-24 overflow-y-auto">
              {validDates.length === 0 ? (
                <span className="text-sm text-muted-foreground">Нет доступных дней для изменения</span>
              ) : (
                validDates.map((date) => (
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
                ))
              )}
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
          <Button 
            onClick={handleSaveClick} 
            disabled={bulkCreate.isPending || validDates.length === 0}
          >
            {bulkCreate.isPending ? "Сохранение..." : `Применить к ${validDates.length} дням`}
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
                    {format(validDates[0], "d MMMM", { locale: ru })} — {format(validDates[validDates.length - 1], "d MMMM yyyy", { locale: ru })}
                  </strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Количество дней:</span>{" "}
                  <strong>{validDates.length}</strong>
                </p>
                {skippedDates.length > 0 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    <span className="text-muted-foreground">Пропущено (табель заполнен):</span>{" "}
                    <strong>{skippedDates.length}</strong>
                  </p>
                )}
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
