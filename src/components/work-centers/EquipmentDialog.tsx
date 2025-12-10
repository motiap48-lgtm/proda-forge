import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, Wand2 } from "lucide-react";
import { useCreateEquipment, useUpdateEquipment } from "@/hooks/useEquipment";

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenterId: string;
  equipment?: any;
}

export const EquipmentDialog = ({
  open,
  onOpenChange,
  workCenterId,
  equipment,
}: EquipmentDialogProps) => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    equipment_type: "machine",
    status: "active",
    manufacturer: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    last_maintenance_date: "",
    next_maintenance_date: "",
    power_consumption_kwh: "",
    notes: "",
  });

  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  useEffect(() => {
    if (equipment) {
      setFormData({
        code: equipment.code || "",
        name: equipment.name || "",
        equipment_type: equipment.equipment_type || "machine",
        status: equipment.status || "active",
        manufacturer: equipment.manufacturer || "",
        model: equipment.model || "",
        serial_number: equipment.serial_number || "",
        purchase_date: equipment.purchase_date || "",
        last_maintenance_date: equipment.last_maintenance_date || "",
        next_maintenance_date: equipment.next_maintenance_date || "",
        power_consumption_kwh: equipment.power_consumption_kwh?.toString() || "",
        notes: equipment.notes || "",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        equipment_type: "machine",
        status: "active",
        manufacturer: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        last_maintenance_date: "",
        next_maintenance_date: "",
        power_consumption_kwh: "",
        notes: "",
      });
    }
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      work_center_id: workCenterId,
      purchase_date: formData.purchase_date || null,
      last_maintenance_date: formData.last_maintenance_date || null,
      next_maintenance_date: formData.next_maintenance_date || null,
      manufacturer: formData.manufacturer || null,
      model: formData.model || null,
      serial_number: formData.serial_number || null,
      power_consumption_kwh: formData.power_consumption_kwh ? parseFloat(formData.power_consumption_kwh) : null,
      notes: formData.notes || null,
    };

    if (equipment) {
      await updateMutation.mutateAsync({ id: equipment.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? "Редактирование оборудования" : "Добавление оборудования"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию об оборудовании
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код</Label>
              <div className="relative">
                <Input
                  id="code"
                  value={equipment ? formData.code : "Автоматически"}
                  readOnly
                  className="bg-muted pr-10"
                />
                <Wand2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Токарный станок"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment_type">Тип оборудования</Label>
              <Select
                value={formData.equipment_type}
                onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
              >
                <SelectTrigger id="equipment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Станок</SelectItem>
                  <SelectItem value="welding">Сварочное оборудование</SelectItem>
                  <SelectItem value="tool">Инструмент</SelectItem>
                  <SelectItem value="fixture">Оснастка</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активно</SelectItem>
                  <SelectItem value="maintenance">На обслуживании</SelectItem>
                  <SelectItem value="broken">Сломано</SelectItem>
                  <SelectItem value="inactive">Неактивно</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Производитель</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="ООО Производитель"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Модель</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Model-X100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Серийный номер</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="SN123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Дата покупки</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_maintenance_date">Последнее ТО</Label>
              <Input
                id="last_maintenance_date"
                type="date"
                value={formData.last_maintenance_date}
                onChange={(e) =>
                  setFormData({ ...formData, last_maintenance_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_maintenance_date">Следующее ТО</Label>
              <Input
                id="next_maintenance_date"
                type="date"
                value={formData.next_maintenance_date}
                onChange={(e) =>
                  setFormData({ ...formData, next_maintenance_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="power_consumption_kwh">Потребление, кВт/ч</Label>
              <Input
                id="power_consumption_kwh"
                type="number"
                step="0.01"
                min="0"
                value={formData.power_consumption_kwh}
                onChange={(e) =>
                  setFormData({ ...formData, power_consumption_kwh: e.target.value })
                }
                placeholder="15.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {equipment ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
