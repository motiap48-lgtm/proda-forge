import React, { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Clock, Check, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBulkUpsertTimesheets } from "@/hooks/useOperatorTimesheets";

interface OperatorForBulk {
  id: string;
  full_name: string;
  code: string;
  plannedMinutes: number;
  currentActualMinutes: number;
}

interface BulkTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  operators: OperatorForBulk[];
  groupName?: string;
}

export const BulkTimesheetDialog: React.FC<BulkTimesheetDialogProps> = ({
  open,
  onOpenChange,
  date,
  operators,
  groupName,
}) => {
  const bulkUpsert = useBulkUpsertTimesheets();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fillValue, setFillValue] = useState<"plan" | "custom">("plan");
  const [customMinutes, setCustomMinutes] = useState<string>("");

  // Filter only operators scheduled to work today (have planned minutes > 0)
  const workingOperators = useMemo(() => {
    return operators.filter((op) => op.plannedMinutes > 0);
  }, [operators]);

  // Check how many already have filled timesheets
  const filledCount = useMemo(() => {
    return workingOperators.filter((op) => op.currentActualMinutes > 0).length;
  }, [workingOperators]);

  const allFilled = workingOperators.length > 0 && filledCount === workingOperators.length;
  const noWorkersToday = workingOperators.length === 0;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      // Pre-select operators with plan > 0 and no current data
      const toSelect = new Set<string>();
      workingOperators.forEach((op) => {
        if (op.currentActualMinutes === 0) {
          toSelect.add(op.id);
        }
      });
      setSelectedIds(toSelect);
      setFillValue("plan");
      setCustomMinutes("");
    }
  }, [open, workingOperators]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === workingOperators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workingOperators.map((op) => op.id)));
    }
  };

  const selectedOperators = useMemo(() => {
    return workingOperators.filter((op) => selectedIds.has(op.id));
  }, [workingOperators, selectedIds]);

  const handleSave = async () => {
    if (selectedOperators.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    const dateStr = format(date, "yyyy-MM-dd");
    const entries = selectedOperators.map((op) => {
      const actualMinutes =
        fillValue === "plan"
          ? op.plannedMinutes
          : parseInt(customMinutes) || 0;

      return {
        operator_id: op.id,
        work_date: dateStr,
        planned_minutes: op.plannedMinutes,
        actual_minutes: actualMinutes,
      };
    });

    try {
      await bulkUpsert.mutateAsync(entries);
      toast.success(`Заполнено ${entries.length} записей`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    }
  };

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}ч ${mins}м` : `${h}ч`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Групповое заполнение табеля
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date and group info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(date, "EEEE, d MMMM yyyy", { locale: ru })}
              </span>
            </div>
            {groupName && (
              <div className="text-sm text-muted-foreground">
                Группа: {groupName}
              </div>
            )}
          </div>

          {/* Warning if no workers today */}
          {noWorkersToday && (
            <div className="p-4 rounded-lg bg-muted/50 border border-muted text-center space-y-2">
              <Info className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                На сегодня нет сотрудников с рабочим графиком в этой группе
              </p>
            </div>
          )}

          {/* Warning if all already filled */}
          {!noWorkersToday && allFilled && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Табель на сегодня полностью заполнен
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Все {workingOperators.length} сотрудников уже имеют записи в табеле
              </p>
            </div>
          )}

          {/* Fill value selector - only show if there are unfilled operators */}
          {!noWorkersToday && !allFilled && (
            <div className="space-y-2">
              <Label>Значение для заполнения</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={fillValue === "plan" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFillValue("plan")}
                >
                  <Check className="h-4 w-4 mr-1" />
                  По плану
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Минуты"
                    className={cn(
                      "w-24 h-9",
                      fillValue !== "plan" && "ring-2 ring-primary"
                    )}
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value);
                      setFillValue("custom");
                    }}
                    onFocus={() => setFillValue("custom")}
                  />
                  <span className="text-sm text-muted-foreground">мин</span>
                </div>
              </div>
            </div>
          )}

          {/* Operators list - only show if not all filled */}
          {!noWorkersToday && !allFilled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Сотрудники ({selectedIds.size} выбрано)</Label>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === workingOperators.length ? "Снять все" : "Выбрать все"}
                </Button>
              </div>

              {filledCount > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{filledCount} из {workingOperators.length} уже заполнено</span>
                </div>
              )}

              <ScrollArea className="h-[220px] w-full border rounded-lg">
                <div className="p-2 space-y-1">
                  {workingOperators.map((op) => {
                    const isSelected = selectedIds.has(op.id);
                    const hasExisting = op.currentActualMinutes > 0;

                  return (
                    <div
                      key={op.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                        hasExisting && "opacity-75"
                      )}
                      onClick={() => toggleSelect(op.id)}
                    >
                      <Checkbox checked={isSelected} className="shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate flex-1 min-w-0">{op.full_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                            {op.code}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>План: {formatMinutes(op.plannedMinutes)}</span>
                          {hasExisting && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              Уже: {formatMinutes(op.currentActualMinutes)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {noWorkersToday || allFilled ? "Закрыть" : "Отмена"}
          </Button>
          {!noWorkersToday && !allFilled && (
            <Button
              onClick={handleSave}
              disabled={bulkUpsert.isPending || selectedIds.size === 0}
            >
              {bulkUpsert.isPending
                ? "Сохранение..."
                : `Заполнить (${selectedIds.size})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
