import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ABSENCE_TYPE_LABELS, type OperatorAbsence, isDateInAbsence } from "@/hooks/useOperatorAbsences";
import { type OperatorTimesheet, getTimesheetForDate } from "@/hooks/useOperatorTimesheets";
import { type CompensationRecord } from "@/hooks/useAbsenceCompensations";

interface OperatorTotalTooltipProps {
  operatorId: string;
  operatorName: string;
  planHours: number;
  planMinutes: number;
  days: Date[];
  absences: OperatorAbsence[];
  timesheetMap: Map<string, OperatorTimesheet>;
  compensationRecordsMap: Map<string, CompensationRecord[]>;
  getDayMinutes?: (operator: any, day: Date) => number;
  operator: any;
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
  getDayMinutes,
  operator,
}) => {
  // Calculate absence hours grouped by type
  const absenceGroups = React.useMemo(() => {
    const groups = new Map<string, AbsenceGroup>();
    
    days.forEach(day => {
      const absence = isDateInAbsence(day, absences, operatorId);
      if (absence) {
        const typeInfo = ABSENCE_TYPE_LABELS[absence.absence_type];
        const dayMinutes = getDayMinutes ? getDayMinutes(operator, day) : 480; // Default 8h
        
        if (!groups.has(absence.absence_type)) {
          groups.set(absence.absence_type, {
            type: absence.absence_type,
            label: typeInfo?.label || absence.absence_type,
            icon: typeInfo?.icon || "📝",
            days: 0,
            hours: 0,
          });
        }
        
        const group = groups.get(absence.absence_type)!;
        group.days += 1;
        group.hours += dayMinutes / 60;
      }
    });
    
    return Array.from(groups.values());
  }, [days, absences, operatorId, getDayMinutes, operator]);
  
  // Calculate total absence hours
  const totalAbsenceHours = absenceGroups.reduce((sum, g) => sum + g.hours, 0);
  
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
  
  // Calculate plan with compensation (what should be worked)
  const planTotalMinutes = planHours * 60 + planMinutes;
  const planWithCompensation = planTotalMinutes + compensationData.totalConfirmedMinutes;
  
  // Calculate difference (overtime or undertime)
  const difference = actualData.hasData 
    ? actualData.totalMinutes - planWithCompensation 
    : null;
  
  const formatTime = (hours: number, minutes: number) => {
    if (minutes > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${hours}ч`;
  };
  
  const formatDiff = (diffMinutes: number) => {
    const h = Math.floor(Math.abs(diffMinutes) / 60);
    const m = Math.abs(diffMinutes) % 60;
    const sign = diffMinutes >= 0 ? "+" : "-";
    return `${sign}${h}ч${m > 0 ? ` ${m}м` : ""}`;
  };

  return (
    <div className="space-y-2 min-w-[200px]">
      {/* Plan */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">План:</span>
        <span className="font-medium">{formatTime(planHours, planMinutes)}</span>
      </div>
      
      {/* Absences by type */}
      {absenceGroups.length > 0 && (
        <div className="border-t border-border/50 pt-2 space-y-1">
          {absenceGroups.map(group => (
            <div key={group.type} className="flex justify-between items-center text-rose-500">
              <span className="flex items-center gap-1">
                <span className="text-xs">{group.icon}</span>
                <span className="text-xs">{group.label} ({group.days}д):</span>
              </span>
              <span className="font-medium">-{Math.round(group.hours * 10) / 10}ч</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Compensation */}
      {(compensationData.confirmedHours > 0 || compensationData.confirmedMinutes > 0 || 
        compensationData.pendingHours > 0 || compensationData.pendingMinutes > 0) && (
        <div className="border-t border-border/50 pt-2">
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
              <span>Ожидает отработки:</span>
              <span className="font-medium">
                ~{formatTime(compensationData.pendingHours, compensationData.pendingMinutes)}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Actual */}
      {actualData.hasData && (
        <div className="border-t border-border/50 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Факт:</span>
            <span className="font-medium">{formatTime(actualData.hours, actualData.minutes)}</span>
          </div>
        </div>
      )}
      
      {/* Difference */}
      {difference !== null && (
        <div className="border-t border-border/50 pt-2">
          <div className={`flex justify-between items-center ${difference >= 0 ? "text-green-500" : "text-amber-500"}`}>
            <span>{difference >= 0 ? "Переработка:" : "Недоработка:"}</span>
            <span className="font-bold">{formatDiff(difference)}</span>
          </div>
        </div>
      )}
      
      {/* Pending balance (if no actual data) */}
      {!actualData.hasData && totalAbsenceHours > 0 && (
        <div className="border-t border-border/50 pt-2">
          <div className="flex justify-between items-center text-amber-500">
            <span>К отработке:</span>
            <span className="font-bold">
              {Math.round((totalAbsenceHours - compensationData.totalConfirmedMinutes / 60) * 10) / 10}ч
            </span>
          </div>
        </div>
      )}
      
      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        Нажмите для редактирования табеля
      </div>
    </div>
  );
};
