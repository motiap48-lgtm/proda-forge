import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, CheckCircle, Play, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useProductionOrder } from "@/hooks/useProductionOrders";
import { 
  useProductionOrderOperations, 
  useProductionOrderHistory,
  useUpdateOperationStatus 
} from "@/hooks/useProductionOrderDetails";
import { useAuth } from "@/contexts/AuthContext";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const operationStatusConfig = {
  pending: { label: "Ожидание", variant: "secondary" as const },
  in_progress: { label: "Выполняется", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
};

const ProductionOrderDetailsNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: order, isLoading } = useProductionOrder(id || "");
  const { data: operations } = useProductionOrderOperations(order?.id || "");
  const { data: history } = useProductionOrderHistory(order?.id || "");
  const updateStatus = useUpdateOperationStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8">
          <p className="text-muted-foreground">Заказ не найден</p>
        </div>
      </div>
    );
  }

  const progress = (order.completed_quantity / order.quantity) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/production-orders")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заказам
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{order.order_number}</h1>
                <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}>
                  {statusConfig[order.status as keyof typeof statusConfig]?.label}
                </Badge>
              </div>
              <p className="text-xl text-foreground">{order.products?.name}</p>
              <p className="text-muted-foreground">Спецификация: {order.specifications?.code}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate(`/production-orders/${order.order_number}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Прогресс</p>
              <p className="text-2xl font-bold text-foreground mb-2">{progress.toFixed(0)}%</p>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Выполнено</p>
              <p className="text-2xl font-bold text-foreground">
                {order.completed_quantity} / {order.quantity}
              </p>
              <p className="text-xs text-muted-foreground">единиц продукции</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Плановое окончание</p>
              <p className="text-2xl font-bold text-foreground">
                {new Date(order.planned_end_date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Рабочий центр</p>
              <p className="text-xl font-bold text-foreground">{order.work_centers?.name || "Не указан"}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="operations">Операции</TabsTrigger>
            <TabsTrigger value="info">Общая информация</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            {operations?.map((operation) => {
              const opProgress = (Number(operation.completed_quantity) / order.quantity) * 100;
              return (
                <Card key={operation.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {operation.sequence}
                          </span>
                          <h3 className="font-semibold text-foreground">
                            {operation.routing_operations?.name}
                          </h3>
                          <Badge variant={operationStatusConfig[operation.status as keyof typeof operationStatusConfig]?.variant}>
                            {operationStatusConfig[operation.status as keyof typeof operationStatusConfig]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {operation.routing_operations?.work_centers?.name}
                        </p>
                        <div className="grid gap-2 md:grid-cols-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Выполнено: </span>
                            <span className="font-medium text-foreground">
                              {operation.completed_quantity} / {order.quantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Оператор: </span>
                            <span className="font-medium text-foreground">
                              {operation.profiles?.full_name || "Не назначен"}
                            </span>
                          </div>
                        </div>
                        {operation.status !== "pending" && (
                          <div className="mt-3">
                            <Progress value={opProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                      {operation.status === "pending" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateStatus.mutate({ 
                            id: operation.id, 
                            status: "in_progress" 
                          })}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Запустить
                        </Button>
                      )}
                      {operation.status === "in_progress" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateStatus.mutate({ 
                            id: operation.id, 
                            status: "completed",
                            completedQuantity: order.quantity
                          })}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Завершить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Общая информация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Номер заказа</p>
                      <p className="font-medium text-foreground">{order.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Продукт</p>
                      <p className="font-medium text-foreground">{order.products?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Количество</p>
                      <p className="font-medium text-foreground">{order.quantity} шт</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Плановое начало</p>
                      <p className="font-medium text-foreground">
                        {new Date(order.planned_start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Плановое окончание</p>
                      <p className="font-medium text-foreground">
                        {new Date(order.planned_end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Ответственный</p>
                      <p className="font-medium text-foreground">{order.responsible_person || "Не указан"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>История изменений</CardTitle>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex gap-4 border-l-2 border-primary/20 pl-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {entry.description || entry.change_type}
                          </p>
                          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                            <span>{new Date(entry.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span>{entry.profiles?.full_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">История изменений пуста</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProductionOrderDetailsNew;
