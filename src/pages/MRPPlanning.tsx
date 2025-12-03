import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Calculator, Package, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMRPCalculation, usePurchaseRequisitions, useSaveMRPCalculation } from "@/hooks/useMRPPlanning";
import { MRPHistoryDialog } from "@/components/mrp/MRPHistoryDialog";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mockMRPData = {
  requirements: [
    {
      id: "1",
      material: "Сталь листовая 3мм",
      gross_requirement: 500,
      scheduled_receipts: 200,
      projected_available: 150,
      net_requirement: 150,
      planned_order: 200,
      status: "shortage",
    },
    {
      id: "2",
      material: "Болт М8х20",
      gross_requirement: 2000,
      scheduled_receipts: 1000,
      projected_available: 800,
      net_requirement: 200,
      planned_order: 500,
      status: "warning",
    },
    {
      id: "3",
      material: "Краска порошковая",
      gross_requirement: 50,
      scheduled_receipts: 100,
      projected_available: 75,
      net_requirement: 0,
      planned_order: 0,
      status: "ok",
    },
  ],
  purchaseRequisitions: [
    {
      id: "PR-001",
      material: "Сталь листовая 3мм",
      quantity: 200,
      required_date: "2024-02-10",
      status: "pending",
    },
    {
      id: "PR-002",
      material: "Болт М8х20",
      quantity: 500,
      required_date: "2024-02-15",
      status: "pending",
    },
  ],
};

const MRPPlanning = () => {
  const [planningHorizon, setPlanningHorizon] = useState(30);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const { data: mrpResult, isLoading, refetch } = useMRPCalculation(planningHorizon);
  const { data: purchaseReqs } = usePurchaseRequisitions();
  const saveMutation = useSaveMRPCalculation();

  const requirements = mrpResult?.requirements || [];
  const ordersWithoutSpec = mrpResult?.ordersWithoutSpec || [];

  const handleCalculate = async () => {
    const result = await refetch();
    if (result.data && result.data.requirements.length > 0) {
      // Сохраняем результаты расчета
      saveMutation.mutate({
        planningHorizonDays: planningHorizon,
        startDate: startDate,
        requirements: result.data.requirements,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortage":
        return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Дефицит</Badge>;
      case "warning":
        return <Badge variant="default"><AlertTriangle className="mr-1 h-3 w-3" />Внимание</Badge>;
      case "ok":
        return <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />В норме</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">MRP Планирование</h1>
          <p className="text-muted-foreground">
            Расчет потребности в материалах и планирование закупок
          </p>
        </div>

        {/* Planning Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Параметры расчета
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="horizon">Горизонт планирования (дней)</Label>
                <Input
                  id="horizon"
                  type="number"
                  value={planningHorizon}
                  onChange={(e) => setPlanningHorizon(parseInt(e.target.value) || 30)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Дата начала</Label>
                <Input 
                  id="startDate" 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1" 
                />
              </div>
              <div className="flex items-end">
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary-glow"
                  onClick={handleCalculate}
                  disabled={isLoading || saveMutation.isPending}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {isLoading || saveMutation.isPending ? "Расчет..." : "Выполнить расчет"}
                </Button>
              </div>
              <div className="flex items-end">
                <MRPHistoryDialog />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning for orders without specification */}
        {ordersWithoutSpec.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Заказы без спецификации</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Следующие заказы не имеют спецификации или материалов и не учтены в расчете потребности:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {ordersWithoutSpec.map((order) => (
                  <li key={order.order_number}>
                    <span className="font-medium">{order.order_number}</span> — {order.product_code} {order.product_name}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        <Tabs defaultValue="requirements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requirements">Потребности в материалах</TabsTrigger>
            <TabsTrigger value="requisitions">Заявки на закупку</TabsTrigger>
            <TabsTrigger value="schedule">График производства</TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Чистая потребность в материалах
                </CardTitle>
              </CardHeader>
              <CardContent>
              {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
                ) : requirements.length > 0 ? (
                  <div className="space-y-3">
                    {requirements.map((item) => (
                      <Card key={item.product_id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="grid gap-4 md:grid-cols-6">
                            <div className="md:col-span-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-foreground">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                  {getStatusBadge(item.status)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Валовая потребность</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.gross_requirement.toFixed(2)} {item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">На складе</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.on_hand.toFixed(2)} {item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Доступно</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.available.toFixed(2)} {item.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Чистая потребность</p>
                              <p className="text-sm font-bold text-primary">
                                {item.net_requirement.toFixed(2)} {item.unit}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Нет данных для отображения. Выполните расчет.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requisitions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Сформированные заявки на закупку</CardTitle>
              </CardHeader>
              <CardContent>
                {purchaseReqs && purchaseReqs.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {purchaseReqs.map((pr: any) => (
                        <Card key={pr.id} className="hover:border-primary transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="grid gap-4 md:grid-cols-5">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Номер заявки</p>
                                <p className="font-semibold text-foreground">{pr.requisition_number}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Материал</p>
                                <p className="text-sm text-foreground">{pr.products?.code} - {pr.products?.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Количество</p>
                                <p className="text-sm font-medium text-foreground">{Number(pr.quantity).toFixed(2)} {pr.products?.unit}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Требуемая дата</p>
                                <p className="text-sm text-foreground">{format(new Date(pr.required_date), "dd.MM.yyyy")}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Статус</p>
                                <Badge variant={pr.status === 'pending' ? 'default' : 'outline'}>
                                  {pr.status === 'pending' ? 'Ожидает' : pr.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                  <Button>
                    Создать заказы поставщикам
                  </Button>
                      <Button variant="outline">
                        Экспортировать
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Заявки на закупку отсутствуют
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  График производства будет доступен после выполнения расчета
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MRPPlanning;
