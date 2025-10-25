import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const orders = [
  {
    id: "PO-2024-001",
    product: "Деталь А-125",
    quantity: 500,
    status: "in_progress",
    progress: 65,
    deadline: "2024-02-15",
  },
  {
    id: "PO-2024-002",
    product: "Узел Б-340",
    quantity: 200,
    status: "planned",
    progress: 0,
    deadline: "2024-02-20",
  },
  {
    id: "PO-2024-003",
    product: "Компонент В-89",
    quantity: 1000,
    status: "in_progress",
    progress: 35,
    deadline: "2024-02-18",
  },
  {
    id: "PO-2024-004",
    product: "Изделие Г-456",
    quantity: 150,
    status: "completed",
    progress: 100,
    deadline: "2024-01-28",
  },
];

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
};

export const ProductionOrders = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Производственные заказы</CardTitle>
        <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow">
          <Plus className="mr-2 h-4 w-4" />
          Новый заказ
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-foreground">{order.id}</p>
                  <Badge variant={statusConfig[order.status].variant}>
                    {statusConfig[order.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{order.product}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Количество: {order.quantity} шт</span>
                  <span>Срок: {order.deadline}</span>
                </div>
                {order.status === "in_progress" && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Прогресс</span>
                      <span>{order.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
