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
import { Users, Clock, Check, AlertTriangle } from "lucide-react";
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

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      // Pre-select operators with plan > 0 and no current data
      const toSelect = new Set<string>();
      operators.forEach((op) => {
        if (op.plannedMinutes > 0 && op.currentActualMinutes === 0) {
          toSelect.add(op.id);
        }
      });
      setSelectedIds(toSelect);
      setFillValue("plan");
      setCustomMinutes("");
    }
  }, [open, operators]);

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
    if (selectedIds.size === operators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(operators.map((op) => op.id)));
    }
  };

  const selectedOperators = useMemo(() => {
    return operators.filter((op) => selectedIds.has(op.id));
  }, [operators, selectedIds]);

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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
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

          {/* Fill value selector */}
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

          {/* Operators list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Сотрудники ({selectedIds.size} выбрано)</Label>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === operators.length ? "Снять все" : "Выбрать все"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {operators.map((op) => {
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
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{op.full_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {op.code}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={bulkUpsert.isPending || selectedIds.size === 0}
          >
            {bulkUpsert.isPending
              ? "Сохранение..."
              : `Заполнить (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
