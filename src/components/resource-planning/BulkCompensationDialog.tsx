import React, { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddCompensationRecord, AbsenceCompensation } from "@/hooks/useAbsenceCompensations";

interface BulkCompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compensation: AbsenceCompensation | null;
  operatorId: string;
}

interface CompensationEntry {
  date: Date;
  hours: number;
  notes: string;
}

export const BulkCompensationDialog: React.FC<BulkCompensationDialogProps> = ({
  open,
  onOpenChange,
  compensation,
  operatorId,
}) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [entries, setEntries] = useState<CompensationEntry[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [globalNotes, setGlobalNotes] = useState("");

  const addCompensation = useAddCompensationRecord();

  if (!compensation) return null;

  const compensatedHours = compensation.compensation_records?.reduce(
    (sum, r) => sum + Number(r.hours_worked),
    0
  ) || 0;
  const remaining = Number(compensation.absence_hours) - compensatedHours;

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    
    setSelectedDates(dates);
    setEntries(
      dates.map((date) => ({
        date,
        hours: parseFloat(hoursPerDay) || 2,
        notes: globalNotes,
      }))
    );
  };

  const updateEntryHours = (index: number, hours: number) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, hours } : entry))
    );
  };

  const updateEntryNotes = (index: number, notes: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, notes } : entry))
    );
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setSelectedDates((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPlannedHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const handleSubmit = async () => {
    if (entries.length === 0) return;

    for (const entry of entries) {
      await addCompensation.mutateAsync({
        absence_compensation_id: compensation.id,
        operator_id: operatorId,
        compensation_date: format(entry.date, "yyyy-MM-dd"),
        hours_worked: entry.hours,
        notes: entry.notes || undefined,
      });
    }

    setSelectedDates([]);
    setEntries([]);
    setGlobalNotes("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedDates([]);
    setEntries([]);
    setGlobalNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Массовая отработка
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info about absence */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">
                  Отсутствие: {format(new Date(compensation.absence_date), "d MMMM yyyy", { locale: ru })}
                </span>
                <div className="text-sm text-muted-foreground mt-1">
                  Всего: {compensation.absence_hours}ч | Отработано: {compensatedHours}ч
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    Осталось: {remaining}ч
                  </span>
                </div>
              </div>
              {totalPlannedHours > 0 && (
                <Badge variant={totalPlannedHours >= remaining ? "default" : "secondary"}>
                  Планируется: {totalPlannedHours}ч
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Calendar for selecting multiple dates */}
            <div className="space-y-2">
              <Label>Выберите даты отработки</Label>
              <div className="border rounded-lg p-2">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleDateSelect}
                  locale={ru}
                  className="pointer-events-auto"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Label className="text-sm whitespace-nowrap">Часов на дату:</Label>
                <Input
                  type="number"
                  value={hoursPerDay}
                  onChange={(e) => {
                    setHoursPerDay(e.target.value);
                    const hours = parseFloat(e.target.value) || 2;
                    setEntries((prev) =>
                      prev.map((entry) => ({ ...entry, hours }))
                    );
                  }}
                  min="0.5"
                  step="0.5"
                  className="w-20 h-8"
                />
              </div>
            </div>

            {/* List of selected dates with individual hours */}
            <div className="space-y-2">
              <Label>Выбранные даты ({entries.length})</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {entries.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Выберите даты в календаре
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded-lg bg-background"
                      >
                        <span className="text-sm font-medium min-w-[100px]">
                          {format(entry.date, "d MMM", { locale: ru })}
                        </span>
                        <Input
                          type="number"
                          value={entry.hours}
                          onChange={(e) =>
                            updateEntryHours(index, parseFloat(e.target.value) || 0)
                          }
                          min="0.5"
                          step="0.5"
                          className="w-16 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">ч</span>
                        <Input
                          value={entry.notes}
                          onChange={(e) => updateEntryNotes(index, e.target.value)}
                          placeholder="Примечание"
                          className="flex-1 h-7 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => removeEntry(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="space-y-2">
                <Label className="text-sm">Общее примечание для всех</Label>
                <Textarea
                  value={globalNotes}
                  onChange={(e) => {
                    setGlobalNotes(e.target.value);
                    setEntries((prev) =>
                      prev.map((entry) => ({ ...entry, notes: e.target.value }))
                    );
                  }}
                  placeholder="Будет применено ко всем записям"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={entries.length === 0 || addCompensation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить {entries.length} записей ({totalPlannedHours}ч)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
