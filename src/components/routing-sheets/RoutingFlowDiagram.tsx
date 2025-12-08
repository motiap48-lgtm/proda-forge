import { useMemo } from "react";
import { Factory, Truck, ClipboardCheck, Settings, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Operation {
  sequence: number;
  name: string;
  work_center_id: string;
  work_center_name?: string;
  work_center_code?: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: string;
}

interface RoutingFlowDiagramProps {
  operations: Operation[];
  workCenters?: { id: string; name: string; code: string; department?: string | null }[];
  className?: string;
}

const operationTypeConfig: Record<string, { 
  label: string; 
  icon: typeof Factory; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  production: { 
    label: "Производство", 
    icon: Factory, 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  transport: { 
    label: "Транспортировка", 
    icon: Truck, 
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800"
  },
  control: { 
    label: "Контроль", 
    icon: ClipboardCheck, 
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    borderColor: "border-green-200 dark:border-green-800"
  },
  setup: { 
    label: "Наладка", 
    icon: Settings, 
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800"
  },
};

export function RoutingFlowDiagram({ operations, workCenters, className }: RoutingFlowDiagramProps) {
  const enrichedOperations = useMemo(() => {
    return operations.map(op => {
      const wc = workCenters?.find(w => w.id === op.work_center_id);
      return {
        ...op,
        work_center_name: wc?.name || op.work_center_name || "Не указан",
        work_center_code: wc?.code || op.work_center_code || "",
        work_center_department: wc?.department,
      };
    }).sort((a, b) => a.sequence - b.sequence);
  }, [operations, workCenters]);

  if (enrichedOperations.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-8", className)}>
        Нет операций для отображения
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap items-start gap-2">
        {enrichedOperations.map((op, index) => {
          const config = operationTypeConfig[op.operation_type] || operationTypeConfig.production;
          const Icon = config.icon;

          return (
            <div key={index} className="flex items-center">
              <div 
                className={cn(
                  "relative rounded-lg border-2 p-3 min-w-[160px] max-w-[200px] transition-all hover:shadow-md",
                  config.bgColor,
                  config.borderColor
                )}
              >
                {/* Sequence badge */}
                <Badge 
                  variant="secondary" 
                  className={cn("absolute -top-2 -left-2 font-mono font-bold", config.color)}
                >
                  {op.sequence}
                </Badge>

                {/* Operation type icon and label */}
                <div className={cn("flex items-center gap-2 mb-2", config.color)}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>

                {/* Operation name */}
                <p className="font-medium text-sm mb-2 line-clamp-2">
                  {op.name || "Без названия"}
                </p>

                {/* Work center */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Factory className="h-3 w-3" />
                    <span className="truncate" title={op.work_center_name}>
                      {op.work_center_code || op.work_center_name}
                    </span>
                  </div>
                  {op.work_center_department && (
                    <div className="text-xs opacity-75">
                      {op.work_center_department}
                    </div>
                  )}
                </div>

                {/* Time info */}
                {(op.setup_time_minutes > 0 || op.cycle_time_minutes > 0) && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex gap-2">
                    {op.setup_time_minutes > 0 && (
                      <span>ПЗ: {op.setup_time_minutes}м</span>
                    )}
                    {op.cycle_time_minutes > 0 && (
                      <span>Шт: {op.cycle_time_minutes}м</span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow to next */}
              {index < enrichedOperations.length - 1 && (
                <ArrowRight className="h-5 w-5 mx-1 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs">
        {Object.entries(operationTypeConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className={cn("flex items-center gap-1.5", config.color)}>
              <Icon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
