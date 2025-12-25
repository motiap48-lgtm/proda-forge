import { useState, useEffect } from "react";
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
import { Clock, AlertCircle, FileText, CheckCircle2, X, Trash2, RotateCcw } from "lucide-react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import {
  useCreateOvertimeEntry,
  useUpdateOvertimeEntry,
  useApproveOvertimeEntry,
  OvertimeEntry,
} from "@/hooks/useOvertimeEntries";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";

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
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [startTime, setStartTime] = useState(scheduledEndTime);
  const [endTime, setEndTime] = useState("21:00");
  const [description, setDescription] = useState("");
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setStartTime(entry.start_time?.slice(0, 5) || scheduledEndTime);
      setEndTime(entry.end_time?.slice(0, 5) || "21:00");
      setDescription(entry.description || "");
      setWorkOrderId(entry.work_order_id || "");
    } else {
      setStartTime(scheduledEndTime);
      setEndTime("21:00");
      setDescription("");
      setWorkOrderId("");
    }
  }, [entry, scheduledEndTime, open]);

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

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      toast.error("Укажите время начала и окончания");
      return;
    }

    if (durationMinutes <= 0) {
      toast.error("Время окончания должно быть позже времени начала");
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
        });
        toast.success("Переработка обновлена");
      } else {
        await createEntry.mutateAsync({
          operator_id: operatorId,
          work_date: format(date, "yyyy-MM-dd"),
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
  const canEdit = !isApproved || isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {entry ? "Редактировать переработку" : "Добавить переработку"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Operator & Date selection/info */}
          {!entry && operators.length > 0 && onOperatorChange && onDateChange ? (
            <div className="grid grid-cols-2 gap-4">
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
                <Input
                  type="date"
                  value={format(date, "yyyy-MM-dd")}
                  onChange={(e) => e.target.value && onDateChange(new Date(e.target.value))}
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">{operatorName}</div>
              <div className="text-sm text-muted-foreground">
                {format(date, "d MMMM yyyy (EEEE)", { locale: ru })}
              </div>
              {entry && (
                <Badge 
                  variant={isApproved ? "default" : "secondary"} 
                  className="mt-2"
                >
                  {entry.status === 'pending' && "Ожидает подтверждения"}
                  {entry.status === 'approved' && "Подтверждено"}
                  {entry.status === 'cancelled' && "Отменено"}
                </Badge>
              )}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Окончание</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Duration display */}
          {durationMinutes > 0 && (
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {entry && onDelete && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(entry);
                }}
                disabled={isSubmitting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            {entry && entry.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отменить
                </Button>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={isSubmitting || !description.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Подтвердить
                </Button>
              </>
            )}
            
            {(!entry || entry.status === 'pending') && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {entry ? "Сохранить" : "Добавить"}
              </Button>
            )}
            
            {entry?.status === 'approved' && (
              <>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRevokeApproval}
                      disabled={isSubmitting}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Отменить подтверждение
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      Сохранить
                    </Button>
                  </>
                )}
                {!isAdmin && (
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Закрыть
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
