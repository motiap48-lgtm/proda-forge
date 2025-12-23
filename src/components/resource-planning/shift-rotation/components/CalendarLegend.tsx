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
  Zap
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

interface LegendItem {
  icon?: React.ReactNode;
  color?: string;
  label: string;
  description?: string;
}

interface CalendarLegendProps {
  shiftColorMap?: Map<string, ShiftColors>;
}

export const CalendarLegend = ({ shiftColorMap }: CalendarLegendProps) => {
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

  const absenceTypes: LegendItem[] = [
    {
      color: "bg-emerald-500",
      icon: <Briefcase className="h-3 w-3 text-white" />,
      label: "Отпуск",
      description: "Ежегодный оплачиваемый отпуск"
    },
    {
      color: "bg-rose-500",
      icon: <HeartPulse className="h-3 w-3 text-white" />,
      label: "Больничный",
      description: "Временная нетрудоспособность"
    },
    {
      color: "bg-sky-500",
      icon: <Plane className="h-3 w-3 text-white" />,
      label: "Командировка",
      description: "Служебная командировка"
    },
    {
      color: "bg-violet-500",
      icon: <Baby className="h-3 w-3 text-white" />,
      label: "Декрет",
      description: "Отпуск по уходу за ребёнком"
    },
    {
      color: "bg-amber-500",
      icon: <Calendar className="h-3 w-3 text-white" />,
      label: "Адм. отпуск",
      description: "Административный отпуск"
    },
    {
      color: "bg-gray-500",
      icon: <UserX className="h-3 w-3 text-white" />,
      label: "Без сохр. з/п",
      description: "Отпуск без сохранения заработной платы"
    },
  ];

  // Generate dynamic shifts from shiftColorMap
  const dynamicShifts: LegendItem[] = React.useMemo(() => {
    if (!shiftColorMap || shiftColorMap.size === 0) {
      return [];
    }

    return Array.from(shiftColorMap.entries()).map(([name, colors]) => ({
      color: cn(colors.bg, colors.text, colors.border),
      label: name,
      description: `Рабочая смена: ${name}`
    }));
  }, [shiftColorMap]);

  const LegendSection = ({ title, items }: { title: string; items: LegendItem[] }) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-1.5 text-xs"
            title={item.description}
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
          <LegendSection title="Типы отсутствий" items={absenceTypes} />
          {dynamicShifts.length > 0 && (
            <LegendSection title="Смены" items={dynamicShifts} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
