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
import { Loader2 } from "lucide-react";
import { useCreateWorkCenter, useUpdateWorkCenter } from "@/hooks/useWorkCenters";

interface WorkCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenter?: any;
}

export const WorkCenterDialog = ({ open, onOpenChange, workCenter }: WorkCenterDialogProps) => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    department: "",
    status: "active",
    capacity_minutes_per_day: 480,
    efficiency_percent: 100,
  });

  const createMutation = useCreateWorkCenter();
  const updateMutation = useUpdateWorkCenter();

  useEffect(() => {
    if (workCenter) {
      setFormData({
        code: workCenter.code || "",
        name: workCenter.name || "",
        department: workCenter.department || "",
        status: workCenter.status || "active",
        capacity_minutes_per_day: workCenter.capacity_minutes_per_day || 480,
        efficiency_percent: workCenter.efficiency_percent || 100,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        department: "",
        status: "active",
        capacity_minutes_per_day: 480,
        efficiency_percent: 100,
      });
    }
  }, [workCenter, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workCenter) {
      await updateMutation.mutateAsync({ id: workCenter.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {workCenter ? "Редактирование рабочего центра" : "Добавление рабочего центра"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о рабочем центре
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="WC-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Токарный участок"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Цех/Отдел</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Цех № 1"
              />
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
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="maintenance">На обслуживании</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Мощность (мин/день)</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity_minutes_per_day}
                onChange={(e) =>
                  setFormData({ ...formData, capacity_minutes_per_day: parseInt(e.target.value) })
                }
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="efficiency">Эффективность (%)</Label>
              <Input
                id="efficiency"
                type="number"
                value={formData.efficiency_percent}
                onChange={(e) =>
                  setFormData({ ...formData, efficiency_percent: parseInt(e.target.value) })
                }
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {workCenter ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
