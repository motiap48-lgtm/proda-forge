import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mockOrders = [
  {
    id: "PO-2024-001",
    product: "Деталь А-125",
    specification: "SPEC-А-125-v2",
    quantity: 500,
    completed: 325,
    status: "in_progress",
    priority: "normal",
    planned_start: "2024-01-15",
    planned_end: "2024-02-15",
    actual_start: "2024-01-15",
    work_center: "Цех №1",
    responsible: "Иванов И.И.",
  },
  {
    id: "PO-2024-002",
    product: "Узел Б-340",
    specification: "SPEC-Б-340-v1",
    quantity: 200,
    completed: 0,
    status: "planned",
    priority: "high",
    planned_start: "2024-02-01",
    planned_end: "2024-02-20",
    actual_start: null,
    work_center: "Цех №2",
    responsible: "Петров П.П.",
  },
  {
    id: "PO-2024-003",
    product: "Компонент В-89",
    specification: "SPEC-В-89-v3",
    quantity: 1000,
    completed: 350,
    status: "in_progress",
    priority: "normal",
    planned_start: "2024-01-20",
    planned_end: "2024-02-18",
    actual_start: "2024-01-22",
    work_center: "Цех №1",
    responsible: "Сидоров С.С.",
  },
  {
    id: "PO-2024-004",
    product: "Изделие Г-456",
    specification: "SPEC-Г-456-v1",
    quantity: 150,
    completed: 150,
    status: "completed",
    priority: "normal",
    planned_start: "2024-01-10",
    planned_end: "2024-01-28",
    actual_start: "2024-01-10",
    work_center: "Цех №3",
    responsible: "Козлов К.К.",
  },
  {
    id: "PO-2024-005",
    product: "Деталь Д-789",
    specification: "SPEC-Д-789-v2",
    quantity: 750,
    completed: 0,
    status: "planned",
    priority: "urgent",
    planned_start: "2024-02-05",
    planned_end: "2024-02-25",
    actual_start: null,
    work_center: "Цех №2",
    responsible: "Новиков Н.Н.",
  },
];

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

const ProductionOrders = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            const progress = (order.completed / order.quantity) * 100;
            return (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => navigate(`/production-orders/${order.id}`)}
              >
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Order Info */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{order.id}</h3>
                        <Badge variant={statusConfig[order.status].variant}>
                          {statusConfig[order.status].label}
                        </Badge>
                        <Badge variant={priorityConfig[order.priority].variant}>
                          {priorityConfig[order.priority].label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{order.product}</p>
                      <p className="text-xs text-muted-foreground">Спецификация: {order.specification}</p>
                    </div>

                    {/* Production Info */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Производство</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.completed} / {order.quantity} шт
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
                        Начало: {order.planned_start}
                      </p>
                      <p className="text-sm text-foreground">
                        Окончание: {order.planned_end}
                      </p>
                    </div>

                    {/* Responsible */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Исполнение</p>
                      <p className="text-sm font-medium text-foreground">{order.work_center}</p>
                      <p className="text-xs text-muted-foreground">{order.responsible}</p>
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

export default ProductionOrders;
