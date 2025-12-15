import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GitBranch, ArrowUp, ChevronRight, Loader2 } from "lucide-react";
import { useChildProductionOrders, useParentProductionOrder } from "@/hooks/useChildProductionOrders";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>;
    default:
      return null;
  }
};

interface OrderHierarchyCardProps {
  orderId: string;
}

export const OrderHierarchyCard = ({ orderId }: OrderHierarchyCardProps) => {
  const navigate = useNavigate();
  const { data: parentOrder, isLoading: parentLoading } = useParentProductionOrder(orderId);
  const { data: childOrders, isLoading: childrenLoading } = useChildProductionOrders(orderId);

  const hasParent = !!parentOrder;
  const hasChildren = childOrders && childOrders.length > 0;

  if (parentLoading || childrenLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5" />
            Иерархия заказов
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasParent && !hasChildren) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" />
          Иерархия заказов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent Order */}
        {hasParent && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              Родительский заказ
            </p>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => navigate(`/production-orders/${parentOrder.order_number}`)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {getProductTypeBadge(parentOrder.products?.product_type)}
                  <div className="text-left">
                    <div className="font-medium">{parentOrder.order_number}</div>
                    <div className="text-xs text-muted-foreground">{parentOrder.products?.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[parentOrder.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                    {statusConfig[parentOrder.status as keyof typeof statusConfig]?.label || parentOrder.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Child Orders */}
        {hasChildren && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              Дочерние заказы ({childOrders.length})
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {childOrders.map((child: any) => {
                const progress = child.quantity > 0 ? (child.completed_quantity / child.quantity) * 100 : 0;
                return (
                  <Button
                    key={child.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => navigate(`/production-orders/${child.order_number}`)}
                  >
                    <div className="flex flex-col w-full gap-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          {getProductTypeBadge(child.products?.product_type)}
                          <div className="text-left">
                            <div className="font-medium">{child.order_number}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {child.products?.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusConfig[child.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                            {statusConfig[child.status as keyof typeof statusConfig]?.label || child.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {child.completed_quantity}/{child.quantity}
                        </span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
