import { useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Clock,
  Settings,
  Wrench,
  Truck,
  ClipboardCheck,
  Package,
  AlertTriangle,
  List,
  GitBranch,
  Factory,
  ArrowDown,
  Printer,
  Download,
} from 'lucide-react';
import { ConsolidatedRoutingPrintView } from './ConsolidatedRoutingPrintView';
import { useRoutingSheets } from '@/hooks/useRoutingSheets';
import { useSpecifications } from '@/hooks/useSpecifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConsolidatedRoutingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productCode: string;
}

interface RoutingNode {
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  level: number;
  quantity: number;
  routingSheet: any | null;
  children: RoutingNode[];
}

const operationTypeIcons: Record<string, any> = {
  production: Wrench,
  transport: Truck,
  control: ClipboardCheck,
  setup: Settings,
};

const productTypeBadgeColors: Record<string, string> = {
  finished: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  assembly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'semi-finished': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  material: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const productTypeLabels: Record<string, string> = {
  finished: 'ГП',
  assembly: 'СБ',
  'semi-finished': 'ПФ',
  material: 'МАТ',
};

export function ConsolidatedRoutingDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productCode,
}: ConsolidatedRoutingDialogProps) {
  const { data: routingSheets = [] } = useRoutingSheets();
  const { data: specifications = [] } = useSpecifications();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Сводный техмаршрут - ${productCode}`,
  });

  // Build the consolidated routing tree
  const routingTree = useMemo(() => {
    const findRoutingSheet = (prodId: string) => {
      return routingSheets.find(rs => rs.product_id === prodId && rs.is_active);
    };

    const findSpecification = (prodId: string) => {
      return specifications.find(spec => spec.product_id === prodId && spec.is_active);
    };

    const buildTree = (
      prodId: string,
      prodName: string,
      prodCode: string,
      prodType: string,
      level: number,
      quantity: number,
      visited: Set<string> = new Set()
    ): RoutingNode => {
      if (visited.has(prodId)) {
        return {
          productId: prodId,
          productName: `${prodName} (цикл)`,
          productCode: prodCode,
          productType: prodType,
          level,
          quantity,
          routingSheet: null,
          children: [],
        };
      }

      const newVisited = new Set(visited);
      newVisited.add(prodId);

      const routingSheet = findRoutingSheet(prodId);
      const specification = findSpecification(prodId);
      const children: RoutingNode[] = [];

      if (specification && specification.specification_materials) {
        for (const mat of specification.specification_materials) {
          const product = (mat as any).products || (mat as any).material;
          if (product && ['semi-finished', 'assembly'].includes(product.product_type)) {
            const childNode = buildTree(
              mat.material_id,
              product.name,
              product.code,
              product.product_type,
              level + 1,
              mat.quantity,
              newVisited
            );
            children.push(childNode);
          }
        }
      }

      return {
        productId: prodId,
        productName: prodName,
        productCode: prodCode,
        productType: prodType,
        level,
        quantity,
        routingSheet,
        children,
      };
    };

    return buildTree(productId, productName, productCode, 'finished', 0, 1);
  }, [productId, productName, productCode, routingSheets, specifications]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalSetupTime = 0;
    let totalCycleTime = 0;
    let totalOperations = 0;
    let nodesWithoutRouting = 0;

    const traverse = (node: RoutingNode) => {
      if (node.routingSheet) {
        for (const op of node.routingSheet.routing_operations || []) {
          totalSetupTime += op.setup_time_minutes || 0;
          totalCycleTime += op.cycle_time_minutes || 0;
          totalOperations++;
        }
      } else if (node.productType !== 'material') {
        nodesWithoutRouting++;
      }
      node.children.forEach(traverse);
    };

    traverse(routingTree);

    return { totalSetupTime, totalCycleTime, totalOperations, nodesWithoutRouting };
  }, [routingTree]);

  // Flatten all operations for visualization
  const flatOperations = useMemo(() => {
    const ops: Array<{
      productName: string;
      productCode: string;
      productType: string;
      level: number;
      operation: any;
      workCenterName: string;
      workCenterCode: string;
    }> = [];

    const traverse = (node: RoutingNode) => {
      if (node.routingSheet) {
        const sortedOps = [...(node.routingSheet.routing_operations || [])].sort(
          (a: any, b: any) => a.sequence - b.sequence
        );
        for (const op of sortedOps) {
          ops.push({
            productName: node.productName,
            productCode: node.productCode,
            productType: node.productType,
            level: node.level,
            operation: op,
            workCenterName: op.work_centers?.name || 'Не указан',
            workCenterCode: op.work_centers?.code || '',
          });
        }
      }
      node.children.forEach(traverse);
    };

    traverse(routingTree);
    return ops;
  }, [routingTree]);

  const operationTypeLabelsRu: Record<string, string> = {
    production: 'Производство',
    transport: 'Транспортировка',
    control: 'Контроль',
    setup: 'Наладка',
  };

  const handleExportToExcel = () => {
    try {
      // Sheet 1: General Info
      const infoData = [
        ['Сводный техмаршрут'],
        [],
        ['Изделие', productName],
        ['Код изделия', productCode],
        ['Всего операций', totals.totalOperations],
        ['Общее время (мин)', totals.totalSetupTime + totals.totalCycleTime],
        ['Время наладки (мин)', totals.totalSetupTime],
        ['Время цикла (мин)', totals.totalCycleTime],
        ['Без маршрута', totals.nodesWithoutRouting],
      ];
      const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
      infoSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];

      // Sheet 2: All Operations
      const operationsHeader = [
        'Изделие',
        'Код изделия',
        'Тип изделия',
        'Уровень',
        '№ операции',
        'Операция',
        'Тип операции',
        'Участок (код)',
        'Участок (наименование)',
        'ПЗ (мин)',
        'Штучное время (мин)',
        'Общее время (мин)',
      ];
      const operationsData = flatOperations.map(item => [
        item.productName,
        item.productCode,
        productTypeLabels[item.productType] || item.productType,
        item.level,
        item.operation.sequence,
        item.operation.name,
        operationTypeLabelsRu[item.operation.operation_type] || item.operation.operation_type,
        item.workCenterCode,
        item.workCenterName,
        item.operation.setup_time_minutes || 0,
        item.operation.cycle_time_minutes || 0,
        (item.operation.setup_time_minutes || 0) + (item.operation.cycle_time_minutes || 0),
      ]);
      const operationsSheet = XLSX.utils.aoa_to_sheet([operationsHeader, ...operationsData]);
      operationsSheet['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 15 },
        { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 16 },
      ];

      // Sheet 3: Products in routing tree
      const productsHeader = [
        'Изделие',
        'Код изделия',
        'Тип изделия',
        'Уровень',
        'Количество',
        'Техмаршрут',
        'Код техмаршрута',
        'Кол-во операций',
      ];
      const productsData: any[][] = [];
      const collectProducts = (node: RoutingNode) => {
        productsData.push([
          node.productName,
          node.productCode,
          productTypeLabels[node.productType] || node.productType,
          node.level,
          node.quantity,
          node.routingSheet?.name || 'Нет',
          node.routingSheet?.code || '-',
          node.routingSheet?.routing_operations?.length || 0,
        ]);
        node.children.forEach(collectProducts);
      };
      collectProducts(routingTree);
      const productsSheet = XLSX.utils.aoa_to_sheet([productsHeader, ...productsData]);
      productsSheet['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 16 },
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, infoSheet, 'Информация');
      XLSX.utils.book_append_sheet(wb, operationsSheet, 'Операции');
      XLSX.utils.book_append_sheet(wb, productsSheet, 'Изделия');

      // Download
      XLSX.writeFile(wb, `Сводный_техмаршрут_${productCode}.xlsx`);
      toast.success('Файл успешно экспортирован');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Ошибка при экспорте в Excel');
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (node: RoutingNode) => {
      allIds.add(node.productId);
      node.children.forEach(collect);
    };
    collect(routingTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: RoutingNode, parentKey = ''): JSX.Element => {
    const nodeKey = `${parentKey}-${node.productId}-${node.level}`;
    const isExpanded = expandedNodes.has(node.productId);
    const hasChildren = node.children.length > 0;
    const hasRouting = !!node.routingSheet;

    return (
      <div key={nodeKey} className="border-l-2 border-muted pl-4 ml-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleNode(node.productId)}>
          <div className={cn(
            "rounded-lg border p-3 mb-2",
            !hasRouting && node.productType !== 'material' && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
          )}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1">
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}

                <Badge className={cn("shrink-0", productTypeBadgeColors[node.productType])}>
                  {productTypeLabels[node.productType]}
                </Badge>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{node.productName}</div>
                  <div className="text-xs text-muted-foreground">{node.productCode}</div>
                </div>

                {node.level > 0 && (
                  <div className="text-sm text-muted-foreground shrink-0">
                    × {node.quantity}
                  </div>
                )}

                {!hasRouting && node.productType !== 'material' && (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
              </div>
            </CollapsibleTrigger>

            {hasRouting && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {node.routingSheet.name}
                  <span className="text-muted-foreground font-normal">({node.routingSheet.code})</span>
                </div>

                <div className="space-y-1">
                  {(node.routingSheet.routing_operations || [])
                    .sort((a: any, b: any) => a.sequence - b.sequence)
                    .map((op: any, idx: number) => {
                      const IconComponent = operationTypeIcons[op.operation_type] || Wrench;
                      const workCenterDisplay = op.work_centers?.code && op.work_centers?.name 
                        ? `${op.work_centers.code} - ${op.work_centers.name}`
                        : (op.work_centers?.name || op.work_centers?.code || 'Не указан');
                      return (
                        <div
                          key={op.id}
                          className="flex items-center gap-3 py-1.5 px-2 bg-muted/30 rounded text-sm"
                        >
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {op.sequence}
                          </div>
                          <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{op.name}</span>
                          <Badge variant="outline" className="shrink-0">
                            {workCenterDisplay}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            <span>{op.setup_time_minutes + op.cycle_time_minutes} мин</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {hasChildren && (
            <CollapsibleContent>
              {node.children.map(child => renderNode(child, nodeKey))}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  const operationTypeConfig: Record<string, { 
    label: string; 
    icon: typeof Wrench; 
    color: string;
    bgColor: string;
    borderColor: string;
  }> = {
    production: { 
      label: "Производство", 
      icon: Wrench, 
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Сводный техмаршрут
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-3 px-4 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{productName}</div>
            <div className="text-sm text-muted-foreground">{productCode}</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totals.totalOperations}</span>
              <span className="text-muted-foreground">операций</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totals.totalSetupTime + totals.totalCycleTime}</span>
              <span className="text-muted-foreground">мин всего</span>
            </div>
            {totals.nodesWithoutRouting > 0 && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{totals.nodesWithoutRouting}</span>
                  <span>без маршрута</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="tree" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Дерево
            </TabsTrigger>
            <TabsTrigger value="flow" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Визуализация
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Развернуть всё
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Свернуть всё
              </Button>
            </div>
            <ScrollArea className="h-[calc(90vh_-_380px)]">
              <div className="pr-4">
                {renderNode(routingTree)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="flow" className="flex-1 flex flex-col min-h-0 mt-4">
            <ScrollArea className="h-[calc(90vh_-_340px)]">
              <div className="pr-4 space-y-4">
                {flatOperations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Нет операций для отображения
                  </div>
                ) : (
                  flatOperations.map((item, index) => {
                    const config = operationTypeConfig[item.operation.operation_type] || operationTypeConfig.production;
                    const Icon = config.icon;
                    const isLastInProduct = index === flatOperations.length - 1 || 
                      flatOperations[index + 1]?.productCode !== item.productCode;

                    return (
                      <div key={`${item.productCode}-${item.operation.id}-${index}`}>
                        {/* Show product header when product changes */}
                        {(index === 0 || flatOperations[index - 1]?.productCode !== item.productCode) && (
                          <div className="flex items-center gap-3 mb-3 pb-2 border-b">
                            <Badge className={cn("shrink-0", productTypeBadgeColors[item.productType])}>
                              {productTypeLabels[item.productType]}
                            </Badge>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">{item.productCode}</div>
                            </div>
                          </div>
                        )}

                        {/* Operation card */}
                        <div className={cn(
                          "relative rounded-lg border-2 p-4 ml-8",
                          config.bgColor,
                          config.borderColor
                        )}>
                          {/* Connection line */}
                          <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-border" />
                          
                          {/* Sequence badge */}
                          <Badge 
                            variant="secondary" 
                            className={cn("absolute -top-2 -left-2 font-mono font-bold", config.color)}
                          >
                            {item.operation.sequence}
                          </Badge>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className={cn("flex items-center gap-2 mb-1", config.color)}>
                                <Icon className="h-4 w-4" />
                                <span className="text-xs font-medium">{config.label}</span>
                              </div>
                              <p className="font-medium">{item.operation.name}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Factory className="h-4 w-4" />
                                <span>
                                  {item.workCenterCode && item.workCenterName 
                                    ? `${item.workCenterCode} - ${item.workCenterName}` 
                                    : (item.workCenterName || item.workCenterCode || 'Не указан')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{(item.operation.setup_time_minutes || 0) + (item.operation.cycle_time_minutes || 0)} мин</span>
                              </div>
                              {item.operation.setup_time_minutes > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  ПЗ: {item.operation.setup_time_minutes}м | Шт: {item.operation.cycle_time_minutes}м
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Arrow down to next */}
                        {!isLastInProduct && (
                          <div className="flex justify-center my-2">
                            <ArrowDown className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

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
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleExportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>

        {/* Hidden print view */}
        <div className="hidden">
          <ConsolidatedRoutingPrintView
            ref={printRef}
            productName={productName}
            productCode={productCode}
            totals={totals}
            flatOperations={flatOperations}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
