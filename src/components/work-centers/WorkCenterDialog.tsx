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
import { Loader2, Wand2, Calculator } from "lucide-react";
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
  
  // Calculation parameters
  const [calcParams, setCalcParams] = useState({
    shifts: 1,
    machines: 1,
    hoursPerShift: 8,
    utilizationPercent: 100,
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

  // Calculate capacity and efficiency based on parameters
  const calculateCapacityAndEfficiency = (params: typeof calcParams) => {
    const capacityMinutes = params.shifts * params.machines * params.hoursPerShift * 60;
    return {
      capacity_minutes_per_day: capacityMinutes,
      efficiency_percent: params.utilizationPercent,
    };
  };

  // Reverse calculate params from capacity (for editing)
  const reverseCalculateParams = (capacity: number, efficiency: number) => {
    // Default: 1 shift, calculate machines based on 8-hour shift
    const hoursPerShift = 8;
    const shifts = 1;
    const totalHours = capacity / 60;
    const machines = Math.max(1, Math.round(totalHours / (shifts * hoursPerShift)));
    
    return {
      shifts,
      machines,
      hoursPerShift,
      utilizationPercent: efficiency,
    };
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
        setCalcParams(reverseCalculateParams(
          workCenter.capacity_minutes_per_day || 480,
          workCenter.efficiency_percent || 100
        ));
      } else {
        setFormData({
          code: "",
          name: "",
          department: "",
          status: "active",
          capacity_minutes_per_day: 480,
          efficiency_percent: 100,
        });
        setCalcParams({
          shifts: 1,
          machines: 1,
          hoursPerShift: 8,
          utilizationPercent: 100,
        });
        generateCode();
      }
    }
  }, [workCenter, open]);

  // Update capacity when calculation params change
  const handleCalcParamChange = (key: keyof typeof calcParams, value: number) => {
    const newParams = { ...calcParams, [key]: value };
    setCalcParams(newParams);
    
    const calculated = calculateCapacityAndEfficiency(newParams);
    setFormData(prev => ({
      ...prev,
      ...calculated,
    }));
  };

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
          {/* Basic info */}
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
          </div>

          {/* Capacity calculation */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              Расчёт мощности и эффективности
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shifts" className="text-xs">Смен в день</Label>
                <Input
                  id="shifts"
                  type="number"
                  value={calcParams.shifts}
                  onChange={(e) => handleCalcParamChange('shifts', Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="machines" className="text-xs">Станков/рабочих мест</Label>
                <Input
                  id="machines"
                  type="number"
                  value={calcParams.machines}
                  onChange={(e) => handleCalcParamChange('machines', Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hoursPerShift" className="text-xs">Часов в смене</Label>
                <Input
                  id="hoursPerShift"
                  type="number"
                  value={calcParams.hoursPerShift}
                  onChange={(e) => handleCalcParamChange('hoursPerShift', Math.max(1, parseInt(e.target.value) || 8))}
                  min="1"
                  max="24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utilization" className="text-xs">Коэфф. использования (%)</Label>
                <Input
                  id="utilization"
                  type="number"
                  value={calcParams.utilizationPercent}
                  onChange={(e) => handleCalcParamChange('utilizationPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 100)))}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Calculated results */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Мощность (мин/день)</Label>
                <div className="text-lg font-semibold">
                  {formData.capacity_minutes_per_day.toLocaleString('ru-RU')}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({(formData.capacity_minutes_per_day / 60).toFixed(1)} ч)
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Эффективность</Label>
                <div className="text-lg font-semibold">
                  {formData.efficiency_percent}%
                </div>
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
