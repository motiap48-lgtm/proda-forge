import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, AlertCircle, FileText, CheckCircle2, Trash2, RotateCcw, CalendarIcon, XCircle, AlertTriangle } from "lucide-react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCreateOvertimeEntry,
  useUpdateOvertimeEntry,
  useApproveOvertimeEntry,
  OvertimeEntry,
} from "@/hooks/useOvertimeEntries";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";
import { useOperators } from "@/hooks/useResourcePlanning";
import { getShiftForDate, isWorkingDay } from "@/components/resource-planning/shift-rotation/utils";

interface OvertimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  date: Date;
  entry?: OvertimeEntry | null;
  scheduledEndTime?: string; // e.g., "19:30"
  operators?: { id: string; full_name: string }[];
  onOperatorChange?: (id: string) => void;
  onDateChange?: (date: Date) => void;
  onDelete?: (entry: OvertimeEntry) => void;
}

export const OvertimeEntryDialog = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  date,
  entry,
  scheduledEndTime = "19:30",
  operators = [],
  onOperatorChange,
  onDateChange,
  onDelete,
}: OvertimeEntryDialogProps) => {
  const createEntry = useCreateOvertimeEntry();
  const updateEntry = useUpdateOvertimeEntry();
  const approveEntry = useApproveOvertimeEntry();
  const { data: productionOrders = [] } = useProductionOrders();
  const { data: allOperators = [] } = useOperators();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [startTime, setStartTime] = useState(scheduledEndTime);
  const [endTime, setEndTime] = useState("21:00");
  const [description, setDescription] = useState("");
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localDate, setLocalDate] = useState<Date>(date);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Get full operator data for shift validation
  const currentOperator = useMemo(() => 
    allOperators.find((op: any) => op.id === operatorId),
    [allOperators, operatorId]
  );

  // Calculate shift info for the selected date
  const shiftInfo = useMemo(() => {
    if (!currentOperator) return null;
    
    const schedule = currentOperator.work_schedules;
    if (!schedule) return null;
    
    const isWorking = isWorkingDay(schedule, localDate, currentOperator);
    if (!isWorking) return { isWorkingDay: false, shiftStart: null, shiftEnd: null };
    
    const shift = getShiftForDate(currentOperator, localDate);
    if (!shift) return { isWorkingDay: true, shiftStart: null, shiftEnd: null };
    
    return {
      isWorkingDay: true,
      shiftStart: shift.start_time?.slice(0, 5) || null,
      shiftEnd: shift.end_time?.slice(0, 5) || null,
      shiftName: shift.shift_name || `Смена ${shift.shift_number}`,
    };
  }, [currentOperator, localDate]);

  // Reset form when entry or open state changes
  useEffect(() => {
    if (entry) {
      setStartTime(entry.start_time?.slice(0, 5) || scheduledEndTime);
      setEndTime(entry.end_time?.slice(0, 5) || "21:00");
      setDescription(entry.description || "");
      setWorkOrderId(entry.work_order_id || "");
      setLocalDate(entry.work_date ? new Date(entry.work_date) : date);
    } else {
      setStartTime(scheduledEndTime);
      setEndTime("21:00");
      setDescription("");
      setWorkOrderId("");
      setLocalDate(date);
    }
  }, [entry, scheduledEndTime, open, date]);

  // Set smart defaults for new entries based on shift info
  useEffect(() => {
    if (!entry && shiftInfo?.isWorkingDay && shiftInfo?.shiftEnd) {
      setStartTime(shiftInfo.shiftEnd);
      const endHour = parseInt(shiftInfo.shiftEnd.split(':')[0]) + 2;
      setEndTime(`${String(Math.min(endHour, 23)).padStart(2, '0')}:00`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, shiftInfo?.isWorkingDay, shiftInfo?.shiftEnd]);

  const calculateDuration = (): number => {
    try {
      const start = parse(startTime, "HH:mm", new Date());
      const end = parse(endTime, "HH:mm", new Date());
      const diffMs = end.getTime() - start.getTime();
      return Math.max(0, Math.round(diffMs / (1000 * 60)));
    } catch {
      return 0;
    }
  };

  const durationMinutes = calculateDuration();
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = durationMinutes % 60;

  // Validate overtime time against shift hours
  const timeValidation = useMemo(() => {
    if (!shiftInfo?.isWorkingDay || !shiftInfo.shiftStart || !shiftInfo.shiftEnd) {
      // Non-working day - any time is allowed
      return { isValid: true, error: null };
    }

    const shiftStartMinutes = parseInt(shiftInfo.shiftStart.split(':')[0]) * 60 + parseInt(shiftInfo.shiftStart.split(':')[1]);
    const shiftEndMinutes = parseInt(shiftInfo.shiftEnd.split(':')[0]) * 60 + parseInt(shiftInfo.shiftEnd.split(':')[1]);
    
    const overtimeStartMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const overtimeEndMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    // Check if overtime overlaps with shift hours
    // Valid cases:
    // 1. Overtime ends before shift starts (before work)
    // 2. Overtime starts after shift ends (after work)
    
    const isBeforeShift = overtimeEndMinutes <= shiftStartMinutes;
    const isAfterShift = overtimeStartMinutes >= shiftEndMinutes;
    
    if (isBeforeShift || isAfterShift) {
      return { isValid: true, error: null };
    }

    return {
      isValid: false,
      error: `В рабочий день переработка возможна только до начала смены (до ${shiftInfo.shiftStart}) или после окончания (после ${shiftInfo.shiftEnd})`,
    };
  }, [shiftInfo, startTime, endTime]);

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      toast.error("Укажите время начала и окончания");
      return;
    }

    if (durationMinutes <= 0) {
      toast.error("Время окончания должно быть позже времени начала");
      return;
    }

    // Validate time against shift hours on working days
    if (!timeValidation.isValid) {
      toast.error(timeValidation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      if (entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          start_time: startTime,
          end_time: endTime,
          description,
          work_order_id: workOrderId || null,
          work_date: format(localDate, "yyyy-MM-dd"),
        });
        toast.success("Переработка обновлена");
      } else {
        await createEntry.mutateAsync({
          operator_id: operatorId,
          work_date: format(localDate, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
          description,
          work_order_id: workOrderId || null,
        });
        toast.success("Переработка добавлена");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Ошибка сохранения");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!entry) return;
    
    if (!description.trim()) {
      toast.error("Нельзя подтвердить переработку без описания выполненных работ");
      return;
    }

    setIsSubmitting(true);
    try {
      // First save any changes
      if (description !== entry.description || workOrderId !== entry.work_order_id) {
        await updateEntry.mutateAsync({
          id: entry.id,
          description,
          work_order_id: workOrderId || null,
        });
      }
      
      await approveEntry.mutateAsync(entry.id);
      toast.success("Переработка подтверждена");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Ошибка подтверждения");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!entry) return;
    
    setIsSubmitting(true);
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        status: 'cancelled',
      });
      toast.success("Переработка отменена");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Ошибка отмены");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeApproval = async () => {
    if (!entry) return;
    
    setIsSubmitting(true);
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        status: 'pending',
      });
      toast.success("Подтверждение отменено, переработку можно редактировать");
    } catch (error: any) {
      toast.error(error.message || "Ошибка отмены подтверждения");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeOrders = productionOrders.filter(
    (o: any) => o.status === 'in_progress' || o.status === 'planned'
  );

  const isApproved = entry?.status === 'approved';
  const canEdit = !isApproved; // Редактирование только после снятия подтверждения

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {entry ? "Редактировать переработку" : "Добавить переработку"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Operator & Date selection/info */}
          {!entry && operators.length > 0 && onOperatorChange && onDateChange ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Оператор</Label>
                <SearchableSelect
                  options={operators.map((op) => ({
                    value: op.id,
                    label: op.full_name,
                  }))}
                  value={operatorId}
                  onValueChange={(val) => val && onOperatorChange(val)}
                  placeholder="Выберите оператора..."
                  searchPlaceholder="Поиск по имени..."
                  emptyText="Оператор не найден"
                  clearable={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localDate ? format(localDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localDate}
                      onSelect={(d) => {
                        if (d) {
                          setLocalDate(d);
                          onDateChange(d);
                          setDatePopoverOpen(false);
                        }
                      }}
                      initialFocus
                      locale={ru}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="text-sm font-medium">{operatorName}</div>
              {/* Editable date for existing entry */}
              {entry && canEdit ? (
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full sm:w-auto justify-start text-left font-normal",
                        !localDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(localDate, "d MMMM yyyy (EEEE)", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localDate}
                      onSelect={(d) => {
                        if (d) {
                          setLocalDate(d);
                          setDatePopoverOpen(false);
                        }
                      }}
                      initialFocus
                      locale={ru}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {format(localDate, "d MMMM yyyy (EEEE)", { locale: ru })}
                </div>
              )}
              {entry && (
                <Badge 
                  variant={isApproved ? "default" : "secondary"} 
                  className="mt-1"
                >
                  {entry.status === 'pending' && "Ожидает подтверждения"}
                  {entry.status === 'approved' && "Подтверждено"}
                  {entry.status === 'cancelled' && "Отменено"}
                </Badge>
              )}
            </div>
          )}

          {/* Shift info for working days */}
          {shiftInfo?.isWorkingDay && shiftInfo.shiftStart && shiftInfo.shiftEnd && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Рабочий день:</span>
                <span>{shiftInfo.shiftName} ({shiftInfo.shiftStart} – {shiftInfo.shiftEnd})</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Переработка возможна до {shiftInfo.shiftStart} или после {shiftInfo.shiftEnd}
              </div>
            </div>
          )}

          {/* Non-working day info */}
          {shiftInfo && !shiftInfo.isWorkingDay && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Выходной день — переработка возможна в любое время</span>
              </div>
            </div>
          )}

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Начало</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canEdit}
                className={cn(!timeValidation.isValid && "border-destructive")}
              />
            </div>
            <div className="space-y-2">
              <Label>Окончание</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canEdit}
                className={cn(!timeValidation.isValid && "border-destructive")}
              />
            </div>
          </div>

          {/* Time validation error */}
          {!timeValidation.isValid && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span className="text-sm text-destructive">{timeValidation.error}</span>
            </div>
          )}

          {/* Duration display */}
          {durationMinutes > 0 && timeValidation.isValid && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Длительность: {durationHours > 0 && `${durationHours}ч `}{durationMins}мин
              </span>
            </div>
          )}

          {/* Work order selection */}
          <div className="space-y-2">
            <Label>Производственный заказ (опционально)</Label>
            <Select 
              value={workOrderId || "__none__"} 
              onValueChange={(val) => setWorkOrderId(val === "__none__" ? "" : val)} 
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите заказ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Без привязки</SelectItem>
                {activeOrders.map((order: any) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} — {order.products?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description - REQUIRED */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Описание работ *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, какие работы выполнялись во время переработки..."
              rows={3}
              disabled={!canEdit}
            />
            {!description.trim() && entry && (
              <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Заполните описание для подтверждения</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 pt-4 border-t sm:flex-col">
          {/* For pending entries */}
          {entry && entry.status === 'pending' && (
            <div className="flex flex-col gap-2 w-full">
              {/* Primary actions row */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting || !description.trim() || !timeValidation.isValid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Подтвердить
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !timeValidation.isValid}>
                  Сохранить
                </Button>
              </div>
              {/* Secondary actions row */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Отменить запись
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete(entry);
                    }}
                    disabled={isSubmitting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* For new entry */}
          {!entry && (
            <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !timeValidation.isValid}>
              Добавить
            </Button>
          )}
          
          {/* For approved entries - admin can revoke */}
          {entry?.status === 'approved' && (
            <div className="flex flex-col gap-2 w-full">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={handleRevokeApproval}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Снять подтверждение
                </Button>
              )}
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Закрыть
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete(entry);
                    }}
                    disabled={isSubmitting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* For cancelled entries */}
          {entry?.status === 'cancelled' && (
            <div className="flex flex-col gap-2 w-full">
              {/* Restore and save */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await updateEntry.mutateAsync({ id: entry.id, status: 'pending' });
                      toast.success("Переработка восстановлена");
                    } catch (error: any) {
                      toast.error(error.message || "Ошибка восстановления");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Восстановить
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !timeValidation.isValid}>
                  Сохранить
                </Button>
              </div>
              {/* Secondary actions */}
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Закрыть
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete(entry);
                    }}
                    disabled={isSubmitting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
