import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, CheckCircle, Play, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockOrderDetails = {
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
  created_at: "2024-01-10",
  notes: "Срочный заказ для клиента АО 'Промтех'",
  materials: [
    { name: "Сталь листовая 3мм", required: 250, reserved: 250, issued: 165, unit: "кг" },
    { name: "Болты М8х20", required: 2000, reserved: 2000, issued: 1300, unit: "шт" },
    { name: "Краска эмаль", required: 15, reserved: 15, issued: 10, unit: "л" },
  ],
  operations: [
    {
      sequence: 10,
      name: "Резка заготовок",
      work_center: "Лазерная резка",
      status: "completed",
      planned_time: 8,
      actual_time: 7.5,
      completed: 500,
      total: 500,
    },
    {
      sequence: 20,
      name: "Гибка",
      work_center: "Гибочный участок",
      status: "in_progress",
      planned_time: 12,
      actual_time: 8,
      completed: 325,
      total: 500,
    },
    {
      sequence: 30,
      name: "Сварка",
      work_center: "Сварочный участок",
      status: "planned",
      planned_time: 16,
      actual_time: 0,
      completed: 0,
      total: 500,
    },
    {
      sequence: 40,
      name: "Покраска",
      work_center: "Окрасочный цех",
      status: "planned",
      planned_time: 6,
      actual_time: 0,
      completed: 0,
      total: 500,
    },
  ],
  history: [
    { date: "2024-01-15 09:00", user: "Иванов И.И.", action: "Заказ запущен в производство" },
    { date: "2024-01-16 14:30", user: "Система", action: "Операция 'Резка заготовок' завершена" },
    { date: "2024-01-16 15:00", user: "Петров П.П.", action: "Операция 'Гибка' начата" },
    { date: "2024-01-20 11:00", user: "Система", action: "Выполнено 200 из 500 единиц" },
    { date: "2024-01-25 16:45", user: "Система", action: "Выполнено 325 из 500 единиц" },
  ],
};

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const operationStatusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  in_progress: { label: "Выполняется", variant: "default" as const },
  completed: { label: "Завершено", variant: "outline" as const },
};

const ProductionOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const progress = (mockOrderDetails.completed / mockOrderDetails.quantity) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/production-orders")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заказам
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{mockOrderDetails.id}</h1>
                <Badge variant={statusConfig[mockOrderDetails.status].variant}>
                  {statusConfig[mockOrderDetails.status].label}
                </Badge>
              </div>
              <p className="text-xl text-foreground">{mockOrderDetails.product}</p>
              <p className="text-muted-foreground">Спецификация: {mockOrderDetails.specification}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
              <Button variant="outline">
                <Pause className="mr-2 h-4 w-4" />
                Приостановить
              </Button>
              <Button variant="outline" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Отменить
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
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
                {mockOrderDetails.completed} / {mockOrderDetails.quantity}
              </p>
              <p className="text-xs text-muted-foreground">единиц продукции</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Плановое окончание</p>
              <p className="text-2xl font-bold text-foreground">{mockOrderDetails.planned_end}</p>
              <p className="text-xs text-accent">В срок</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Рабочий центр</p>
              <p className="text-xl font-bold text-foreground">{mockOrderDetails.work_center}</p>
              <p className="text-xs text-muted-foreground">{mockOrderDetails.responsible}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="operations">Операции</TabsTrigger>
            <TabsTrigger value="materials">Материалы</TabsTrigger>
            <TabsTrigger value="info">Общая информация</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            {mockOrderDetails.operations.map((operation) => {
              const opProgress = (operation.completed / operation.total) * 100;
              return (
                <Card key={operation.sequence}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {operation.sequence}
                          </span>
                          <h3 className="font-semibold text-foreground">{operation.name}</h3>
                          <Badge variant={operationStatusConfig[operation.status].variant}>
                            {operationStatusConfig[operation.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{operation.work_center}</p>
                        <div className="grid gap-2 md:grid-cols-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Выполнено: </span>
                            <span className="font-medium text-foreground">
                              {operation.completed} / {operation.total}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Плановое время: </span>
                            <span className="font-medium text-foreground">{operation.planned_time} ч</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Фактическое время: </span>
                            <span className="font-medium text-foreground">{operation.actual_time} ч</span>
                          </div>
                        </div>
                        {operation.status !== "planned" && (
                          <div className="mt-3">
                            <Progress value={opProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                      {operation.status === "in_progress" && (
                        <Button size="sm" variant="outline">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Завершить
                        </Button>
                      )}
                      {operation.status === "planned" && (
                        <Button size="sm" variant="outline">
                          <Play className="mr-2 h-4 w-4" />
                          Запустить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>Потребность в материалах</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOrderDetails.materials.map((material, index) => {
                    const reservedPercent = (material.reserved / material.required) * 100;
                    const issuedPercent = (material.issued / material.required) * 100;
                    return (
                      <div key={index} className="rounded-lg border p-4">
                        <h4 className="font-semibold text-foreground mb-3">{material.name}</h4>
                        <div className="grid gap-4 md:grid-cols-3 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Требуется: </span>
                            <span className="font-medium text-foreground">
                              {material.required} {material.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Зарезервировано: </span>
                            <span className="font-medium text-foreground">
                              {material.reserved} {material.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Выдано: </span>
                            <span className="font-medium text-foreground">
                              {material.issued} {material.unit}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">Резервирование</span>
                              <span className="text-foreground">{reservedPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={reservedPercent} className="h-2" />
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">Выдано</span>
                              <span className="text-foreground">{issuedPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={issuedPercent} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
                      <p className="font-medium text-foreground">{mockOrderDetails.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Продукт</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.product}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Спецификация</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.specification}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Количество</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.quantity} шт</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Создан</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.created_at}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Плановое начало</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.planned_start}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Плановое окончание</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.planned_end}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Фактическое начало</p>
                      <p className="font-medium text-foreground">{mockOrderDetails.actual_start}</p>
                    </div>
                  </div>
                </div>
                {mockOrderDetails.notes && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Примечания</p>
                    <p className="rounded-lg bg-secondary p-4 text-foreground">{mockOrderDetails.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>История изменений</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOrderDetails.history.map((entry, index) => (
                    <div key={index} className="flex gap-4 border-l-2 border-primary/20 pl-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{entry.action}</p>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                          <span>{entry.date}</span>
                          <span>•</span>
                          <span>{entry.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProductionOrderDetails;
