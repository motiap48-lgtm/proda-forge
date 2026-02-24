import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  AlertTriangle,
  User,
  Package,
  Calendar,
  Flag,
} from "lucide-react";
import { GroupBy } from "./DashboardFilters";
import { ProductionOrderWithCustomer } from "@/hooks/useProductionOrdersWithCustomers";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const priorityConfig = {
  high: { label: "Высокий", color: "text-destructive", icon: "🔴" },
  normal: { label: "Обычный", color: "text-primary", icon: "🟡" },
  low: { label: "Низкий", color: "text-muted-foreground", icon: "🟢" },
};

interface GroupedOrdersListProps {
  orders: ProductionOrderWithCustomer[];
  groupBy: GroupBy;
}

export const GroupedOrdersList = ({ orders, groupBy }: GroupedOrdersListProps) => {
  const navigate = useNavigate();

  const isOverdue = (date: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return new Date(date).getTime() < now.getTime();
  };

  const getDeadlineGroup = (date: string): string => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return "Просроченные";
    if (days === 0) return "Сегодня";
    if (days <= 3) return "Ближайшие 3 дня";
    if (days <= 7) return "На этой неделе";
    if (days <= 30) return "В этом месяце";
    return "Позже";
  };

  const groupedOrders = useMemo(() => {
    if (groupBy === "none") {
      return { "Все заказы": orders };
    }

    const groups: Record<string, ProductionOrderWithCustomer[]> = {};

    orders.forEach((order) => {
      let key: string;

      switch (groupBy) {
        case "customer":
          key = order.customers?.name || "Без клиента";
          break;
        case "product":
          key = order.products?.name || "Неизвестный продукт";
          break;
        case "deadline":
          key = getDeadlineGroup(order.planned_end_date);
          break;
        case "priority":
          key = priorityConfig[order.priority as keyof typeof priorityConfig]?.label || "Обычный";
          break;
        default:
          key = "Все";
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === "deadline") {
        const order = ["Просроченные", "Сегодня", "Ближайшие 3 дня", "На этой неделе", "В этом месяце", "Позже"];
        return order.indexOf(a) - order.indexOf(b);
      }
      if (groupBy === "priority") {
        const order = ["Высокий", "Обычный", "Низкий"];
        return order.indexOf(a) - order.indexOf(b);
      }
      if (a === "Без клиента") return 1;
      if (b === "Без клиента") return -1;
      return a.localeCompare(b, "ru");
    });

    const sorted: Record<string, ProductionOrderWithCustomer[]> = {};
    sortedKeys.forEach((key) => {
      sorted[key] = groups[key];
    });

    return sorted;
  }, [orders, groupBy]);

  const getGroupIcon = () => {
    switch (groupBy) {
      case "customer":
        return User;
      case "product":
        return Package;
      case "deadline":
        return Calendar;
      case "priority":
        return Flag;
      default:
        return Package;
    }
  };

  const GroupIcon = getGroupIcon();

  return (
    <div className="space-y-4">
      {Object.entries(groupedOrders).map(([groupName, groupOrders]) => {
        const overdueCount = groupOrders.filter((o) => isOverdue(o.planned_end_date)).length;
        const totalQuantity = groupOrders.reduce((sum, o) => sum + o.quantity, 0);
        const completedQuantity = groupOrders.reduce((sum, o) => sum + o.completed_quantity, 0);
        const progress = totalQuantity > 0 ? (completedQuantity / totalQuantity) * 100 : 0;

        return (
          <Collapsible key={groupName} defaultOpen>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-2 sm:py-3 px-3 sm:px-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <CardTitle className="text-sm sm:text-base font-medium truncate">
                        {groupName}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs shrink-0">{groupOrders.length}</Badge>
                      {overdueCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-0.5 sm:mr-1" />
                          {overdueCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{completedQuantity.toLocaleString()}</span>
                        <span>/</span>
                        <span>{totalQuantity.toLocaleString()} шт</span>
                        <span className="text-xs">({progress.toFixed(0)}%)</span>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform ui-open:rotate-180" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-3 sm:px-6">
                  <div className="space-y-2">
                    {groupOrders.map((order) => {
                      const orderProgress = (order.completed_quantity / order.quantity) * 100;
                      const orderOverdue = isOverdue(order.planned_end_date);

                      return (
                        <div
                          key={order.id}
                          className={`group flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border bg-card p-2.5 sm:p-3 transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer ${
                            orderOverdue ? "border-destructive/50 bg-destructive/5" : ""
                          }`}
                          onClick={() => navigate(`/production-orders/${order.order_number}`)}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{order.order_number}</span>
                              <Badge
                                variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}
                                className="text-xs"
                              >
                                {statusConfig[order.status as keyof typeof statusConfig]?.label}
                              </Badge>
                              {order.priority === "high" && (
                                <Badge variant="destructive" className="text-xs">
                                  Срочный
                                </Badge>
                              )}
                              {orderOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Просрочен
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span>{order.products?.name}</span>
                              {order.customers && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {order.customers.name}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className={orderOverdue ? "text-destructive font-medium" : ""}>
                                Срок: {new Date(order.planned_end_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 sm:mt-0">
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {order.completed_quantity} / {order.quantity}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {orderProgress.toFixed(0)}%
                              </div>
                            </div>
                            <div className="w-20">
                              <Progress value={orderProgress} className="h-2" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};
