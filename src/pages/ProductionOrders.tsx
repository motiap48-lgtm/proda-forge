import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const priorityConfig = {
  low: { label: "Низкий", variant: "outline" as const },
  normal: { label: "Обычный", variant: "secondary" as const },
  high: { label: "Высокий", variant: "default" as const },
  urgent: { label: "Срочный", variant: "destructive" as const },
};

const ProductionOrdersContent = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders, isLoading } = useProductionOrders();

  const filteredOrders = (orders || []).filter((order) => {
    const productName = order.products?.name || "";
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Фильтры
                </Button>
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
