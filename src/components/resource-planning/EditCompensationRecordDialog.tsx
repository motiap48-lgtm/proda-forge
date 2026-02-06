import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, AlertCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useUpdateCompensationRecord,
  CompensationRecord,
} from "@/hooks/useAbsenceCompensations";
import { getShiftForDate, isWorkingDay } from "./shift-rotation/utils";

interface EditCompensationRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: CompensationRecord | null;
  absenceCompensationId: string;
  operatorId: string;
  existingDates: string[]; // Dates already used by other records
}

// Helper to convert minutes to HH:MM format
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

// Helper to convert HH:MM to minutes
const timeToMinutes = (time: string): number => {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
};

// Parse time from notes (e.g., "19:30 - 23:30; Отработка 4 часа" -> {start: 1170, end: 1410})
const parseTimeFromNotes = (notes: string | null): { start: number; end: number } | null => {
  if (!notes) return null;
  const match = notes.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (match) {
    return {
      start: timeToMinutes(match[1]),
      end: timeToMinutes(match[2]),
    };
  }
  return null;
};

// Hook to get operator's schedule data
const useOperatorScheduleData = (operatorId: string) => {
  return useQuery({
    queryKey: ["operator-schedule-data", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select(`
          id,
          work_schedule_id,
          shift_rotation_enabled,
          shift_rotation_start_date,
          assigned_shift_number,
          work_schedules (
            id,
            name,
            schedule_type,
            cycle_days_on,
            cycle_days_off,
            cycle_start_date,
            work_schedule_shifts (
              id,
              shift_number,
              start_time,
              end_time,
              net_work_minutes,
              gross_work_minutes,
              break_minutes
            )
          )
        `)
        .eq("id", operatorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!operatorId,
  });
};

export const EditCompensationRecordDialog: React.FC<EditCompensationRecordDialogProps> = ({
  open,
  onOpenChange,
  record,
  absenceCompensationId,
  operatorId,
  existingDates,
}) => {
  const { data: operatorData } = useOperatorScheduleData(operatorId);
  const updateRecord = useUpdateCompensationRecord();

  const [compensationDate, setCompensationDate] = useState<Date | undefined>(undefined);
  const [compensationStartTime, setCompensationStartTime] = useState<number>(1080);
  const [compensationEndTime, setCompensationEndTime] = useState<number>(1140);
  const [compensationNotes, setCompensationNotes] = useState("");

  // Initialize from record when dialog opens
  useEffect(() => {
    if (record && open) {
      setCompensationDate(new Date(record.compensation_date));
      
      // Parse time from notes if available
      const parsedTime = parseTimeFromNotes(record.notes);
      if (parsedTime) {
        setCompensationStartTime(parsedTime.start);
        setCompensationEndTime(parsedTime.end);
        // Extract notes after time range
        const notesAfterTime = record.notes?.replace(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}(;\s*)?/, "") || "";
        setCompensationNotes(notesAfterTime);
      } else {
        // Calculate times based on hours
        const hoursInMinutes = record.hours_worked * 60;
        setCompensationStartTime(1080); // 18:00
        setCompensationEndTime(1080 + hoursInMinutes);
        setCompensationNotes(record.notes || "");
      }
    }
  }, [record, open]);

  // Helper to round hours
  const roundHours = (hours: number): number => Math.round(hours * 100) / 100;

  // Check if selected date is a working day and get shift info
  const shiftInfo = useMemo(() => {
    if (!compensationDate || !operatorData?.work_schedules) return null;
    
    const schedule = operatorData.work_schedules;
    const isWorking = isWorkingDay(schedule, compensationDate, operatorData);
    
    if (!isWorking) {
      return { isWorkingDay: false, shift: null };
    }
    
    const shift = getShiftForDate(operatorData, compensationDate);
    if (!shift) return { isWorkingDay: false, shift: null };
    
    return {
      isWorkingDay: true,
      shift,
      startMinutes: timeToMinutes(shift.start_time),
      endMinutes: timeToMinutes(shift.end_time),
    };
  }, [compensationDate, operatorData]);

  // Check if date is already used by another record
  const isDateDuplicate = useMemo(() => {
    if (!compensationDate || !record) return false;
    const dateStr = format(compensationDate, "yyyy-MM-dd");
    // Allow same date as original record
    if (dateStr === record.compensation_date) return false;
    return existingDates.includes(dateStr);
  }, [compensationDate, existingDates, record]);

  // Validate time range based on shift
  const timeValidation = useMemo(() => {
    if (!shiftInfo) return { isValid: true, message: null };
    
    if (!shiftInfo.isWorkingDay) {
      return { isValid: true, message: "Нерабочий день — любое время" };
    }
    
    const { startMinutes: shiftStart, endMinutes: shiftEnd } = shiftInfo;
    
    // Overtime must be completely before shift starts OR completely after shift ends
    const endsBeforeShift = compensationEndTime <= shiftStart;
    const startsAfterShift = compensationStartTime >= shiftEnd;
    
    if (endsBeforeShift || startsAfterShift) {
      return { 
        isValid: true, 
        message: `Смена: ${minutesToTime(shiftStart)} - ${minutesToTime(shiftEnd)}` 
      };
    }
    
    return { 
      isValid: false, 
      message: `Время пересекается со сменой (${minutesToTime(shiftStart)} - ${minutesToTime(shiftEnd)})` 
    };
  }, [shiftInfo, compensationStartTime, compensationEndTime]);

  // Calculate hours from time range
  const compensationHoursFromTime = useMemo(() => {
    return roundHours((compensationEndTime - compensationStartTime) / 60);
  }, [compensationStartTime, compensationEndTime]);

  const handleSave = () => {
    if (!record || !compensationDate) return;
    if (!timeValidation.isValid || isDateDuplicate) return;
    
    const timeNotes = `${minutesToTime(compensationStartTime)} - ${minutesToTime(compensationEndTime)}`;
    const fullNotes = compensationNotes ? `${timeNotes}; ${compensationNotes}` : timeNotes;
    
    updateRecord.mutate({
      id: record.id,
      absence_compensation_id: absenceCompensationId,
      compensation_date: format(compensationDate, "yyyy-MM-dd"),
      hours_worked: compensationHoursFromTime,
      notes: fullNotes,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Редактировать отработку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start",
                    isDateDuplicate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {compensationDate
                    ? format(compensationDate, "d MMMM yyyy", { locale: ru })
                    : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                <Calendar
                  mode="single"
                  selected={compensationDate}
                  onSelect={setCompensationDate}
                  locale={ru}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {isDateDuplicate && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                На эту дату уже есть отработка
              </p>
            )}
          </div>

          {/* Time range validation badge */}
          {timeValidation.message && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                timeValidation.isValid
                  ? shiftInfo?.isWorkingDay
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
              )}
            >
              {timeValidation.isValid ? (
                <Info className="h-3 w-3 mr-1" />
              ) : (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              {timeValidation.message}
            </Badge>
          )}

          {/* Time sliders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Label>Время</Label>
              <span className="font-medium">
                {minutesToTime(compensationStartTime)} — {minutesToTime(compensationEndTime)}
                <span className="ml-2 text-muted-foreground">({compensationHoursFromTime}ч)</span>
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12">Начало</span>
                <Slider
                  value={[compensationStartTime]}
                  onValueChange={([val]) => {
                    setCompensationStartTime(val);
                    if (val >= compensationEndTime) {
                      setCompensationEndTime(Math.min(val + 30, 1440));
                    }
                  }}
                  min={0}
                  max={1410}
                  step={30}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-12 text-right">{minutesToTime(compensationStartTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12">Конец</span>
                <Slider
                  value={[compensationEndTime]}
                  onValueChange={([val]) => {
                    setCompensationEndTime(val);
                    if (val <= compensationStartTime) {
                      setCompensationStartTime(Math.max(val - 30, 0));
                    }
                  }}
                  min={30}
                  max={1440}
                  step={30}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-12 text-right">{minutesToTime(compensationEndTime)}</span>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Примечание</Label>
            <Input
              value={compensationNotes}
              onChange={(e) => setCompensationNotes(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateRecord.isPending || !timeValidation.isValid || isDateDuplicate}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
