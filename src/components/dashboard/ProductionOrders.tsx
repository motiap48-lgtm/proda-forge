import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Calendar, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

type DateFilter = "all" | "overdue" | "today" | "week" | "month";

const dateFilterConfig = {
  all: { label: "Все сроки" },
  overdue: { label: "Просроченные" },
  today: { label: "Сегодня" },
  week: { label: "Ближайшие 7 дней" },
  month: { label: "Ближайшие 30 дней" },
};

export const ProductionOrders = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useProductionOrders();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filteredAndSortedOrders = useMemo(() => {
    if (!orders) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const weekLater = today + 7 * 24 * 60 * 60 * 1000;
    const monthLater = today + 30 * 24 * 60 * 60 * 1000;
    const todayEnd = today + 24 * 60 * 60 * 1000;

    let filtered = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

    if (dateFilter !== "all") {
      filtered = filtered.filter(order => {
        const deadline = new Date(order.planned_end_date).getTime();
        switch (dateFilter) {
          case "overdue":
            return deadline < today;
          case "today":
            return deadline >= today && deadline < todayEnd;
          case "week":
            return deadline >= today && deadline <= weekLater;
          case "month":
            return deadline >= today && deadline <= monthLater;
          default:
            return true;
        }
      });
    }

    // Sort by deadline (closest first)
    return filtered
      .sort((a, b) => new Date(a.planned_end_date).getTime() - new Date(b.planned_end_date).getTime())
      .slice(0, 10);
  }, [orders, dateFilter]);

  const overdueCount = useMemo(() => {
    if (!orders) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return orders.filter(o => 
      o.status !== 'completed' && 
      o.status !== 'cancelled' && 
      new Date(o.planned_end_date).getTime() < now.getTime()
    ).length;
  }, [orders]);

  const totalActiveOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0;

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

  const isOverdue = (date: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return new Date(date).getTime() < now.getTime();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          Производственные заказы
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {overdueCount} просроч.
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {dateFilterConfig[dateFilter].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDateFilter("all")}>
                Все сроки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDateFilter("overdue")}>
                <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                Просроченные {overdueCount > 0 && `(${overdueCount})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("today")}>
                Сегодня
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("week")}>
                Ближайшие 7 дней
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("month")}>
                Ближайшие 30 дней
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-primary to-primary-glow"
            onClick={() => navigate("/production-orders/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новый заказ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredAndSortedOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет заказов по выбранному фильтру</p>
          ) : (
            filteredAndSortedOrders.map((order) => {
              const progress = (order.completed_quantity / order.quantity) * 100;
              const orderOverdue = isOverdue(order.planned_end_date);
              return (
                <div
                  key={order.id}
                  className={`group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer ${
                    orderOverdue ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                  onClick={() => navigate(`/production-orders/${order.order_number}`)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-foreground">{order.order_number}</p>
                      <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}>
                        {statusConfig[order.status as keyof typeof statusConfig]?.label}
                      </Badge>
                      {orderOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Просрочен
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{order.products?.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Количество: {order.quantity} шт</span>
                      <span className={orderOverdue ? "text-destructive font-medium" : ""}>
                        Срок: {new Date(order.planned_end_date).toLocaleDateString()}
                      </span>
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
            })
          )}
        </div>
      </CardContent>
      {totalActiveOrders > 10 && (
        <CardFooter className="pt-0">
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/production-orders")}
          >
            Показать все заказы ({totalActiveOrders})
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
