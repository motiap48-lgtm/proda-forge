import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Check, Save, RotateCcw, Undo2, Hammer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  useOperatorTimesheets, 
  useBulkUpsertTimesheets,
  createTimesheetMap,
  getTimesheetForDate 
} from "@/hooks/useOperatorTimesheets";

interface TimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  operatorName: string;
  startDate: Date;
  endDate: Date;
  plannedMinutesPerDay: (date: Date) => number;
  compensationMinutesPerDay?: (date: Date) => number;
}

export const TimesheetDialog: React.FC<TimesheetDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
  plannedMinutesPerDay,
  compensationMinutesPerDay,
}) => {
  const { data: timesheets = [], isLoading } = useOperatorTimesheets(startDate, endDate, [operatorId]);
  const bulkUpsert = useBulkUpsertTimesheets();
  
  const timesheetMap = useMemo(() => createTimesheetMap(timesheets), [timesheets]);
  
  // Generate days array
  const days = useMemo(() => {
    const result: Date[] = [];
    let current = startDate;
    while (current <= endDate) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);
  
  // Local state for edits
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const hasEdits = Object.keys(edits).length > 0;
  
  const handleSave = async () => {
    const entries = Object.entries(edits).map(([dateStr, actualMinutes]) => ({
      operator_id: operatorId,
      work_date: dateStr,
      planned_minutes: Math.round(plannedMinutesPerDay(new Date(dateStr))),
      actual_minutes: Math.round(actualMinutes),
    }));
    
    if (entries.length === 0) {
      onOpenChange(false);
      return;
    }
    
    try {
      await bulkUpsert.mutateAsync(entries);
      toast.success(`Сохранено ${entries.length} записей`);
      setEdits({});
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    }
  };
  
  const handleFillPlan = () => {
    const newEdits: Record<string, number> = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const planned = plannedMinutesPerDay(day);
      if (planned > 0) {
        newEdits[dateStr] = planned;
      }
    });
    setEdits(newEdits);
  };
  
  const handleClearAll = () => {
    const newEdits: Record<string, number> = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      newEdits[dateStr] = 0;
    });
    setEdits(newEdits);
    setShowClearConfirm(false);
    toast.success("Все фактические значения обнулены");
  };
  
  const handleResetChanges = () => {
    setEdits({});
    toast.info("Изменения сброшены");
  };
  
  // Calculate totals
  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      planned += plannedMinutesPerDay(day);
      
      if (edits[dateStr] !== undefined) {
        actual += edits[dateStr];
      } else {
        const ts = getTimesheetForDate(timesheetMap, operatorId, day);
        if (ts) {
          actual += ts.actual_minutes;
        }
      }
    });
    
    return { planned, actual };
  }, [days, edits, timesheetMap, operatorId, plannedMinutesPerDay]);
  
  const formatMinutes = (m: number) => {
    const rounded = Math.round(m);
    const isNegative = rounded < 0;
    const absM = Math.abs(rounded);
    const h = Math.floor(absM / 60);
    const mins = absM % 60;
    const sign = isNegative ? '-' : '';
    return mins > 0 ? `${sign}${h}ч ${mins}м` : `${sign}${h}ч`;
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Табель: {operatorName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Период: </span>
                <span className="font-medium">
                  {format(startDate, "d MMM", { locale: ru })} — {format(endDate, "d MMM yyyy", { locale: ru })}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {hasEdits && (
                  <Button variant="ghost" size="sm" onClick={handleResetChanges} className="h-7 px-2 text-xs">
                    <Undo2 className="h-3 w-3 mr-1" />
                    Сбросить
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(true)} className="h-7 px-2 text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Обнулить
                </Button>
                <Button variant="outline" size="sm" onClick={handleFillPlan} className="h-7 px-2 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  По плану
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 -mx-6 px-6 min-h-0 overflow-y-auto">
            <div className="space-y-1 py-2">
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const planned = plannedMinutesPerDay(day);
                const compensationMinutes = compensationMinutesPerDay?.(day) || 0;
                const hasCompensation = compensationMinutes > 0;
                const ts = getTimesheetForDate(timesheetMap, operatorId, day);
                const currentValue = edits[dateStr] ?? ts?.actual_minutes ?? 0;
                const hasEdit = edits[dateStr] !== undefined;
                const hasSaved = ts && !hasEdit;
                
                return (
                  <div 
                    key={dateStr} 
                    className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <div className="w-24 text-sm">
                      {format(day, "EEE, d MMM", { locale: ru })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn("min-w-16 justify-center text-xs", hasCompensation && "border-amber-400 bg-amber-50")}>
                        План: {formatMinutes(planned)}
                      </Badge>
                      {hasCompensation && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Hammer className="h-3 w-3 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Включает отработку: {formatMinutes(compensationMinutes)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <Label className="text-xs text-muted-foreground">Факт:</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="w-20 h-8 text-sm"
                        value={Math.round(currentValue)}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          // Only allow integers
                          if (rawValue === '' || /^\d+$/.test(rawValue)) {
                            const val = parseInt(rawValue) || 0;
                            setEdits(prev => ({ ...prev, [dateStr]: Math.max(0, val) }));
                          }
                        }}
                        onKeyDown={(e) => {
                          // Block decimal point and minus sign
                          if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e') {
                            e.preventDefault();
                          }
                        }}
                        placeholder="мин"
                      />
                      <span className="text-xs text-muted-foreground">мин</span>
                    </div>
                    {hasSaved && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        ✓
                      </Badge>
                    )}
                    {hasEdit && (
                      <Badge className="text-xs bg-amber-100 text-amber-700">
                        изм.
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">План: </span>
                <span className="font-medium">{formatMinutes(totals.planned)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Факт: </span>
                <span className="font-bold text-primary">{formatMinutes(totals.actual)}</span>
                {totals.actual !== totals.planned && (
                  <span className={`ml-2 text-xs ${totals.actual >= totals.planned ? 'text-green-600' : 'text-amber-600'}`}>
                    ({totals.actual >= totals.planned ? '+' : ''}{formatMinutes(totals.actual - totals.planned)})
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={bulkUpsert.isPending || !hasEdits}>
                <Save className="h-4 w-4 mr-1" />
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Обнулить все фактические значения?</AlertDialogTitle>
            <AlertDialogDescription>
              Все фактические значения за период будут установлены в 0. 
              Для сохранения изменений нужно будет нажать кнопку "Сохранить".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>
              Обнулить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
