import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, addDays, startOfMonth, getDaysInMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Check, Save } from "lucide-react";
import { toast } from "sonner";
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
}

export const TimesheetDialog: React.FC<TimesheetDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
  plannedMinutesPerDay,
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
  
  const handleSave = async () => {
    const entries = Object.entries(edits).map(([dateStr, actualMinutes]) => ({
      operator_id: operatorId,
      work_date: dateStr,
      planned_minutes: plannedMinutesPerDay(new Date(dateStr)),
      actual_minutes: actualMinutes,
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
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}ч ${mins}м` : `${h}ч`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Табель: {operatorName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="text-sm">
            <span className="text-muted-foreground">Период: </span>
            <span className="font-medium">
              {format(startDate, "d MMM", { locale: ru })} — {format(endDate, "d MMM yyyy", { locale: ru })}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleFillPlan}>
            <Check className="h-4 w-4 mr-1" />
            Заполнить по плану
          </Button>
        </div>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {days.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const planned = plannedMinutesPerDay(day);
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
                  <Badge variant="outline" className="w-16 justify-center text-xs">
                    План: {Math.floor(planned / 60)}ч
                  </Badge>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Label className="text-xs text-muted-foreground">Факт:</Label>
                    <Input
                      type="number"
                      min="0"
                      step="30"
                      className="w-20 h-8 text-sm"
                      value={Math.round(currentValue)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEdits(prev => ({ ...prev, [dateStr]: val }));
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
        </ScrollArea>
        
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
            <Button onClick={handleSave} disabled={bulkUpsert.isPending || Object.keys(edits).length === 0}>
              <Save className="h-4 w-4 mr-1" />
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
