import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  Target,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface DashboardMetricsProps {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  overdueOrders: number;
  onTimeOrders: number;
  customersWithOrders: number;
  totalQuantity: number;
  completedQuantity: number;
  isLoading?: boolean;
}

export const DashboardMetrics = ({
  totalOrders,
  activeOrders,
  completedOrders,
  overdueOrders,
  onTimeOrders,
  customersWithOrders,
  totalQuantity,
  completedQuantity,
  isLoading,
}: DashboardMetricsProps) => {
  const completionRate = totalQuantity > 0 
    ? Math.round((completedQuantity / totalQuantity) * 100) 
    : 0;
  const onTimeRate = activeOrders > 0 
    ? Math.round((onTimeOrders / activeOrders) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Всего заказов",
      value: totalOrders,
      icon: Package,
      color: "text-blue-500",
    },
    {
      label: "В работе",
      value: activeOrders,
      icon: Loader2,
      color: "text-primary",
    },
    {
      label: "Завершено",
      value: completedOrders,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Просрочено",
      value: overdueOrders,
      icon: AlertTriangle,
      color: overdueOrders > 0 ? "text-destructive" : "text-muted-foreground",
      badge: overdueOrders > 0 ? "destructive" : undefined,
    },
    {
      label: "В срок",
      value: `${onTimeRate}%`,
      icon: Clock,
      color: onTimeRate >= 80 ? "text-green-500" : "text-amber-500",
    },
    {
      label: "Выполнение",
      value: `${completionRate}%`,
      icon: Target,
      color: "text-primary",
    },
    {
      label: "План (шт)",
      value: totalQuantity.toLocaleString(),
      icon: TrendingUp,
      color: "text-muted-foreground",
    },
    {
      label: "Клиентов",
      value: customersWithOrders,
      icon: Users,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <metric.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${metric.color}`} />
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {metric.label}
              </span>
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2">
              <span className="text-lg sm:text-xl font-bold">{metric.value}</span>
              {metric.badge && (
                <Badge variant={metric.badge as "destructive"} className="text-[10px] sm:text-xs px-1">
                  !
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
