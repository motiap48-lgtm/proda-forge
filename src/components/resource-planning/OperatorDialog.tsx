import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Wand2, RefreshCw, CalendarDays } from "lucide-react";
import { useCreateOperator, useUpdateOperator, useWorkSchedules } from "@/hooks/useResourcePlanning";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";
import { format, differenceInWeeks } from "date-fns";

// Format phone number to +7(xxx)xxx-xx-xx
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Handle different starting patterns
  let cleanDigits = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    cleanDigits = '7' + digits.slice(1);
  } else if (digits.startsWith('7')) {
    cleanDigits = digits;
  } else if (digits.length > 0) {
    cleanDigits = '7' + digits;
  }
  
  // Limit to 11 digits (7 + 10 digits)
  cleanDigits = cleanDigits.slice(0, 11);
  
  // Format the number
  if (cleanDigits.length === 0) return '';
  if (cleanDigits.length <= 1) return '+' + cleanDigits;
  if (cleanDigits.length <= 4) return `+${cleanDigits[0]}(${cleanDigits.slice(1)}`;
  if (cleanDigits.length <= 7) return `+${cleanDigits[0]}(${cleanDigits.slice(1, 4)})${cleanDigits.slice(4)}`;
  if (cleanDigits.length <= 9) return `+${cleanDigits[0]}(${cleanDigits.slice(1, 4)})${cleanDigits.slice(4, 7)}-${cleanDigits.slice(7)}`;
  return `+${cleanDigits[0]}(${cleanDigits.slice(1, 4)})${cleanDigits.slice(4, 7)}-${cleanDigits.slice(7, 9)}-${cleanDigits.slice(9)}`;
};

// Helper to calculate current shift based on rotation
const getCurrentShiftNumber = (
  shiftRotationEnabled: boolean,
  shiftRotationStartDate: string | null,
  assignedShiftNumber: number | null,
  totalShifts: number
): number | null => {
  if (!shiftRotationEnabled || !shiftRotationStartDate || totalShifts < 2) {
    return assignedShiftNumber;
  }
  
  const startDate = new Date(shiftRotationStartDate);
  const today = new Date();
  const weeksDiff = differenceInWeeks(today, startDate);
  // If weeksDiff is even, they're on shift 1; if odd, shift 2
  const currentShift = ((weeksDiff % totalShifts) + 1);
  return currentShift;
};

interface OperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator?: any;
}

