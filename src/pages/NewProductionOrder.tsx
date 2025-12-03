import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useActiveSpecifications } from "@/hooks/useSpecifications";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";
import { useCreateProductionOrder } from "@/hooks/useProductionOrders";
import { useActiveRoutingSheets } from "@/hooks/useRoutingSheets";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

const NewProductionOrderContent = () => {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: specifications, isLoading: specificationsLoading } = useActiveSpecifications();
  const { data: workCenters, isLoading: workCentersLoading } = useActiveWorkCenters();
  const { data: routingSheets } = useActiveRoutingSheets();
  const createOrder = useCreateProductionOrder();

  const [formData, setFormData] = useState({
    product: "",
    specification: "",
    routing_sheet: "",
    quantity: "",
    priority: "normal",
    work_center: "",
    responsible: "",
    planned_start: "",
    planned_end: "",
  });

  // Prepare options for searchable selects
  const productOptions = useMemo(() => {
    return (products || []).map((product) => ({
      value: product.id,
      label: `${product.code} - ${product.name}`,
      searchText: `${product.code} ${product.name}`,
    }));
  }, [products]);

  const specificationOptions = useMemo(() => {
    return (specifications || []).map((spec) => ({
      value: spec.id,
      label: `${spec.code} ${spec.version}`,
      searchText: `${spec.code} ${spec.version}`,
    }));
  }, [specifications]);

  const routingSheetOptions = useMemo(() => {
    return (routingSheets || []).map((sheet) => ({
      value: sheet.id,
      label: sheet.name,
      searchText: sheet.name,
    }));
  }, [routingSheets]);

  const workCenterOptions = useMemo(() => {
    return (workCenters || []).map((center) => ({
      value: center.id,
      label: center.name,
      searchText: `${center.code} ${center.name}`,
    }));
  }, [workCenters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product || !formData.quantity || !formData.planned_start || !formData.planned_end) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    const orderNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    try {
      // Создаем заказ
      const order = await createOrder.mutateAsync({
        order_number: orderNumber,
        product_id: formData.product,
        specification_id: formData.specification || null,
        work_center_id: formData.work_center || null,
        routing_sheet_id: formData.routing_sheet || null,
        quantity: Number(formData.quantity),
        completed_quantity: 0,
        status: "planned",
        priority: formData.priority,
        planned_start_date: formData.planned_start,
        planned_end_date: formData.planned_end,
        actual_start_date: null,
        actual_end_date: null,
        responsible_person: formData.responsible || null,
      });

      // Создаем операции если выбран техмаршрут
      if (formData.routing_sheet && order) {
        const { data: operations } = await supabase
          .from("routing_operations")
          .select("*")
          .eq("routing_sheet_id", formData.routing_sheet)
          .order("sequence");

        if (operations && operations.length > 0) {
          const orderOperations = operations.map(op => ({
            production_order_id: order.id,
            routing_operation_id: op.id,
            sequence: op.sequence,
            status: "pending",
            planned_start_date: formData.planned_start,
            planned_end_date: formData.planned_end,
          }));

          await supabase
            .from("production_order_operations")
            .insert(orderOperations);
        }
      }

      navigate("/production-orders");
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (productsLoading || specificationsLoading || workCentersLoading) {
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
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/production-orders")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заказам
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Новый производственный заказ</h1>
          <p className="text-muted-foreground">Создание нового заказа на производство</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Информация о продукте</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Продукт *</Label>
                    <SearchableSelect
                      options={productOptions}
                      value={formData.product}
                      onValueChange={(value) => handleChange("product", value)}
                      placeholder="Выберите продукт"
                      searchPlaceholder="Поиск по коду или названию..."
                      emptyText="Продукт не найден"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specification">Спецификация</Label>
                    <SearchableSelect
                      options={specificationOptions}
                      value={formData.specification}
                      onValueChange={(value) => handleChange("specification", value)}
                      placeholder="Выберите спецификацию (опционально)"
                      searchPlaceholder="Поиск по коду..."
                      emptyText="Спецификация не найдена"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routing_sheet">Техмаршрут</Label>
                    <SearchableSelect
                      options={routingSheetOptions}
                      value={formData.routing_sheet}
                      onValueChange={(value) => handleChange("routing_sheet", value)}
                      placeholder="Выберите техмаршрут (опционально)"
                      searchPlaceholder="Поиск по названию..."
                      emptyText="Техмаршрут не найден"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Количество *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Введите количество"
                      value={formData.quantity}
                      onChange={(e) => handleChange("quantity", e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Production Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Производственные детали</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="work_center">Рабочий центр</Label>
                      <SearchableSelect
                        options={workCenterOptions}
                        value={formData.work_center}
                        onValueChange={(value) => handleChange("work_center", value)}
                        placeholder="Выберите рабочий центр (опционально)"
                        searchPlaceholder="Поиск по коду или названию..."
                        emptyText="Рабочий центр не найден"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsible">Ответственный</Label>
                      <Input
                        id="responsible"
                        type="text"
                        placeholder="ФИО ответственного"
                        value={formData.responsible}
                        onChange={(e) => handleChange("responsible", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="planned_start">Плановое начало *</Label>
                      <Input
                        id="planned_start"
                        type="date"
                        value={formData.planned_start}
                        onChange={(e) => handleChange("planned_start", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planned_end">Плановое окончание *</Label>
                      <Input
                        id="planned_end"
                        type="date"
                        value={formData.planned_end}
                        onChange={(e) => handleChange("planned_end", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Priority & Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Приоритет и статус</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Приоритет</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleChange("priority", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="normal">Обычный</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="urgent">Срочный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm text-muted-foreground">
                      После создания заказ получит статус "Запланировано"
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary-glow"
                    size="lg"
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Создать заказ
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/production-orders")}
                  >
                    Отмена
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

const NewProductionOrder = () => {
  return (
    <ProtectedRoute>
      <NewProductionOrderContent />
    </ProtectedRoute>
  );
};

export default NewProductionOrder;
