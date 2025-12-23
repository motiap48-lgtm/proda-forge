import React from "react";
import { 
  Sun, 
  Timer, 
  Briefcase, 
  HeartPulse, 
  Plane, 
  Baby, 
  Calendar, 
  UserX,
  Zap,
  Clock,
  AlertTriangle,
  HelpCircle as OtherIcon,
  X,
  FilterX,
  Coffee
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShiftColors } from "../utils";
import type { AbsenceStatusFilter, AbsenceTypeFilter } from "./CalendarToolbar";

interface LegendItem {
  icon?: React.ReactNode;
  color?: string;
  label: string;
  description?: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface ShiftDetail {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  grossWorkMinutes: number;
  netWorkMinutes: number;
}

interface CalendarLegendProps {
  shiftColorMap?: Map<string, ShiftColors>;
  shiftDetails?: Map<string, ShiftDetail>;
  absenceStatusFilter?: AbsenceStatusFilter;
  onAbsenceStatusFilterChange?: (filter: AbsenceStatusFilter) => void;
  absenceTypeFilter?: AbsenceTypeFilter;
  onAbsenceTypeFilterChange?: (filter: AbsenceTypeFilter) => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number; // Number of active filters
  onResetFilters?: () => void;
  defaultReductionHours?: number; // Default reduction hours for shortened days
}

const formatMinutesToHoursMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
};

