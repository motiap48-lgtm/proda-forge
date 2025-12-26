import React from "react";
import { format, getDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ABSENCE_TYPE_LABELS, type OperatorAbsence, isDateInAbsence, isOperatorTerminated, isBeforeHireDate } from "@/hooks/useOperatorAbsences";
import { type OperatorTimesheet, getTimesheetForDate } from "@/hooks/useOperatorTimesheets";
import { type CompensationRecord } from "@/hooks/useAbsenceCompensations";
import { type OvertimeEntry } from "@/hooks/useOvertimeEntries";
import { getShiftForDate, isWorkingDay } from "../utils";

interface CalendarException {
  id: string;
  exception_date: string;
  exception_type: string;
  is_working_day: boolean;
  name: string;
  reduction_hours?: number | null;
}

interface OperatorTotalTooltipProps {
  operatorId: string;
  operatorName: string;
  planHours: number;
  planMinutes: number;
  days: Date[];
  absences: OperatorAbsence[];
  timesheetMap: Map<string, OperatorTimesheet>;
  compensationRecordsMap: Map<string, CompensationRecord[]>;
  overtimeMap?: Map<string, OvertimeEntry[]>;
  getDayMinutes?: (operator: any, day: Date) => number;
  operator: any;
  calendarExceptions?: CalendarException[];
}

interface AbsenceGroup {
  type: string;
  label: string;
  icon: string;
  days: number;
  hours: number;
}

