import { useState, useEffect } from "react";
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
import { Wand2 } from "lucide-react";
import { useCreateOperator, useUpdateOperator, useActiveWorkSchedules } from "@/hooks/useResourcePlanning";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";

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
  const { data: workSchedules } = useActiveWorkSchedules();
  const isEditing = !!operator;

  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
    employee_type: "operator",
    default_work_center_id: "",
    work_schedule_id: "",
    phone: "",
    email: "",
    hire_date: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (operator) {
      setFormData({
        full_name: operator.full_name || "",
        position: operator.position || "",
        employee_type: operator.employee_type || "operator",
        default_work_center_id: operator.default_work_center_id || "",
        work_schedule_id: operator.work_schedule_id || "",
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
              onValueChange={(value) => setFormData({ ...formData, work_schedule_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите график" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не указан</SelectItem>
                {workSchedules?.map((ws: any) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.code} - {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (xxx) xxx-xx-xx"
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
