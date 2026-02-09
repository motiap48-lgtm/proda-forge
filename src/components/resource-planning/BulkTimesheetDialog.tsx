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
import { Users, Clock, Check, AlertTriangle, CheckCircle, Info, Calendar } from "lucide-react";
import { format, startOfMonth, eachDayOfInterval, isBefore, isAfter, startOfDay } from "date-fns";
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

interface DayData {
  date: Date;
  plannedMinutes: number;
  actualMinutes: number;
}

interface OperatorWithDays extends OperatorForBulk {
  unfilledDays: DayData[];
}

interface BulkTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  operators: OperatorForBulk[];
  groupName?: string;
  // New props for "fill all unfilled" mode
  operatorsWithHistory?: OperatorWithDays[];
  monthStart?: Date;
  monthEnd?: Date;
}

type FillMode = "today" | "all_unfilled";

export const BulkTimesheetDialog: React.FC<BulkTimesheetDialogProps> = ({
  open,
  onOpenChange,
  date,
  operators,
  groupName,
  operatorsWithHistory,
  monthStart,
  monthEnd,
}) => {
  const bulkUpsert = useBulkUpsertTimesheets();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fillValue, setFillValue] = useState<"plan" | "custom">("plan");
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [fillMode, setFillMode] = useState<FillMode>("today");

  // Filter only operators scheduled to work today (have planned minutes > 0)
  const workingOperators = useMemo(() => {
    return operators.filter((op) => op.plannedMinutes > 0);
  }, [operators]);

  // For "all unfilled" mode - get operators with unfilled days
  const operatorsWithUnfilled = useMemo(() => {
    if (!operatorsWithHistory) return [];
    return operatorsWithHistory.filter((op) => op.unfilledDays.length > 0);
  }, [operatorsWithHistory]);

  // Count stats for each mode
  const todayFilledCount = useMemo(() => {
    return workingOperators.filter((op) => op.currentActualMinutes > 0).length;
  }, [workingOperators]);

  const totalUnfilledDays = useMemo(() => {
    return operatorsWithUnfilled.reduce((sum, op) => sum + op.unfilledDays.length, 0);
  }, [operatorsWithUnfilled]);

  const allFilledToday = workingOperators.length > 0 && todayFilledCount === workingOperators.length;
  const noWorkersToday = workingOperators.length === 0;
  const noUnfilledDays = operatorsWithUnfilled.length === 0;

  // Determine if we have data for "all unfilled" mode
  const hasAllUnfilledMode = !!operatorsWithHistory;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      // Pre-select operators with plan > 0 and no current data
      const toSelect = new Set<string>();
      if (fillMode === "today") {
        workingOperators.forEach((op) => {
          if (op.currentActualMinutes === 0) {
            toSelect.add(op.id);
          }
        });
      } else {
        operatorsWithUnfilled.forEach((op) => {
          toSelect.add(op.id);
        });
      }
      setSelectedIds(toSelect);
      setFillValue("plan");
      setCustomMinutes("");
    }
  }, [open, fillMode, workingOperators, operatorsWithUnfilled]);

  // Reset selection when mode changes
  React.useEffect(() => {
    const toSelect = new Set<string>();
    if (fillMode === "today") {
      workingOperators.forEach((op) => {
        if (op.currentActualMinutes === 0) {
          toSelect.add(op.id);
        }
      });
    } else {
      operatorsWithUnfilled.forEach((op) => {
        toSelect.add(op.id);
      });
    }
    setSelectedIds(toSelect);
  }, [fillMode, workingOperators, operatorsWithUnfilled]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const currentOperatorsList = fillMode === "today" ? workingOperators : operatorsWithUnfilled;

  const toggleSelectAll = () => {
    if (selectedIds.size === currentOperatorsList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentOperatorsList.map((op) => op.id)));
    }
  };

  const selectedOperators = useMemo(() => {
    return currentOperatorsList.filter((op) => selectedIds.has(op.id));
  }, [currentOperatorsList, selectedIds]);

  const handleSave = async () => {
    if (selectedOperators.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    let entries: Array<{
      operator_id: string;
      work_date: string;
      planned_minutes: number;
      actual_minutes: number;
    }> = [];

    if (fillMode === "today") {
      const dateStr = format(date, "yyyy-MM-dd");
      entries = (selectedOperators as OperatorForBulk[]).map((op) => {
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
    } else {
      // Fill all unfilled days for selected operators
      (selectedOperators as OperatorWithDays[]).forEach((op) => {
        op.unfilledDays.forEach((day) => {
          const actualMinutes =
            fillValue === "plan"
              ? day.plannedMinutes
              : parseInt(customMinutes) || 0;

          entries.push({
            operator_id: op.id,
            work_date: format(day.date, "yyyy-MM-dd"),
            planned_minutes: day.plannedMinutes,
            actual_minutes: actualMinutes,
          });
        });
      });
    }

    try {
      await bulkUpsert.mutateAsync(entries);
      const msg = fillMode === "today" 
        ? `Заполнено ${entries.length} записей на сегодня`
        : `Заполнено ${entries.length} записей за ${selectedOperators.length} сотрудников`;
      toast.success(msg);
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

  const isCurrentModeEmpty = fillMode === "today" 
    ? (noWorkersToday || allFilledToday)
    : noUnfilledDays;

  const canFill = !isCurrentModeEmpty && selectedIds.size > 0;

  // Count entries to be filled
  const entriesToFill = useMemo(() => {
    if (fillMode === "today") {
      return selectedIds.size;
    } else {
      return (selectedOperators as OperatorWithDays[]).reduce(
        (sum, op) => sum + op.unfilledDays.length, 
        0
      );
    }
  }, [fillMode, selectedIds, selectedOperators]);

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
          {/* Mode selector */}
          {hasAllUnfilledMode && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={fillMode === "today" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFillMode("today")}
              >
                <Clock className="h-4 w-4 mr-1.5" />
                На сегодня
              </Button>
              <Button
                type="button"
                variant={fillMode === "all_unfilled" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFillMode("all_unfilled")}
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Незаполненные дни
              </Button>
            </div>
          )}

          {/* Date and group info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {fillMode === "today" 
                  ? format(date, "EEEE, d MMMM yyyy", { locale: ru })
                  : monthStart && monthEnd
                    ? `${format(monthStart, "d MMM", { locale: ru })} — ${format(monthEnd, "d MMM yyyy", { locale: ru })}`
                    : format(date, "MMMM yyyy", { locale: ru })
                }
              </span>
            </div>
            {groupName && (
              <div className="text-sm text-muted-foreground">
                Группа: {groupName}
              </div>
            )}
            {fillMode === "all_unfilled" && totalUnfilledDays > 0 && (
              <div className="text-sm text-muted-foreground">
                Всего незаполненных дней: {totalUnfilledDays}
              </div>
            )}
          </div>

          {/* Warning states for "today" mode */}
          {fillMode === "today" && noWorkersToday && (
            <div className="p-4 rounded-lg bg-muted/50 border border-muted text-center space-y-2">
              <Info className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                На сегодня нет сотрудников с рабочим графиком в этой группе
              </p>
            </div>
          )}

          {fillMode === "today" && !noWorkersToday && allFilledToday && (
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

          {/* Warning states for "all unfilled" mode */}
          {fillMode === "all_unfilled" && noUnfilledDays && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Все дни заполнены
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Нет незаполненных рабочих дней за текущий период
              </p>
            </div>
          )}

          {/* Fill value selector - only show if there are operators to fill */}
          {!isCurrentModeEmpty && (
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
          {!isCurrentModeEmpty && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Сотрудники ({selectedIds.size} выбрано)</Label>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === currentOperatorsList.length ? "Снять все" : "Выбрать все"}
                </Button>
              </div>

              {fillMode === "today" && todayFilledCount > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{todayFilledCount} из {workingOperators.length} уже заполнено</span>
                </div>
              )}

              <ScrollArea className="h-[220px] w-full border rounded-lg">
                <div className="p-2 space-y-1">
                  {fillMode === "today" ? (
                    // Today mode - show working operators
                    workingOperators.map((op) => {
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
                    })
                  ) : (
                    // All unfilled mode - show operators with unfilled days
                    operatorsWithUnfilled.map((op) => {
                      const isSelected = selectedIds.has(op.id);
                      const totalPlanMinutes = op.unfilledDays.reduce((s, d) => s + d.plannedMinutes, 0);

                      return (
                        <div
                          key={op.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            isSelected ? "bg-primary/10" : "hover:bg-muted/50"
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
                              <span className="text-amber-600 dark:text-amber-400">
                                {op.unfilledDays.length} дней не заполнено
                              </span>
                              <span>• План: {formatMinutes(totalPlanMinutes)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isCurrentModeEmpty ? "Закрыть" : "Отмена"}
          </Button>
          {canFill && (
            <Button
              onClick={handleSave}
              disabled={bulkUpsert.isPending || selectedIds.size === 0}
            >
              {bulkUpsert.isPending
                ? "Сохранение..."
                : `Заполнить (${entriesToFill})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};