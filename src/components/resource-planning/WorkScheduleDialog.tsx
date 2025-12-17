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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wand2, Plus, Trash2, Clock, Coffee } from "lucide-react";
import { 
  useCreateWorkSchedule, 
  useUpdateWorkSchedule,
  useCreateWorkScheduleShift,
  useUpdateWorkScheduleShift,
  useDeleteWorkScheduleShift,
  useCreateWorkScheduleBreak,
  useUpdateWorkScheduleBreak,
  useDeleteWorkScheduleBreak
} from "@/hooks/useResourcePlanning";

interface ShiftData {
  id?: string;
  shift_name: string;
  shift_number: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  breaks: BreakData[];
}

interface BreakData {
  id?: string;
  break_name: string;
  start_time: string;
  duration_minutes: number;
  is_paid: boolean;
}

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
  const createShift = useCreateWorkScheduleShift();
  const updateShiftMutation = useUpdateWorkScheduleShift();
  const deleteShift = useDeleteWorkScheduleShift();
  const createBreak = useCreateWorkScheduleBreak();
  const updateBreakMutation = useUpdateWorkScheduleBreak();
  const deleteBreak = useDeleteWorkScheduleBreak();
  
  const isEditing = !!schedule;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule_type: "shift",
    cycle_days_on: 2,
    cycle_days_off: 2,
    is_active: true,
  });

  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [pendingShifts, setPendingShifts] = useState<ShiftData[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

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
      
      // Load existing shifts with breaks
      const existingShifts: ShiftData[] = (schedule.work_schedule_shifts || []).map((shift: any) => ({
        id: shift.id,
        shift_name: shift.shift_name,
        shift_number: shift.shift_number,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        breaks: (shift.work_schedule_breaks || []).map((b: any) => ({
          id: b.id,
          break_name: b.break_name,
          start_time: b.start_time,
          duration_minutes: b.duration_minutes,
          is_paid: b.is_paid,
        })),
      }));
      setShifts(existingShifts);
      setPendingShifts([]);
    } else {
      setFormData({
        name: "",
        description: "",
        schedule_type: "shift",
        cycle_days_on: 2,
        cycle_days_off: 2,
        is_active: true,
      });
      setShifts([]);
      setPendingShifts([]);
    }
  }, [schedule, open]);

  const addShift = () => {
    const newShift: ShiftData = {
      shift_name: `Смена ${shifts.length + pendingShifts.length + 1}`,
      shift_number: shifts.length + pendingShifts.length + 1,
      start_time: "08:00",
      end_time: "20:00",
      break_minutes: 50,
      breaks: [
        { break_name: "Обед", start_time: "12:00", duration_minutes: 30, is_paid: false },
        { break_name: "Перерыв 1", start_time: "10:00", duration_minutes: 10, is_paid: true },
        { break_name: "Перерыв 2", start_time: "15:00", duration_minutes: 10, is_paid: true },
      ],
    };
    setPendingShifts([...pendingShifts, newShift]);
  };

  const updatePendingShift = (index: number, field: keyof ShiftData, value: any) => {
    const updated = [...pendingShifts];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate break_minutes when breaks change
    if (field === "breaks") {
      updated[index].break_minutes = value.reduce((sum: number, b: BreakData) => sum + b.duration_minutes, 0);
    }
    
    setPendingShifts(updated);
  };

  const removePendingShift = (index: number) => {
    setPendingShifts(pendingShifts.filter((_, i) => i !== index));
  };

  const addBreakToShift = (shiftIndex: number) => {
    const updated = [...pendingShifts];
    const shift = updated[shiftIndex];
    shift.breaks.push({
      break_name: `Перерыв ${shift.breaks.length + 1}`,
      start_time: "14:00",
      duration_minutes: 10,
      is_paid: true,
    });
    shift.break_minutes = shift.breaks.reduce((sum, b) => sum + b.duration_minutes, 0);
    setPendingShifts(updated);
  };

  const updateBreak = (shiftIndex: number, breakIndex: number, field: keyof BreakData, value: any) => {
    const updated = [...pendingShifts];
    updated[shiftIndex].breaks[breakIndex] = {
      ...updated[shiftIndex].breaks[breakIndex],
      [field]: value,
    };
    updated[shiftIndex].break_minutes = updated[shiftIndex].breaks.reduce((sum, b) => sum + b.duration_minutes, 0);
    setPendingShifts(updated);
  };

  const removeBreak = (shiftIndex: number, breakIndex: number) => {
    const updated = [...pendingShifts];
    updated[shiftIndex].breaks = updated[shiftIndex].breaks.filter((_, i) => i !== breakIndex);
    updated[shiftIndex].break_minutes = updated[shiftIndex].breaks.reduce((sum, b) => sum + b.duration_minutes, 0);
    setPendingShifts(updated);
  };

  const removeExistingShift = async (shiftId: string) => {
    await deleteShift.mutateAsync(shiftId);
    setShifts(shifts.filter(s => s.id !== shiftId));
  };

  const removeExistingBreak = async (breakId: string, shiftId: string) => {
    await deleteBreak.mutateAsync(breakId);
    setShifts(shifts.map(s => {
      if (s.id === shiftId) {
        return {
          ...s,
          breaks: s.breaks.filter(b => b.id !== breakId),
          break_minutes: s.breaks.filter(b => b.id !== breakId).reduce((sum, b) => sum + b.duration_minutes, 0),
        };
      }
      return s;
    }));
  };

  const updateExistingShift = (shiftId: string, field: keyof ShiftData, value: any) => {
    setShifts(shifts.map(s => {
      if (s.id === shiftId) {
        const updated = { ...s, [field]: value };
        if (field === "breaks") {
          updated.break_minutes = value.reduce((sum: number, b: BreakData) => sum + b.duration_minutes, 0);
        }
        return updated;
      }
      return s;
    }));
  };

  const updateExistingBreak = (shiftId: string, breakIndex: number, field: keyof BreakData, value: any) => {
    setShifts(shifts.map(s => {
      if (s.id === shiftId) {
        const newBreaks = [...s.breaks];
        newBreaks[breakIndex] = { ...newBreaks[breakIndex], [field]: value };
        return {
          ...s,
          breaks: newBreaks,
          break_minutes: newBreaks.reduce((sum, b) => sum + b.duration_minutes, 0),
        };
      }
      return s;
    }));
  };

  const addBreakToExistingShift = (shiftId: string) => {
    setShifts(shifts.map(s => {
      if (s.id === shiftId) {
        const newBreaks = [...s.breaks, {
          break_name: `Перерыв ${s.breaks.length + 1}`,
          start_time: "14:00",
          duration_minutes: 10,
          is_paid: true,
        }];
        return {
          ...s,
          breaks: newBreaks,
          break_minutes: newBreaks.reduce((sum, b) => sum + b.duration_minutes, 0),
        };
      }
      return s;
    }));
  };

  const removeExistingBreakLocal = (shiftId: string, breakIndex: number) => {
    setShifts(shifts.map(s => {
      if (s.id === shiftId) {
        const newBreaks = s.breaks.filter((_, i) => i !== breakIndex);
        return {
          ...s,
          breaks: newBreaks,
          break_minutes: newBreaks.reduce((sum, b) => sum + b.duration_minutes, 0),
        };
      }
      return s;
    }));
  };

  const calculateGrossMinutes = (start: string, end: string): number => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) endTotal += 24 * 60; // overnight shift
    return endTotal - startTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      await updateSchedule.mutateAsync({ id: schedule.id, ...formData });
      
      // Update existing shifts
      for (const shift of shifts) {
        const grossMinutes = calculateGrossMinutes(shift.start_time, shift.end_time);
        await updateShiftMutation.mutateAsync({
          id: shift.id,
          shift_name: shift.shift_name,
          shift_number: shift.shift_number,
          start_time: shift.start_time,
          end_time: shift.end_time,
          gross_work_minutes: grossMinutes,
          break_minutes: shift.break_minutes,
        });
        
        // Update existing breaks and create new ones
        for (const breakItem of shift.breaks) {
          if (breakItem.id) {
            await updateBreakMutation.mutateAsync({
              id: breakItem.id,
              break_name: breakItem.break_name,
              start_time: breakItem.start_time,
              duration_minutes: breakItem.duration_minutes,
              is_paid: breakItem.is_paid,
            });
          } else {
            await createBreak.mutateAsync({
              shift_id: shift.id,
              break_name: breakItem.break_name,
              start_time: breakItem.start_time,
              duration_minutes: breakItem.duration_minutes,
              is_paid: breakItem.is_paid,
            });
          }
        }
      }
      
      // Create pending shifts
      for (const shift of pendingShifts) {
        const grossMinutes = calculateGrossMinutes(shift.start_time, shift.end_time);
        const shiftData = await createShift.mutateAsync({
          work_schedule_id: schedule.id,
          shift_name: shift.shift_name,
          shift_number: shift.shift_number,
          start_time: shift.start_time,
          end_time: shift.end_time,
          gross_work_minutes: grossMinutes,
          break_minutes: shift.break_minutes,
        });
        
        // Create breaks for this shift
        for (const breakItem of shift.breaks) {
          await createBreak.mutateAsync({
            shift_id: shiftData.id,
            break_name: breakItem.break_name,
            start_time: breakItem.start_time,
            duration_minutes: breakItem.duration_minutes,
            is_paid: breakItem.is_paid,
          });
        }
      }
      
      onOpenChange(false);
    } else {
      const newSchedule = await createSchedule.mutateAsync({ ...formData, code: "AUTO" });
      
      // Create shifts for new schedule
      for (const shift of pendingShifts) {
        const grossMinutes = calculateGrossMinutes(shift.start_time, shift.end_time);
        const shiftData = await createShift.mutateAsync({
          work_schedule_id: newSchedule.id,
          shift_name: shift.shift_name,
          shift_number: shift.shift_number,
          start_time: shift.start_time,
          end_time: shift.end_time,
          gross_work_minutes: grossMinutes,
          break_minutes: shift.break_minutes,
        });
        
        // Create breaks for this shift
        for (const breakItem of shift.breaks) {
          await createBreak.mutateAsync({
            shift_id: shiftData.id,
            break_name: breakItem.break_name,
            start_time: breakItem.start_time,
            duration_minutes: breakItem.duration_minutes,
            is_paid: breakItem.is_paid,
          });
        }
      }
      
      onOpenChange(false);
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending || 
                    createShift.isPending || updateShiftMutation.isPending || deleteShift.isPending ||
                    createBreak.isPending || updateBreakMutation.isPending || deleteBreak.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактировать график" : "Новый график работы"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
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

          <Separator />

          {/* Shifts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Смены
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addShift}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить смену
              </Button>
            </div>
            
            {/* Existing shifts (editable) */}
            {shifts.map((shift) => (
              <Card key={shift.id} className="bg-muted/30">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Смена</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExistingShift(shift.id!)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Название</Label>
                      <Input
                        value={shift.shift_name}
                        onChange={(e) => updateExistingShift(shift.id!, "shift_name", e.target.value)}
                        placeholder="Смена 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Начало</Label>
                      <Input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => updateExistingShift(shift.id!, "start_time", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Окончание</Label>
                      <Input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => updateExistingShift(shift.id!, "end_time", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Breaks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Coffee className="h-3 w-3" />
                        Перерывы ({shift.break_minutes} мин)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => addBreakToExistingShift(shift.id!)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Перерыв
                      </Button>
                    </div>
                    
                    {shift.breaks.map((breakItem, breakIndex) => (
                      <div key={breakItem.id || breakIndex} className="flex items-center gap-2 pl-2 border-l-2 border-muted">
                        <Input
                          className="w-28 h-8 text-xs"
                          value={breakItem.break_name}
                          onChange={(e) => updateExistingBreak(shift.id!, breakIndex, "break_name", e.target.value)}
                          placeholder="Название"
                        />
                        <Input
                          type="time"
                          className="w-24 h-8 text-xs"
                          value={breakItem.start_time}
                          onChange={(e) => updateExistingBreak(shift.id!, breakIndex, "start_time", e.target.value)}
                        />
                        <Input
                          type="number"
                          className="w-16 h-8 text-xs"
                          value={breakItem.duration_minutes}
                          onChange={(e) => updateExistingBreak(shift.id!, breakIndex, "duration_minutes", parseInt(e.target.value) || 0)}
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">мин</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (breakItem.id) {
                              removeExistingBreak(breakItem.id, shift.id!);
                            } else {
                              removeExistingBreakLocal(shift.id!, breakIndex);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pending shifts (editable) */}
            {pendingShifts.map((shift, shiftIndex) => (
              <Card key={shiftIndex} className="border-primary/30">
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Новая смена</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePendingShift(shiftIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Название</Label>
                      <Input
                        value={shift.shift_name}
                        onChange={(e) => updatePendingShift(shiftIndex, "shift_name", e.target.value)}
                        placeholder="Смена 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Начало</Label>
                      <Input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => updatePendingShift(shiftIndex, "start_time", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Окончание</Label>
                      <Input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => updatePendingShift(shiftIndex, "end_time", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Breaks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Coffee className="h-3 w-3" />
                        Перерывы ({shift.break_minutes} мин)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => addBreakToShift(shiftIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Перерыв
                      </Button>
                    </div>
                    
                    {shift.breaks.map((breakItem, breakIndex) => (
                      <div key={breakIndex} className="flex items-center gap-2 pl-2 border-l-2 border-muted">
                        <Input
                          className="w-28 h-8 text-xs"
                          value={breakItem.break_name}
                          onChange={(e) => updateBreak(shiftIndex, breakIndex, "break_name", e.target.value)}
                          placeholder="Название"
                        />
                        <Input
                          type="time"
                          className="w-24 h-8 text-xs"
                          value={breakItem.start_time}
                          onChange={(e) => updateBreak(shiftIndex, breakIndex, "start_time", e.target.value)}
                        />
                        <Input
                          type="number"
                          className="w-16 h-8 text-xs"
                          value={breakItem.duration_minutes}
                          onChange={(e) => updateBreak(shiftIndex, breakIndex, "duration_minutes", parseInt(e.target.value) || 0)}
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">мин</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeBreak(shiftIndex, breakIndex)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {shifts.length === 0 && pendingShifts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Добавьте смены для настройки времени работы
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание графика работы"
              rows={2}
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
            <Button type="submit" disabled={isPending}>
              {isEditing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
