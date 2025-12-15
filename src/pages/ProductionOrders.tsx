import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Download, Loader2, GitBranch, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const priorityConfig = {
  low: { label: "Низкий", variant: "outline" as const },
  normal: { label: "Обычный", variant: "secondary" as const },
  high: { label: "Высокий", variant: "default" as const },
  urgent: { label: "Срочный", variant: "destructive" as const },
};

type HierarchyFilter = "all" | "parent" | "child" | "standalone";

const ProductionOrdersContent = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyFilter>("all");
  const { data: orders, isLoading } = useProductionOrders();

  // Count orders by hierarchy type
  const hierarchyCounts = useMemo(() => {
    if (!orders) return { parent: 0, child: 0, standalone: 0 };
    
    const parentIds = new Set(orders.filter(o => o.parent_order_id).map(o => o.parent_order_id));
    
    return {
      parent: orders.filter(o => parentIds.has(o.id)).length,
      child: orders.filter(o => o.parent_order_id).length,
      standalone: orders.filter(o => !o.parent_order_id && !parentIds.has(o.id)).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    const parentIds = new Set(orders.filter(o => o.parent_order_id).map(o => o.parent_order_id));
    
    return orders.filter((order) => {
      const productName = order.products?.name || "";
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      // Hierarchy filter
      let matchesHierarchy = true;
      if (hierarchyFilter === "parent") {
        matchesHierarchy = parentIds.has(order.id);
      } else if (hierarchyFilter === "child") {
        matchesHierarchy = !!order.parent_order_id;
      } else if (hierarchyFilter === "standalone") {
        matchesHierarchy = !order.parent_order_id && !parentIds.has(order.id);
      }
      
      return matchesSearch && matchesStatus && matchesHierarchy;
    });
  }, [orders, searchQuery, statusFilter, hierarchyFilter]);

  // Helper to check if an order is a parent
  const isParentOrder = (orderId: string) => {
    return orders?.some(o => o.parent_order_id === orderId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Производственные заказы</h1>
            <p className="text-muted-foreground">Управление и контроль производственных заказов</p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
            onClick={() => navigate("/production-orders/new")}
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать заказ
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру или продукту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Все
                </Button>
                <Button
                  variant={statusFilter === "planned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("planned")}
                >
                  Запланировано
                </Button>
                <Button
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  В работе
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Завершено
                </Button>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={hierarchyFilter !== "all" ? "default" : "outline"} size="sm">
                      <GitBranch className="mr-2 h-4 w-4" />
                      {hierarchyFilter === "all" ? "Иерархия" : 
                       hierarchyFilter === "parent" ? "Родительские" :
                       hierarchyFilter === "child" ? "Дочерние" : "Одиночные"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setHierarchyFilter("all")}>
                      Все заказы
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setHierarchyFilter("parent")}>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Родительские ({hierarchyCounts.parent})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHierarchyFilter("child")}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Дочерние ({hierarchyCounts.child})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHierarchyFilter("standalone")}>
                      Одиночные ({hierarchyCounts.standalone})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const progress = (order.completed_quantity / order.quantity) * 100;
            return (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => navigate(`/production-orders/${order.order_number}`)}
              >
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Order Info */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{order.order_number}</h3>
                        <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"}>
                          {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                        </Badge>
                        <Badge variant={priorityConfig[order.priority as keyof typeof priorityConfig]?.variant || "secondary"}>
                          {priorityConfig[order.priority as keyof typeof priorityConfig]?.label || order.priority}
                        </Badge>
                        {order.parent_order_id && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <GitBranch className="h-3 w-3 mr-1" />
                            Дочерний
                          </Badge>
                        )}
                        {isParentOrder(order.id) && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            Родительский
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{order.products?.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">
                        Спецификация: {order.specifications?.code || "N/A"}
                      </p>
                    </div>

                    {/* Production Info */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Производство</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.completed_quantity} / {order.quantity} шт
                      </p>
                      {order.status === "in_progress" && (
                        <div className="mt-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Сроки</p>
                      <p className="text-sm text-foreground">
                        Начало: {new Date(order.planned_start_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-foreground">
                        Окончание: {new Date(order.planned_end_date).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Responsible */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Исполнение</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.work_centers?.name || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.responsible_person || "Не назначен"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Заказы не найдены</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

const ProductionOrders = () => {
  return (
    <ProtectedRoute>
      <ProductionOrdersContent />
    </ProtectedRoute>
  );
};

export default ProductionOrders;
