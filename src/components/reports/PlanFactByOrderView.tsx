import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductionReportData } from "@/hooks/useProductionReports";

interface PlanFactByOrderViewProps {
  reports: ProductionReportData[];
  expandedOrders: Set<string>;
  onToggleOrder: (orderId: string) => void;
}

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  completed: { label: "Завершен", variant: "default" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>;
    default:
      return null;
  }
};

export const PlanFactByOrderView = ({
  reports,
  expandedOrders,
  onToggleOrder,
}: PlanFactByOrderViewProps) => {
  // Group orders: parent orders with their children
  const groupedOrders = useMemo(() => {
    // Find all parent orders (finished goods without parent_order_id)
    const parentOrders = reports.filter(r => r.product_type === 'finished' && !r.parent_order_id);
    
    // Map each parent to its children
    return parentOrders.map(parent => {
      const children = reports.filter(r => r.parent_order_id === parent.order_id);
      
      // Separate children by type
      const assemblies = children.filter(c => c.product_type === 'assembly');
      const semiFinished = children.filter(c => c.product_type === 'semi-finished');
      
      // Calculate totals
      const allRelated = [parent, ...children];
      const totals = allRelated.reduce((acc, r) => ({
        planned: acc.planned + r.planned_quantity,
        completed: acc.completed + r.completed_quantity,
      }), { planned: 0, completed: 0 });
      
      return {
        parent,
        assemblies,
        semiFinished,
        totals,
        childCount: children.length,
      };
    });
  }, [reports]);

  if (groupedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Нет данных для отображения в режиме "По заказам"
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupedOrders.map(({ parent, assemblies, semiFinished, totals, childCount }) => (
        <Collapsible 
          key={parent.order_id} 
          open={expandedOrders.has(parent.order_id)}
          onOpenChange={() => onToggleOrder(parent.order_id)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedOrders.has(parent.order_id) ? '' : '-rotate-90'}`} />
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>
                    <span className="font-mono">{parent.order_number}</span>
                    <span className="font-normal text-muted-foreground">—</span>
                    <span>{parent.product_name}</span>
                    {childCount > 0 && (
                      <span className="text-muted-foreground font-normal text-sm">
                        (+{childCount} компонентов)
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      План: {parent.planned_quantity} | Факт: {parent.completed_quantity}
                    </span>
                    <Badge variant={statusConfig[parent.status as keyof typeof statusConfig]?.variant || "secondary"}>
                      {statusConfig[parent.status as keyof typeof statusConfig]?.label || parent.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Parent order info */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Изделие:</span>
                      <div className="font-medium">{parent.product_name}</div>
                      <div className="text-xs text-muted-foreground">{parent.product_code}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Клиент:</span>
                      <div className="font-medium">{parent.customer_name || "—"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">План (исх./тек.):</span>
                      <div className="font-medium">
                        {parent.original_planned_quantity} / {parent.planned_quantity}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Отклонение:</span>
                      <div className={`font-medium ${parent.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parent.deviation > 0 ? '+' : ''}{parent.deviation} ({parent.deviation_percent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assemblies (СБ) */}
                {assemblies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>
                      Сборочные узлы ({assemblies.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер заказа</TableHead>
                          <TableHead>Изделие</TableHead>
                          <TableHead className="text-right">План</TableHead>
                          <TableHead className="text-right">Факт</TableHead>
                          <TableHead className="text-right">Откл.</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assemblies.map((report) => (
                          <TableRow key={report.order_number}>
                            <TableCell className="font-mono text-sm">{report.order_number}</TableCell>
                            <TableCell>
                              <div className="font-medium">{report.product_name}</div>
                              <div className="text-xs text-muted-foreground">{report.product_code}</div>
                            </TableCell>
                            <TableCell className="text-right">{report.planned_quantity}</TableCell>
                            <TableCell className="text-right">{report.completed_quantity}</TableCell>
                            <TableCell className={`text-right ${report.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.deviation > 0 ? '+' : ''}{report.deviation}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[report.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                                {statusConfig[report.status as keyof typeof statusConfig]?.label || report.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Semi-finished (ПФ) */}
                {semiFinished.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>
                      Полуфабрикаты ({semiFinished.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер заказа</TableHead>
                          <TableHead>Изделие</TableHead>
                          <TableHead className="text-right">План</TableHead>
                          <TableHead className="text-right">Факт</TableHead>
                          <TableHead className="text-right">Откл.</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semiFinished.map((report) => (
                          <TableRow key={report.order_number}>
                            <TableCell className="font-mono text-sm">{report.order_number}</TableCell>
                            <TableCell>
                              <div className="font-medium">{report.product_name}</div>
                              <div className="text-xs text-muted-foreground">{report.product_code}</div>
                            </TableCell>
                            <TableCell className="text-right">{report.planned_quantity}</TableCell>
                            <TableCell className="text-right">{report.completed_quantity}</TableCell>
                            <TableCell className={`text-right ${report.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.deviation > 0 ? '+' : ''}{report.deviation}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[report.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                                {statusConfig[report.status as keyof typeof statusConfig]?.label || report.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Summary for order */}
                {childCount > 0 && (
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <div className="text-sm text-muted-foreground">
                      <strong>Итого по заказу {parent.order_number}:</strong>{" "}
                      План: {totals.planned} | Факт: {totals.completed} | 
                      Отклонение: <span className={totals.completed - totals.planned >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {totals.completed - totals.planned > 0 ? '+' : ''}{totals.completed - totals.planned}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
