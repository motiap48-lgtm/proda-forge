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
import { useCreateWorkSchedule, useUpdateWorkSchedule } from "@/hooks/useResourcePlanning";

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: any;
}

export const WorkScheduleDialog = ({
  open,
  onOpenChange,
  schedule,
}: WorkScheduleDialogProps) => {
  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();
  const isEditing = !!schedule;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule_type: "shift",
    cycle_days_on: 2,
    cycle_days_off: 2,
    is_active: true,
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name || "",
        description: schedule.description || "",
        schedule_type: schedule.schedule_type || "shift",
        cycle_days_on: schedule.cycle_days_on || 2,
        cycle_days_off: schedule.cycle_days_off || 2,
        is_active: schedule.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        schedule_type: "shift",
        cycle_days_on: 2,
        cycle_days_off: 2,
        is_active: true,
      });
    }
  }, [schedule, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      updateSchedule.mutate(
        { id: schedule.id, ...formData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createSchedule.mutate(
        { ...formData, code: "AUTO" },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактировать график" : "Новый график работы"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Код</Label>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <Input
                value={isEditing ? schedule.code : "Авто"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: График 2/2 (12 часов)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule_type">Тип графика</Label>
            <Select
              value={formData.schedule_type}
              onValueChange={(value) => setFormData({ ...formData, schedule_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shift">Сменный</SelectItem>
                <SelectItem value="weekly">Пятидневка</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cycle_days_on">Рабочих дней</Label>
              <Input
                id="cycle_days_on"
                type="number"
                min={1}
                value={formData.cycle_days_on}
                onChange={(e) =>
                  setFormData({ ...formData, cycle_days_on: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle_days_off">Выходных дней</Label>
              <Input
                id="cycle_days_off"
                type="number"
                min={0}
                value={formData.cycle_days_off}
                onChange={(e) =>
                  setFormData({ ...formData, cycle_days_off: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание графика работы"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Активен</Label>
              <p className="text-sm text-muted-foreground">
                Доступен для использования
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
            <Button type="submit" disabled={createSchedule.isPending || updateSchedule.isPending}>
              {isEditing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
