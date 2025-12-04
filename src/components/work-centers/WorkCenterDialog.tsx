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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2 } from "lucide-react";
import { useCreateWorkCenter, useUpdateWorkCenter } from "@/hooks/useWorkCenters";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  const createMutation = useCreateWorkCenter();
  const updateMutation = useUpdateWorkCenter();

  // Generate code for new work center
  const generateCode = async () => {
    setIsLoadingCode(true);
    try {
      const { data, error } = await supabase.rpc('generate_work_center_code');
      if (!error && data) {
        setFormData(prev => ({ ...prev, code: data }));
      }
    } catch (err) {
      console.error('Error generating code:', err);
    } finally {
      setIsLoadingCode(false);
    }
  };

  // Calculate efficiency based on capacity (standard 8-hour day = 480 min = 100%)
  const calculateEfficiency = (capacity: number) => {
    const standardCapacity = 480; // 8 hours standard
    return Math.round((capacity / standardCapacity) * 100);
  };

  useEffect(() => {
    if (open) {
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
        // Reset form and generate new code
        setFormData({
          code: "",
          name: "",
          department: "",
          status: "active",
          capacity_minutes_per_day: 480,
          efficiency_percent: 100,
        });
        generateCode();
      }
    }
  }, [workCenter, open]);

  // Auto-calculate efficiency when capacity changes
  const handleCapacityChange = (capacity: number) => {
    const efficiency = calculateEfficiency(capacity);
    setFormData(prev => ({
      ...prev,
      capacity_minutes_per_day: capacity,
      efficiency_percent: efficiency,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workCenter) {
      await updateMutation.mutateAsync({ id: workCenter.id, ...formData });
    } else {
      // Server will auto-generate code if empty
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
              <div className="relative">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="Автоматически"
                  readOnly={!workCenter}
                  className={!workCenter ? "bg-muted pr-10" : ""}
                />
                {!workCenter && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isLoadingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
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
                onChange={(e) => handleCapacityChange(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="efficiency">
                Эффективность (%)
                <span className="ml-2 text-xs text-muted-foreground">авто</span>
              </Label>
              <div className="relative">
                <Input
                  id="efficiency"
                  type="number"
                  value={formData.efficiency_percent}
                  readOnly
                  className="bg-muted pr-10"
                />
                <Wand2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
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
