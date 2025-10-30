import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrders } from "@/hooks/useProductionOrders";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

export const ProductionOrders = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useProductionOrders();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Производственные заказы</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  const activeOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').slice(0, 4) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Производственные заказы</CardTitle>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-primary to-primary-glow"
          onClick={() => navigate("/production-orders/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Новый заказ
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeOrders.map((order) => {
            const progress = (order.completed_quantity / order.quantity) * 100;
            return (
              <div
                key={order.id}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                onClick={() => navigate(`/production-orders/${order.order_number}`)}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-foreground">{order.order_number}</p>
                    <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}>
                      {statusConfig[order.status as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.products?.name}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Количество: {order.quantity} шт</span>
                    <span>Срок: {new Date(order.planned_end_date).toLocaleDateString()}</span>
                  </div>
                  {order.status === "in_progress" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Прогресс</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