export const OperatorDialog = ({
  open,
  onOpenChange,
  operator,
}: OperatorDialogProps) => {
  const createOperator = useCreateOperator();
  const updateOperator = useUpdateOperator();
  const { data: workCenters } = useActiveWorkCenters();
  const { data: workSchedules } = useWorkSchedules();
  const isEditing = !!operator;

  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
    employee_type: "operator",
    default_work_center_id: "",
    work_schedule_id: "",
    assigned_shift_number: null as number | null,
    shift_rotation_enabled: false,
    shift_rotation_start_date: "",
    phone: "",
    email: "",
    hire_date: "",
    notes: "",
    is_active: true,
  });

  // Get selected schedule's shifts
  const selectedSchedule = useMemo(() => {
    return workSchedules?.find((ws: any) => ws.id === formData.work_schedule_id);
  }, [workSchedules, formData.work_schedule_id]);

  const scheduleShifts = useMemo(() => {
    return selectedSchedule?.work_schedule_shifts || [];
  }, [selectedSchedule]);

  // Calculate current shift for display
  const currentShiftDisplay = useMemo(() => {
    if (!formData.work_schedule_id || scheduleShifts.length === 0) return null;
    
    const currentShift = getCurrentShiftNumber(
      formData.shift_rotation_enabled,
      formData.shift_rotation_start_date,
      formData.assigned_shift_number,
      scheduleShifts.length
    );
    
    if (!currentShift) return null;
    
    const shift = scheduleShifts.find((s: any) => s.shift_number === currentShift);
    return shift ? { number: currentShift, name: shift.shift_name, minutes: shift.net_work_minutes || shift.gross_work_minutes - shift.break_minutes } : null;
  }, [formData, scheduleShifts]);

  useEffect(() => {
    if (operator) {
      setFormData({
        full_name: operator.full_name || "",
        position: operator.position || "",
        employee_type: operator.employee_type || "operator",
        default_work_center_id: operator.default_work_center_id || "",
        work_schedule_id: operator.work_schedule_id || "",
        assigned_shift_number: operator.assigned_shift_number || null,
        shift_rotation_enabled: operator.shift_rotation_enabled || false,
        shift_rotation_start_date: operator.shift_rotation_start_date || "",
        phone: operator.phone || "",
        email: operator.email || "",
        hire_date: operator.hire_date || "",
        notes: operator.notes || "",
        is_active: operator.is_active ?? true,
      });
    } else {
      setFormData({
        full_name: "",
        position: "",
        employee_type: "operator",
        default_work_center_id: "",
        work_schedule_id: "",
        assigned_shift_number: null,
        shift_rotation_enabled: false,
        shift_rotation_start_date: "",
        phone: "",
        email: "",
        hire_date: "",
        notes: "",
        is_active: true,
      });
    }
  }, [operator, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      default_work_center_id: formData.default_work_center_id || null,
      work_schedule_id: formData.work_schedule_id || null,
      assigned_shift_number: formData.assigned_shift_number || null,
      shift_rotation_start_date: formData.shift_rotation_start_date || null,
      hire_date: formData.hire_date || null,
    };

    if (isEditing) {
      updateOperator.mutate(
        { id: operator.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createOperator.mutate(
        { ...data, code: "AUTO" },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактировать оператора" : "Новый оператор"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Код</Label>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <Input
                value={isEditing ? operator.code : "Авто"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">ФИО *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Оператор станка"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_type">Тип сотрудника</Label>
              <Select
                value={formData.employee_type}
                onValueChange={(value) => setFormData({ ...formData, employee_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Станочник</SelectItem>
                  <SelectItem value="assembler">Сборщик</SelectItem>
                  <SelectItem value="welder">Сварщик</SelectItem>
                  <SelectItem value="painter">Маляр</SelectItem>
                  <SelectItem value="universal">Универсал</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_work_center_id">Основной участок</Label>
            <Select
              value={formData.default_work_center_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, default_work_center_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите участок" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не указан</SelectItem>
                {workCenters?.map((wc: any) => (
                  <SelectItem key={wc.id} value={wc.id}>
                    {wc.code} - {wc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_schedule_id">График работы</Label>
            <Select
              value={formData.work_schedule_id || "none"}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                work_schedule_id: value === "none" ? "" : value,
                assigned_shift_number: null,
                shift_rotation_enabled: false,
                shift_rotation_start_date: ""
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите график" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не указан</SelectItem>
                {workSchedules?.filter((ws: any) => ws.is_active).map((ws: any) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.code} - {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shift assignment section - only show if schedule has multiple shifts */}
          {formData.work_schedule_id && scheduleShifts.length > 1 && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                Назначение смены
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_shift_number">
                  {formData.shift_rotation_enabled ? "Начальная смена" : "Рабочая смена"}
                </Label>
                <Select
                  value={formData.assigned_shift_number?.toString() || "none"}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    assigned_shift_number: value === "none" ? null : parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите смену" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указана</SelectItem>
                    {scheduleShifts.map((shift: any) => (
                      <SelectItem key={shift.id} value={shift.shift_number.toString()}>
                        Смена {shift.shift_number}: {shift.shift_name} ({shift.net_work_minutes || shift.gross_work_minutes - shift.break_minutes} мин)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="shift_rotation_enabled" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Ротация смен
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Чередование смен по неделям
                  </p>
                </div>
                <Switch
                  id="shift_rotation_enabled"
                  checked={formData.shift_rotation_enabled}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    shift_rotation_enabled: checked,
                    shift_rotation_start_date: checked ? format(new Date(), "yyyy-MM-dd") : ""
                  })}
                />
              </div>

              {formData.shift_rotation_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="shift_rotation_start_date">
                    Дата начала на Смене {formData.assigned_shift_number || 1}
                  </Label>
                  <Input
                    id="shift_rotation_start_date"
                    type="date"
                    value={formData.shift_rotation_start_date}
                    onChange={(e) => setFormData({ ...formData, shift_rotation_start_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Укажите дату начала недели, когда оператор работал на выбранной смене
                  </p>
                </div>
              )}

              {/* Current shift display */}
              {currentShiftDisplay && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm font-medium">
                    Текущая смена: {currentShiftDisplay.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Выработка: {currentShiftDisplay.minutes} мин/день
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show single shift info if schedule has only one shift */}
          {formData.work_schedule_id && scheduleShifts.length === 1 && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="font-medium">{scheduleShifts[0].shift_name}</div>
              <div className="text-muted-foreground">
                Выработка: {scheduleShifts[0].net_work_minutes || scheduleShifts[0].gross_work_minutes - scheduleShifts[0].break_minutes} мин/день
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                placeholder="+7(xxx)xxx-xx-xx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire_date">Дата приёма</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Активен</Label>
              <p className="text-sm text-muted-foreground">
                Доступен для назначений
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createOperator.isPending || updateOperator.isPending}>
              {isEditing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