export const OperatorTotalTooltip: React.FC<OperatorTotalTooltipProps> = ({
  operatorId,
  operatorName,
  planHours,
  planMinutes,
  days,
  absences,
  timesheetMap,
  compensationRecordsMap,
  overtimeMap = new Map(),
  getDayMinutes,
  operator,
  calendarExceptions = [],
}) => {
  // Create exceptions map for quick lookup
  const exceptionsMap = React.useMemo(() => {
    const map = new Map<string, CalendarException>();
    calendarExceptions.forEach(exc => {
      map.set(exc.exception_date, exc);
    });
    return map;
  }, [calendarExceptions]);

  // Calculate FULL plan (without subtracting absences) - this is what should have been worked
  const fullPlan = React.useMemo(() => {
    let totalMinutes = 0;
    const schedule = operator.work_schedules;
    
    days.forEach(day => {
      // Skip if terminated or not hired
      if (isOperatorTerminated(operator, day)) return;
      if (isBeforeHireDate(operator, day)) return;
      
      // Check for holiday
      const dateStr = format(day, "yyyy-MM-dd");
      const exception = exceptionsMap.get(dateStr);
      if (exception && !exception.is_working_day) return;
      
      // Get shift for this day
      const shift = getShiftForDate(operator, day);
      if (!shift) return;
      
      const normalNetMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      
      // Apply shortened day reduction if applicable
      if (exception && exception.exception_type === "shortened_day") {
        const scheduleReductionHours = schedule?.reduction_hours;
        const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
        const reductionMinutes = reductionHours * 60;
        totalMinutes += Math.max(0, normalNetMinutes - reductionMinutes);
      } else {
        totalMinutes += normalNetMinutes;
      }
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes,
    };
  }, [days, operator, exceptionsMap]);
  
  // Types of absences that require compensation (отработка)
  const ABSENCES_REQUIRING_COMPENSATION = [
    'absence', // Отсутствие
    'personal', // Личные обстоятельства
    'unpaid_leave', // Отпуск без сохранения ЗП
  ];
  
  // Types of absences that DON'T require compensation (paid leave, etc.)
  const ABSENCES_NOT_REQUIRING_COMPENSATION = [
    'vacation', // Ежегодный отпуск
    'sick_leave', // Больничный
    'business_trip', // Командировка
    'training', // Обучение
    'maternity_leave', // Декретный отпуск
  ];
  
  // Calculate absence hours grouped by type
  const absenceGroups = React.useMemo(() => {
    const groups = new Map<string, AbsenceGroup & { requiresCompensation: boolean }>();
    const schedule = operator.work_schedules;
    
    days.forEach(day => {
      // Skip if terminated or not hired
      if (isOperatorTerminated(operator, day)) return;
      if (isBeforeHireDate(operator, day)) return;
      
      const absence = isDateInAbsence(day, absences, operatorId);
      if (absence) {
        const typeInfo = ABSENCE_TYPE_LABELS[absence.absence_type];
        
        // Calculate what would have been worked this day
        const dateStr = format(day, "yyyy-MM-dd");
        const exception = exceptionsMap.get(dateStr);
        
        // If it's a holiday anyway, don't count
        if (exception && !exception.is_working_day) return;
        
        const shift = getShiftForDate(operator, day);
        if (!shift) return; // It was a day off anyway
        
        let dayMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
        
        // Apply shortened day reduction
        if (exception && exception.exception_type === "shortened_day") {
          const scheduleReductionHours = schedule?.reduction_hours;
          const reductionHours = scheduleReductionHours ?? exception.reduction_hours ?? 1;
          dayMinutes = Math.max(0, dayMinutes - reductionHours * 60);
        }
        
        // Determine if this absence type requires compensation
        const requiresCompensation = ABSENCES_REQUIRING_COMPENSATION.includes(absence.absence_type);
        
        if (!groups.has(absence.absence_type)) {
          groups.set(absence.absence_type, {
            type: absence.absence_type,
            label: typeInfo?.label || absence.absence_type,
            icon: typeInfo?.icon || "📝",
            days: 0,
            hours: 0,
            requiresCompensation,
          });
        }
        
        const group = groups.get(absence.absence_type)!;
        group.days += 1;
        group.hours += dayMinutes / 60;
      }
    });
    
    return Array.from(groups.values());
  }, [days, absences, operatorId, operator, exceptionsMap]);
  
  // Calculate total absence hours
  const totalAbsenceHours = absenceGroups.reduce((sum, g) => sum + g.hours, 0);
  const totalAbsenceMinutes = Math.round(totalAbsenceHours * 60);
  
  // Calculate only absences that require compensation
  const absencesRequiringCompensationMinutes = Math.round(
    absenceGroups
      .filter(g => g.requiresCompensation)
      .reduce((sum, g) => sum + g.hours, 0) * 60
  );
  
  // Calculate compensation hours (confirmed only)
  const compensationData = React.useMemo(() => {
    let confirmedMinutes = 0;
    let pendingMinutes = 0;
    
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const key = `${operatorId}_${dateStr}`;
      const records = compensationRecordsMap.get(key) || [];
      
      records.forEach(record => {
        if (record.status === "confirmed") {
          confirmedMinutes += Math.round(record.hours_worked * 60);
        } else {
          pendingMinutes += Math.round(record.hours_worked * 60);
        }
      });
    });
    
    return {
      confirmedHours: Math.floor(confirmedMinutes / 60),
      confirmedMinutes: confirmedMinutes % 60,
      pendingHours: Math.floor(pendingMinutes / 60),
      pendingMinutes: pendingMinutes % 60,
      totalConfirmedMinutes: confirmedMinutes,
      totalPendingMinutes: pendingMinutes,
    };
  }, [days, operatorId, compensationRecordsMap]);
  
  // Calculate overtime hours (approved only)
  const overtimeData = React.useMemo(() => {
    let approvedMinutes = 0;
    let pendingMinutes = 0;
    
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const key = `${operatorId}_${dateStr}`;
      const entries = overtimeMap.get(key) || [];
      
      entries.forEach(entry => {
        if (entry.status === "approved") {
          approvedMinutes += entry.duration_minutes || 0;
        } else if (entry.status === "pending") {
          pendingMinutes += entry.duration_minutes || 0;
        }
      });
    });
    
    return {
      approvedHours: Math.floor(approvedMinutes / 60),
      approvedMinutes: approvedMinutes % 60,
      pendingHours: Math.floor(pendingMinutes / 60),
      pendingMinutes: pendingMinutes % 60,
      totalApprovedMinutes: approvedMinutes,
      totalPendingMinutes: pendingMinutes,
    };
  }, [days, operatorId, overtimeMap]);
  
  // Calculate actual hours from timesheets
  const actualData = React.useMemo(() => {
    let totalMinutes = 0;
    let hasData = false;
    
    days.forEach(day => {
      const ts = getTimesheetForDate(timesheetMap, operatorId, day);
      if (ts && ts.actual_minutes > 0) {
        totalMinutes += ts.actual_minutes;
        hasData = true;
      }
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes,
      hasData,
    };
  }, [days, operatorId, timesheetMap]);
  
  // Calculate expected work = full plan - absences + confirmed compensation (without overtime - overtime is extra work)
  const expectedMinutes = fullPlan.totalMinutes - totalAbsenceMinutes + compensationData.totalConfirmedMinutes;
  
  // Actual total = timesheet data + approved overtime
  const actualTotalMinutes = actualData.totalMinutes + overtimeData.totalApprovedMinutes;
  
  // Calculate difference (overtime or undertime) = actual total - expected
  const difference = actualData.hasData 
    ? actualTotalMinutes - expectedMinutes
    : null;
  
  // Remaining to compensate - ONLY for absences that require compensation (not vacation, sick leave, etc.)
  const remainingToCompensate = absencesRequiringCompensationMinutes - compensationData.totalConfirmedMinutes - compensationData.totalPendingMinutes;
  
  const formatTime = (hours: number, minutes: number) => {
    if (minutes > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${hours}ч`;
  };
  
  const formatMinutesAsTime = (totalMin: number) => {
    const h = Math.floor(Math.abs(totalMin) / 60);
    const m = Math.abs(totalMin) % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  };
  
  const formatDiff = (diffMinutes: number) => {
    const h = Math.floor(Math.abs(diffMinutes) / 60);
    const m = Math.abs(diffMinutes) % 60;
    const sign = diffMinutes >= 0 ? "+" : "-";
    return `${sign}${h}ч${m > 0 ? ` ${m}м` : ""}`;
  };

  return (
    <div className="space-y-2 min-w-[220px] text-xs">
      {/* Full Plan */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">План:</span>
        <span className="font-medium">{formatTime(fullPlan.hours, fullPlan.minutes)}</span>
      </div>
      
      {/* Absences by type */}
      {absenceGroups.length > 0 && (
        <div className="border-t border-border/50 pt-2 space-y-1">
          {absenceGroups.map(group => (
            <div key={group.type} className="flex justify-between items-center text-rose-500">
              <span className="flex items-center gap-1">
                <span>{group.icon}</span>
                <span>{group.label} ({group.days}д):</span>
              </span>
              <span className="font-medium">-{Math.round(group.hours * 10) / 10}ч</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Compensation */}
      {(compensationData.confirmedHours > 0 || compensationData.confirmedMinutes > 0 || 
        compensationData.pendingHours > 0 || compensationData.pendingMinutes > 0) && (
        <div className="border-t border-border/50 pt-2 space-y-1">
          {(compensationData.confirmedHours > 0 || compensationData.confirmedMinutes > 0) && (
            <div className="flex justify-between items-center text-emerald-500">
              <span>Отработано:</span>
              <span className="font-medium">
                +{formatTime(compensationData.confirmedHours, compensationData.confirmedMinutes)}
              </span>
            </div>
          )}
          {(compensationData.pendingHours > 0 || compensationData.pendingMinutes > 0) && (
            <div className="flex justify-between items-center text-amber-500">
              <span>Планируется отработка:</span>
              <span className="font-medium">
                ~{formatTime(compensationData.pendingHours, compensationData.pendingMinutes)}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Overtime - show only pending, approved is shown in final difference */}
      {(overtimeData.pendingHours > 0 || overtimeData.pendingMinutes > 0) && (
        <div className="border-t border-border/50 pt-2 space-y-1">
          <div className="flex justify-between items-center text-purple-400">
            <span>⏱️ Ожидает подтверждения:</span>
            <span className="font-medium">
              ~{formatTime(overtimeData.pendingHours, overtimeData.pendingMinutes)}
            </span>
          </div>
        </div>
      )}
      
      {actualData.hasData && (
        <div className="border-t border-border/50 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Факт:</span>
            <span className="font-medium">{formatMinutesAsTime(actualTotalMinutes)}</span>
          </div>
        </div>
      )}
      
      {/* Difference */}
      {difference !== null && (
        <div className="border-t border-border/50 pt-2">
          <div className={`flex justify-between items-center font-bold ${difference >= 0 ? "text-green-500" : "text-amber-500"}`}>
            <span>{difference >= 0 ? "Переработка:" : "Недоработка:"}</span>
            <span>{formatDiff(difference)}</span>
          </div>
        </div>
      )}
      
      {/* Remaining to compensate (if no actual data and has absences) */}
      {!actualData.hasData && remainingToCompensate > 0 && (
        <div className="border-t border-border/50 pt-2">
          <div className="flex justify-between items-center text-rose-500 font-medium">
            <span>Осталось к отработке:</span>
            <span>{formatMinutesAsTime(remainingToCompensate)}</span>
          </div>
        </div>
      )}
      
      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        Нажмите для редактирования табеля
      </div>
    </div>
  );
};
