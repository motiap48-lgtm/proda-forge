import React, { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CalendarX, Trash2, RefreshCw } from "lucide-react";
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
  scheduleType?: string;
  currentCycleStartDate?: string | null;
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
  scheduleType,
  currentCycleStartDate,
}) => {
  const [isWorkingDay, setIsWorkingDay] = useState(
    existingOverride?.is_working_day ?? !originalIsWorkingDay
  );
  const [reason, setReason] = useState(existingOverride?.reason || "production_need");
  const [shiftNumber, setShiftNumber] = useState<string>(
    existingOverride?.shift_number?.toString() || ""
  );
  const [notes, setNotes] = useState(existingOverride?.notes || "");
  // Check if this is a cyclic schedule that supports cycle shifting
  const isCyclicSchedule = scheduleType === "cyclic";
  
  // Determine if there's an actual change from original
  const isActualChange = isWorkingDay !== originalIsWorkingDay;
  
  // Show cycle shift option for cyclic schedules when there's an actual change
  const showCycleShiftOption = isCyclicSchedule && isActualChange;
  
  // Default: when making a day OFF - shift cycle to next day
  //          when making a day ON - shift cycle to THIS day (so it becomes day 1)
  const [shiftCycleStart, setShiftCycleStart] = useState(true);

  const createOverride = useCreateScheduleOverride();
  const deleteOverride = useDeleteScheduleOverride();

  // Calculate the new cycle start date
  // If making day OFF: cycle starts from next day
  // If making day ON: cycle starts from THIS day (this becomes day 1)
  const newCycleStartDate = useMemo(() => {
    if (isWorkingDay) {
      // Making this day a working day - this becomes day 1 of cycle
      return date;
    } else {
      // Making this day a day off - next day becomes day 1
      return addDays(date, 1);
    }
  }, [date, isWorkingDay]);

  const handleSave = () => {
    createOverride.mutate({
      operator_id: operatorId,
      override_date: format(date, "yyyy-MM-dd"),
      is_working_day: isWorkingDay,
      shift_number: shiftNumber ? parseInt(shiftNumber) : null,
      reason,
      notes: notes || null,
      shift_cycle_start_date: showCycleShiftOption && shiftCycleStart 
        ? format(newCycleStartDate, "yyyy-MM-dd") 
        : null,
      current_cycle_start_date: showCycleShiftOption && shiftCycleStart && currentCycleStartDate
        ? currentCycleStartDate
        : null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleDelete = () => {
    if (existingOverride) {
      // Check if we need to restore the original cycle start date
      const originalCycleDate = (existingOverride as any).original_cycle_start_date;
      deleteOverride.mutate({
        id: existingOverride.id,
        restoreCycleStartDate: originalCycleDate ? {
          operatorId: operatorId,
          date: originalCycleDate,
        } : undefined,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleResetToDefault = () => {
    if (existingOverride) {
      // Check if we need to restore the original cycle start date
      const originalCycleDate = (existingOverride as any).original_cycle_start_date;
      deleteOverride.mutate({
        id: existingOverride.id,
        restoreCycleStartDate: originalCycleDate ? {
          operatorId: operatorId,
          date: originalCycleDate,
        } : undefined,
      }, {
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
              onCheckedChange={(checked) => {
                setIsWorkingDay(checked);
                // For cyclic schedules, default to shifting cycle when making an actual change
                const willBeActualChange = checked !== originalIsWorkingDay;
                setShiftCycleStart(isCyclicSchedule && willBeActualChange);
              }}
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

          {/* Cycle shift option - only for cyclic schedules when setting day off */}
          {showCycleShiftOption && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="shift-cycle"
                  checked={shiftCycleStart}
                  onCheckedChange={(checked) => setShiftCycleStart(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="shift-cycle" className="flex flex-col gap-1 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    Пересчитать цикл
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {isWorkingDay 
                      ? `Этот день (${format(date, "d MMMM", { locale: ru })}) станет первым днём нового цикла`
                      : `Следующий рабочий день (${format(newCycleStartDate, "d MMMM", { locale: ru })}) станет первым днём нового цикла`
                    }
                  </span>
                </Label>
              </div>
              {currentCycleStartDate && (
                <p className="text-xs text-muted-foreground ml-6">
                  Текущее начало цикла: {format(new Date(currentCycleStartDate), "d MMMM yyyy", { locale: ru })}
                </p>
              )}
            </div>
          )}

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
