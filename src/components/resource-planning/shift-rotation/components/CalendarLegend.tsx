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
  HelpCircle as OtherIcon
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
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

interface CalendarLegendProps {
  shiftColorMap?: Map<string, ShiftColors>;
  shiftDetails?: Map<string, { startTime: string; endTime: string }>;
  absenceStatusFilter?: AbsenceStatusFilter;
  onAbsenceStatusFilterChange?: (filter: AbsenceStatusFilter) => void;
  absenceTypeFilter?: AbsenceTypeFilter;
  onAbsenceTypeFilterChange?: (filter: AbsenceTypeFilter) => void;
}

export const CalendarLegend = ({ 
  shiftColorMap,
  shiftDetails,
  absenceStatusFilter,
  onAbsenceStatusFilterChange,
  absenceTypeFilter,
  onAbsenceTypeFilterChange
}: CalendarLegendProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

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
      label: "Сокращённый день",
      description: "Предпраздничный день с уменьшенной продолжительностью"
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

  // Shift section with time - always show time if available
  const ShiftSection = () => {
    if (!shiftColorMap || shiftColorMap.size === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Смены</h4>
        <div className="flex flex-wrap gap-3">
          {Array.from(shiftColorMap.entries()).map(([name, colors]) => {
            const details = shiftDetails?.get(name);
            const timeRange = details?.startTime && details?.endTime 
              ? `${details.startTime} – ${details.endTime}` 
              : null;
            
            return (
              <div
                key={name}
                className="flex items-center gap-2 text-xs"
                title={timeRange ? `${name}: ${timeRange}` : name}
              >
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
            );
          })}
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
