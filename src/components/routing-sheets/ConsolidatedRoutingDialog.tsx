import { useState, useMemo } from 'react';
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
  Settings2,
  Wrench,
  Truck,
  ClipboardCheck,
  Package,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { useRoutingSheets } from '@/hooks/useRoutingSheets';
import { useSpecifications } from '@/hooks/useSpecifications';
import { cn } from '@/lib/utils';

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
  setup: Settings2,
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
                          {op.work_center && (
                            <Badge variant="outline" className="shrink-0">
                              {op.work_center.code}
                            </Badge>
                          )}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Развернуть всё
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Свернуть всё
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="pr-4">
              {renderNode(routingTree)}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
