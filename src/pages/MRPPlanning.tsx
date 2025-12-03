import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  FileWarning,
  Factory,
  ShoppingCart,
  Warehouse,
  TrendingDown,
  TrendingUp,
  Printer,
  ListChecks,
  ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useMRPCalculation, 
  usePurchaseRequisitions, 
  useSaveMRPCalculation,
  useMRPProductionOrders,
  PurchaseRequirement,
  ProductionRequirement,
  WorkCenterReport
} from "@/hooks/useMRPPlanning";
import { MRPHistoryDialog } from "@/components/mrp/MRPHistoryDialog";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { printMRPReport } from "@/components/mrp/MRPPrintView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MRPPlanning = () => {
  const [planningHorizon, setPlanningHorizon] = useState(30);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [purchaseAlphaFilter, setPurchaseAlphaFilter] = useState<string | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [useSelectedOrders, setUseSelectedOrders] = useState(false);
  const [orderSelectionOpen, setOrderSelectionOpen] = useState(false);
  
  const { data: productionOrders, isLoading: ordersLoading } = useMRPProductionOrders(planningHorizon);
  const { data: mrpResult, isLoading, refetch } = useMRPCalculation(
    planningHorizon, 
    useSelectedOrders ? selectedOrderIds : undefined
  );
  const { data: purchaseReqs } = usePurchaseRequisitions();
  const saveMutation = useSaveMRPCalculation();

  const purchaseRequirements = mrpResult?.purchaseRequirements || [];
  const productionRequirements = mrpResult?.productionRequirements || [];
  const workCenterReports = mrpResult?.workCenterReports || [];
  const ordersWithoutSpec = mrpResult?.ordersWithoutSpec || [];
  const summary = mrpResult?.summary;

  const handleCalculate = async () => {
    const result = await refetch();
    if (result.data) {
      saveMutation.mutate({
        planningHorizonDays: planningHorizon,
        startDate: startDate,
        purchaseRequirements: result.data.purchaseRequirements,
        productionRequirements: result.data.productionRequirements,
      });
    }
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (productionOrders) {
      setSelectedOrderIds(productionOrders.map(o => o.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "shortage":
        return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Дефицит</Badge>;
      case "warning":
        return <Badge variant="default" className="bg-amber-500"><AlertTriangle className="mr-1 h-3 w-3" />Внимание</Badge>;
      case "ok":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />В норме</Badge>;
      default:
        return null;
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case "material":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">МАТ</Badge>;
      case "semi-finished":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>;
      case "assembly":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>;
      case "finished":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>;
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
            Расчет потребности в материалах и производственных мощностях
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">К закупке</p>
                    <p className="text-2xl font-bold">{summary.totalPurchaseItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Factory className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">К производству</p>
                    <p className="text-2xl font-bold">{summary.totalProductionItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Дефицит</p>
                    <p className="text-2xl font-bold">{summary.totalShortages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100">
                    <Warehouse className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Участков</p>
                    <p className="text-2xl font-bold">{summary.totalWorkCenters}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Order Selection - Collapsible */}
        <Collapsible open={orderSelectionOpen} onOpenChange={setOrderSelectionOpen} className="mb-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Выбор заказов для расчета
                      {useSelectedOrders && selectedOrderIds.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          Выбрано: {selectedOrderIds.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {useSelectedOrders 
                        ? `Расчет для ${selectedOrderIds.length} выбранных заказов`
                        : `Расчет для всех заказов в горизонте ${planningHorizon} дней`
                      }
                    </CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${orderSelectionOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="useSelected" 
                        checked={useSelectedOrders}
                        onCheckedChange={(checked) => setUseSelectedOrders(checked as boolean)}
                      />
                      <Label htmlFor="useSelected" className="cursor-pointer">
                        Рассчитать только для выбранных заказов
                      </Label>
                    </div>
                    {useSelectedOrders && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                          Выбрать все
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                          Снять выбор
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {useSelectedOrders && (
                    <div className="border rounded-md">
                      <ScrollArea className="h-[200px]">
                        <div className="p-4 space-y-2">
                          {ordersLoading ? (
                            <p className="text-sm text-muted-foreground">Загрузка заказов...</p>
                          ) : productionOrders && productionOrders.length > 0 ? (
                            productionOrders.map((order) => {
                              const product = order.products as any;
                              const remaining = order.quantity - order.completed_quantity;
                              return (
                                <div 
                                  key={order.id} 
                                  className={`flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                                    selectedOrderIds.includes(order.id) ? 'bg-muted' : ''
                                  }`}
                                  onClick={() => handleToggleOrder(order.id)}
                                >
                                  <Checkbox 
                                    checked={selectedOrderIds.includes(order.id)}
                                    onCheckedChange={() => handleToggleOrder(order.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{order.order_number}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {order.status === 'planned' ? 'Плановый' : 'Выпущен'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {product?.code} — {product?.name}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p className="font-medium">{remaining} {product?.unit}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(order.planned_start_date), 'dd.MM.yyyy')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">Нет заказов в горизонте планирования</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {useSelectedOrders && selectedOrderIds.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Выбрано заказов: <span className="font-medium">{selectedOrderIds.length}</span>
                    </p>
                  )}
                  
                  {!useSelectedOrders && (
                    <p className="text-sm text-muted-foreground">
                      Расчет будет выполнен для всех заказов со статусом "Плановый" и "Выпущен" в пределах горизонта планирования ({planningHorizon} дней)
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Warning for orders without specification */}
        {ordersWithoutSpec.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Заказы без спецификации</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Следующие заказы не имеют спецификации или материалов и не учтены в расчете:
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
        <Tabs defaultValue="purchase" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Потребность к закупке
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Потребность к производству
            </TabsTrigger>
            <TabsTrigger value="workcenters" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Рапорты по участкам
            </TabsTrigger>
            <TabsTrigger value="requisitions" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Заявки на закупку
            </TabsTrigger>
          </TabsList>

          {/* Purchase Requirements Tab */}
          <TabsContent value="purchase" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      Потребность к закупке (покупные материалы)
                    </CardTitle>
                    <CardDescription>
                      Материалы и комплектующие, которые необходимо закупить
                    </CardDescription>
                  </div>
                  {purchaseRequirements.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printMRPReport({
                        type: "purchase",
                        purchaseRequirements: purchaseRequirements
                          .filter(item => {
                            const matchesAlpha = !purchaseAlphaFilter || item.product_name.toUpperCase().startsWith(purchaseAlphaFilter);
                            const matchesSearch = !purchaseSearch || 
                              item.product_name.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
                              item.product_code.toLowerCase().includes(purchaseSearch.toLowerCase());
                            return matchesAlpha && matchesSearch;
                          })
                          .sort((a, b) => a.product_name.localeCompare(b.product_name, 'ru')),
                        planningHorizon,
                        startDate
                      })}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Печать
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Alphabetical Filter */}
                {purchaseRequirements.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <Input
                        placeholder="Поиск по названию материала..."
                        value={purchaseSearch}
                        onChange={(e) => setPurchaseSearch(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Фильтр по алфавиту:</p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant={purchaseAlphaFilter === null ? "default" : "outline"}
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => setPurchaseAlphaFilter(null)}
                        >
                          Все
                        </Button>
                        {Array.from(new Set(purchaseRequirements.map(item => item.product_name.charAt(0).toUpperCase())))
                          .sort((a, b) => a.localeCompare(b, 'ru'))
                          .map(letter => (
                            <Button
                              key={letter}
                              variant={purchaseAlphaFilter === letter ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setPurchaseAlphaFilter(letter)}
                            >
                              {letter}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
                ) : purchaseRequirements.length > 0 ? (
                  <div className="space-y-3">
                    {purchaseRequirements
                      .filter(item => {
                        const matchesAlpha = !purchaseAlphaFilter || item.product_name.toUpperCase().startsWith(purchaseAlphaFilter);
                        const matchesSearch = !purchaseSearch || 
                          item.product_name.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
                          item.product_code.toLowerCase().includes(purchaseSearch.toLowerCase());
                        return matchesAlpha && matchesSearch;
                      })
                      .sort((a, b) => a.product_name.localeCompare(b.product_name, 'ru'))
                      .map((item) => (
                      <Card key={item.product_id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="grid gap-4 md:grid-cols-7">
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2 mb-1">
                                {getProductTypeBadge(item.product_type)}
                                <span className="text-xs text-muted-foreground">{item.product_code}</span>
                              </div>
                              <p className="font-semibold text-foreground">{item.product_name}</p>
                              <div className="mt-1">{getStatusBadge(item.status)}</div>
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
                              <p className="text-xs text-muted-foreground">Зарезервировано</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.reserved.toFixed(2)} {item.unit}
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
                              <p className={`text-sm font-bold ${item.net_requirement > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                    Нет данных. Выполните расчет MRP.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Requirements Tab */}
          <TabsContent value="production" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      Потребность к производству (ПФ, СБ)
                    </CardTitle>
                    <CardDescription>
                      Полуфабрикаты и сборочные узлы, которые необходимо произвести
                    </CardDescription>
                  </div>
                  {productionRequirements.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printMRPReport({
                        type: "production",
                        productionRequirements,
                        planningHorizon,
                        startDate
                      })}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Печать
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
                ) : productionRequirements.length > 0 ? (
                  <div className="space-y-3">
                    {productionRequirements.map((item) => (
                      <Card key={item.product_id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="grid gap-4 md:grid-cols-7">
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2 mb-1">
                                {getProductTypeBadge(item.product_type)}
                                <span className="text-xs text-muted-foreground">{item.product_code}</span>
                              </div>
                              <p className="font-semibold text-foreground">{item.product_name}</p>
                              {item.work_center_name && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Участок: {item.work_center_name}
                                </p>
                              )}
                              <div className="mt-1">{getStatusBadge(item.status)}</div>
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
                              <p className="text-xs text-muted-foreground">Зарезервировано</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.reserved.toFixed(2)} {item.unit}
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
                              <p className={`text-sm font-bold ${item.net_requirement > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {item.net_requirement.toFixed(2)} {item.unit}
                              </p>
                            </div>
                          </div>
                          {item.source_orders && item.source_orders.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                Из заказов: {item.source_orders.join(', ')}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Нет данных. Выполните расчет MRP.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Center Reports Tab */}
          <TabsContent value="workcenters" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Warehouse className="h-5 w-5 text-purple-600" />
                      Рапорты по участкам (рабочим центрам)
                    </CardTitle>
                    <CardDescription>
                      Производственные задания по участкам
                    </CardDescription>
                  </div>
                  {workCenterReports.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printMRPReport({
                        type: "workcenter",
                        allWorkCenterReports: workCenterReports,
                        planningHorizon,
                        startDate
                      })}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Печать всех
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
                ) : workCenterReports.length > 0 ? (
                  <div className="space-y-8">
                    {/* Группируем по подразделениям (как в 1С ERP) */}
                    {(() => {
                      const departmentGroups = workCenterReports.reduce((acc, report) => {
                        const dept = report.department || 'Без подразделения';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(report);
                        return acc;
                      }, {} as Record<string, WorkCenterReport[]>);
                      
                      return Object.entries(departmentGroups).map(([department, reports]) => (
                        <div key={department} className="space-y-4">
                          {/* Заголовок подразделения */}
                          <div className="flex items-center gap-3 border-b-2 border-primary/30 pb-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Factory className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{department}</h3>
                              <p className="text-sm text-muted-foreground">
                                Участков: {reports.length} | Всего позиций: {reports.reduce((s, r) => s + r.total_items, 0)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Участки в подразделении */}
                          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                            {reports.map((report) => (
                              <Card key={report.work_center_id} className="border-2 border-l-4 border-l-primary">
                                <CardHeader className="bg-muted/50 py-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <Warehouse className="h-4 w-4" />
                                        {report.work_center_name}
                                      </CardTitle>
                                      <CardDescription className="text-xs">
                                        Код: {report.work_center_code} | Позиций: {report.total_items}
                                      </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="text-xl font-bold text-primary">{report.total_quantity.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">ед.</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => printMRPReport({
                                          type: "workcenter",
                                          workCenterReport: report,
                                          planningHorizon,
                                          startDate
                                        })}
                                        title="Печать рапорта"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-3 pb-3">
                                  <div className="space-y-1.5">
                                    {report.items.map((item, idx) => (
                                      <div 
                                        key={`${item.product_id}-${idx}`}
                                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                                      >
                                        <div className="flex items-center gap-2">
                                          {getProductTypeBadge(item.product_type)}
                                          <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold">{item.quantity.toFixed(2)}</p>
                                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Нет данных. Выполните расчет MRP.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Requisitions Tab */}
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
        </Tabs>
      </main>
    </div>
  );
};

export default MRPPlanning;