export const CalendarLegend = ({ 
  shiftColorMap,
  shiftDetails,
  absenceStatusFilter,
  onAbsenceStatusFilterChange,
  absenceTypeFilter,
  onAbsenceTypeFilterChange,
  hasActiveFilters,
  activeFiltersCount = 0,
  onResetFilters,
  defaultReductionHours = 1
}: CalendarLegendProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Build shortened day description with hours for each schedule
  const getShortenedDayDetails = () => {
    if (!shiftDetails || shiftDetails.size === 0) {
      return `Предпраздничный день. Рабочее время сокращается на ${defaultReductionHours} час${defaultReductionHours === 1 ? '' : 'а'}.`;
    }
    
    const lines: string[] = [`Сокращение: −${defaultReductionHours} ч`];
    
    shiftDetails.forEach((detail, name) => {
      const normalHours = Math.floor(detail.netWorkMinutes / 60);
      const normalMins = detail.netWorkMinutes % 60;
      const reducedMinutes = detail.netWorkMinutes - (defaultReductionHours * 60);
      const reducedHours = Math.floor(reducedMinutes / 60);
      const reducedMins = reducedMinutes % 60;
      
      const normalStr = normalMins > 0 ? `${normalHours}ч ${normalMins}м` : `${normalHours}ч`;
      const reducedStr = reducedMins > 0 ? `${reducedHours}ч ${reducedMins}м` : `${reducedHours}ч`;
      
      lines.push(`${name}: ${normalStr} → ${reducedStr}`);
    });
    
    return lines.join('\n');
  };

  const calendarDays: LegendItem[] = [
    {
      color: "bg-red-100 text-red-700 border-red-200",
      icon: <Sun className="h-3 w-3" />,
      label: "Праздник",
      description: "Нерабочий праздничный день"
    },
    {
      color: "bg-amber-100 text-amber-700 border-amber-200",
      icon: <Timer className="h-3 w-3" />,
      label: `Сокращённый день (−${defaultReductionHours} ч)`,
      description: getShortenedDayDetails()
    },
    {
      color: "bg-muted text-muted-foreground",
      label: "Выходной",
      description: "Выходной день по графику"
    },
    {
      color: "border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700",
      icon: <Zap className="h-3 w-3" />,
      label: "Изменён график",
      description: "День с ручным изменением графика"
    },
  ];

  // All absence types matching AbsenceTypeFilter
  const absenceTypes: LegendItem[] = [
    {
      color: "bg-emerald-500",
      icon: <Briefcase className="h-3 w-3 text-white" />,
      label: "Отпуск",
      description: "Ежегодный оплачиваемый отпуск (annual_leave)",
      isActive: absenceTypeFilter === "annual_leave",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "annual_leave" ? "all" : "annual_leave")
    },
    {
      color: "bg-rose-500",
      icon: <HeartPulse className="h-3 w-3 text-white" />,
      label: "Больничный",
      description: "Временная нетрудоспособность (sick_leave)",
      isActive: absenceTypeFilter === "sick_leave",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "sick_leave" ? "all" : "sick_leave")
    },
    {
      color: "bg-amber-500",
      icon: <Calendar className="h-3 w-3 text-white" />,
      label: "Адм. отпуск",
      description: "Административный отпуск (administrative_leave)",
      isActive: absenceTypeFilter === "administrative_leave",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "administrative_leave" ? "all" : "administrative_leave")
    },
    {
      color: "bg-violet-500",
      icon: <Baby className="h-3 w-3 text-white" />,
      label: "Декрет",
      description: "Отпуск по уходу за ребёнком (maternity_leave)",
      isActive: absenceTypeFilter === "maternity_leave",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "maternity_leave" ? "all" : "maternity_leave")
    },
    {
      color: "bg-gray-500",
      icon: <UserX className="h-3 w-3 text-white" />,
      label: "Без сохр. з/п",
      description: "Отпуск без сохранения заработной платы (unpaid_leave)",
      isActive: absenceTypeFilter === "unpaid_leave",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "unpaid_leave" ? "all" : "unpaid_leave")
    },
    {
      color: "bg-sky-500",
      icon: <Plane className="h-3 w-3 text-white" />,
      label: "Командировка",
      description: "Служебная командировка (business_trip)",
      isActive: absenceTypeFilter === "business_trip",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "business_trip" ? "all" : "business_trip")
    },
    {
      color: "bg-red-600",
      icon: <AlertTriangle className="h-3 w-3 text-white" />,
      label: "Прогул",
      description: "Неявка без уважительной причины (unauthorized_absence)",
      isActive: absenceTypeFilter === "unauthorized_absence",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "unauthorized_absence" ? "all" : "unauthorized_absence")
    },
    {
      color: "bg-slate-400",
      icon: <OtherIcon className="h-3 w-3 text-white" />,
      label: "Прочее",
      description: "Другие причины отсутствия (other)",
      isActive: absenceTypeFilter === "other",
      onClick: () => onAbsenceTypeFilterChange?.(absenceTypeFilter === "other" ? "all" : "other")
    },
  ];

  const LegendSection = ({ title, items, interactive }: { title: string; items: LegendItem[]; interactive?: boolean }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              interactive && item.onClick && "cursor-pointer hover:opacity-80 transition-opacity",
              item.isActive && "ring-2 ring-primary ring-offset-1 rounded"
            )}
            title={item.description}
            onClick={item.onClick}
          >
            <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded border", item.color)}>
              {item.icon || null}
            </span>
            <span className="text-foreground/80">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Shift section with time and tooltip
  const ShiftSection = () => {
    if (!shiftColorMap || shiftColorMap.size === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Смены (наведите для подробностей)</h4>
        <div className="flex flex-wrap gap-3">
          <TooltipProvider delayDuration={100}>
            {Array.from(shiftColorMap.entries()).map(([name, colors]) => {
              const details = shiftDetails?.get(name);
              const timeRange = details?.startTime && details?.endTime 
                ? `${details.startTime} – ${details.endTime}` 
                : null;
              
              return (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs cursor-help">
                      <span className={cn(
                        "inline-flex items-center justify-center px-2 py-1 rounded border font-medium",
                        colors.bg, colors.text, colors.border
                      )}>
                        {name}
                      </span>
                      {timeRange ? (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeRange}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[10px]">
                          (время не указано)
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-3 max-w-xs">
                    <div className="space-y-2">
                      <div className="font-medium text-sm border-b pb-1">{name}</div>
                      {details ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>Время работы:</span>
                            <span className="font-medium">{details.startTime} – {details.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Продолжительность:</span>
                            <span className="font-medium">{formatMinutesToHoursMinutes(details.grossWorkMinutes)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coffee className="h-3.5 w-3.5 text-amber-500" />
                            <span>Перерыв:</span>
                            <span className="font-medium">{formatMinutesToHoursMinutes(details.breakMinutes)}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t">
                            <Zap className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Чистое рабочее время:</span>
                            <span className="font-medium text-emerald-600">{formatMinutesToHoursMinutes(details.netWorkMinutes)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Детальная информация о смене недоступна
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    );
  };

  // Filter status section
  const FilterStatusSection = () => {
    return (
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
              <FilterX className="h-3 w-3 mr-1" />
              Активные фильтры
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Нет активных фильтров
            </Badge>
          )}
        </div>
        {hasActiveFilters && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Сбросить все фильтры
          </Button>
        )}
      </div>
    );
  };

  // Shortened day hours table section
  const ShortenedDayTable = () => {
    if (!shiftDetails || shiftDetails.size === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-amber-500" />
          Сокращённые дни: расчёт по графикам (−{defaultReductionHours} ч)
        </h4>
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-amber-100/50 border-b border-amber-200/50">
                <th className="text-left px-2 py-1.5 font-medium text-amber-800">График</th>
                <th className="text-center px-2 py-1.5 font-medium text-amber-800">Норма</th>
                <th className="text-center px-2 py-1.5 font-medium text-amber-800">Сокращение</th>
                <th className="text-center px-2 py-1.5 font-medium text-emerald-700">Итого</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(shiftDetails.entries()).map(([name, detail], index) => {
                const normalMinutes = detail.netWorkMinutes;
                const reducedMinutes = normalMinutes - (defaultReductionHours * 60);
                const colors = shiftColorMap?.get(name);
                
                return (
                  <tr 
                    key={name} 
                    className={cn(
                      "border-b border-amber-100 last:border-0",
                      index % 2 === 0 ? "bg-white/50" : "bg-amber-50/30"
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                        colors?.bg, colors?.text, colors?.border, "border"
                      )}>
                        {name}
                      </span>
                    </td>
                    <td className="text-center px-2 py-1.5 text-muted-foreground">
                      {formatMinutesToHoursMinutes(normalMinutes)}
                    </td>
                    <td className="text-center px-2 py-1.5 text-amber-600 font-medium">
                      −{defaultReductionHours} ч
                    </td>
                    <td className="text-center px-2 py-1.5 text-emerald-600 font-medium">
                      {formatMinutesToHoursMinutes(reducedMinutes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Легенда
          {hasActiveFilters && activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-amber-500 text-white rounded-full">
              {activeFiltersCount}
            </Badge>
          )}
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="p-3 bg-muted/30 rounded-lg border space-y-4">
          <LegendSection title="Дни в календаре" items={calendarDays} />
          <LegendSection 
            title="Типы отсутствий (клик для фильтра)" 
            items={absenceTypes} 
            interactive={!!onAbsenceTypeFilterChange}
          />
          <ShiftSection />
          <ShortenedDayTable />
          <FilterStatusSection />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
