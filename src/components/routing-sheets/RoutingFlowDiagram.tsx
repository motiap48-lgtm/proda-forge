import { useMemo, useState, DragEvent } from "react";
import { Factory, Truck, ClipboardCheck, Settings, ArrowRight, GripVertical, Package, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OperationMaterial {
  product_id: string;
  product_name?: string;
  product_code?: string;
  product_type?: string;
  quantity?: number | null;
  unit?: string;
}

interface Operation {
  sequence: number;
  name: string;
  work_center_id: string;
  work_center_name?: string;
  work_center_code?: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: string;
  materials?: OperationMaterial[];
  is_external?: boolean;
  external_contractor?: string;
  external_lead_time_days?: number;
}

interface RoutingFlowDiagramProps {
  operations: Operation[];
  workCenters?: { id: string; name: string; code: string; department?: string | null }[];
  className?: string;
  editable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
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
  external: { 
    label: "Внешняя", 
    icon: Building2, 
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    borderColor: "border-orange-200 dark:border-orange-800"
  },
};

export function RoutingFlowDiagram({ operations, workCenters, className, editable = false, onReorder }: RoutingFlowDiagramProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!editable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!editable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (!editable || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    onReorder?.(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
          // Use external config if is_external, otherwise use operation_type config
          const config = op.is_external 
            ? operationTypeConfig.external 
            : (operationTypeConfig[op.operation_type] || operationTypeConfig.production);
          const Icon = config.icon;

          return (
            <div key={index} className="flex items-center">
              <div 
                className={cn(
                  "relative rounded-lg border-2 p-3 min-w-[160px] max-w-[200px] transition-all",
                  config.bgColor,
                  config.borderColor,
                  editable && "cursor-grab active:cursor-grabbing",
                  editable && "hover:shadow-md",
                  !editable && "hover:shadow-md",
                  draggedIndex === index && "opacity-50 scale-[0.98]",
                  dragOverIndex === index && "ring-2 ring-primary ring-offset-2"
                )}
                draggable={editable}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* Drag handle for editable mode */}
                {editable && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full pr-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

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

                {/* Work center or External contractor */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {op.is_external ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate" title={op.external_contractor || 'Контрагент не указан'}>
                          {op.external_contractor || 'Контрагент не указан'}
                        </span>
                      </div>
                      {op.external_lead_time_days && op.external_lead_time_days > 0 && (
                        <div className="text-xs opacity-75">
                          Срок: {op.external_lead_time_days} дн.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Factory className="h-3 w-3" />
                        <span className="truncate" title={op.work_center_code && op.work_center_name ? `${op.work_center_code} - ${op.work_center_name}` : (op.work_center_name || op.work_center_code)}>
                          {op.work_center_code && op.work_center_name 
                            ? `${op.work_center_code} - ${op.work_center_name}` 
                            : (op.work_center_name || op.work_center_code || 'Не указан')}
                        </span>
                      </div>
                      {op.work_center_department && (
                        <div className="text-xs opacity-75">
                          {op.work_center_department}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Materials linked to operation */}
                {op.materials && op.materials.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                          <Package className="h-3 w-3" />
                          <span>{op.materials.length} компонент{op.materials.length === 1 ? '' : op.materials.length < 5 ? 'а' : 'ов'}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1">
                          {op.materials.map((m, mIdx) => (
                            <div key={mIdx} className="text-xs">
                              <span className="font-medium">{m.product_code || m.product_name}</span>
                              {m.quantity && (
                                <span className="text-muted-foreground"> • {m.quantity} {m.unit}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Time info */}
                {(op.setup_time_minutes > 0 || op.cycle_time_minutes > 0) && (
                  <div className={cn(
                    "mt-2 pt-2 border-t text-xs text-muted-foreground flex gap-2",
                    op.materials && op.materials.length > 0 && "mt-1 pt-1"
                  )}>
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
