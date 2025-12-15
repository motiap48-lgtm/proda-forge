import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProductionOrder, useUpdateProductionOrder } from "@/hooks/useProductionOrders";
import { useProducts } from "@/hooks/useProducts";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useWorkCenters } from "@/hooks/useWorkCenters";
import { useRoutingSheets } from "@/hooks/useRoutingSheets";
import { useAddOrderHistory } from "@/hooks/useProductionOrderDetails";
import { useChildProductionOrders, useUpdateChildOrdersQuantity } from "@/hooks/useChildProductionOrders";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const editOrderSchema = z.object({
  product_id: z.string().min(1, "Выберите продукт"),
  quantity: z.number().min(1, "Количество должно быть больше 0"),
  planned_start_date: z.string().min(1, "Укажите дату начала"),
  planned_end_date: z.string().min(1, "Укажите дату окончания"),
  status: z.string().min(1, "Выберите статус"),
  priority: z.string().min(1, "Выберите приоритет"),
});

const EditProductionOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: order, isLoading: orderLoading } = useProductionOrder(id || "");
  const { data: products } = useProducts();
  const { data: specifications } = useSpecifications();
  const { data: workCenters } = useWorkCenters();
  const { data: routingSheets } = useRoutingSheets();
  const updateOrder = useUpdateProductionOrder();
  const addHistory = useAddOrderHistory();
  const updateChildOrdersQuantity = useUpdateChildOrdersQuantity();
  
  // Fetch child orders for this order
  const { data: childOrders } = useChildProductionOrders(order?.id || "");

  const [formData, setFormData] = useState({
    product_id: "",
    specification_id: "",
    routing_sheet_id: "",
    work_center_id: "",
    quantity: 0,
    planned_start_date: "",
    planned_end_date: "",
    status: "planned",
    priority: "normal",
    responsible_person: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoLoaded, setAutoLoaded] = useState({ specification: false, routing: false });

  useEffect(() => {
    if (order && specifications && routingSheets) {
      let specAutoLoaded = false;
      let routingAutoLoaded = false;

      // Если в заказе нет спецификации, попробуем найти для продукта
      let specId = order.specification_id || "";
      if (!specId && order.product_id) {
        const matchingSpec = specifications.find(
          (spec) => spec.product_id === order.product_id && spec.is_active
        );
        if (matchingSpec) {
          specId = matchingSpec.id;
          specAutoLoaded = true;
        }
      }

      // Если в заказе нет техмаршрута, попробуем найти для продукта
      let routingId = order.routing_sheet_id || "";
      if (!routingId && order.product_id) {
        const matchingRouting = routingSheets.find(
          (sheet) => sheet.product_id === order.product_id && sheet.is_active
        );
        if (matchingRouting) {
          routingId = matchingRouting.id;
          routingAutoLoaded = true;
        }
      }

      setAutoLoaded({ specification: specAutoLoaded, routing: routingAutoLoaded });

      setFormData({
        product_id: order.product_id || "",
        specification_id: specId,
        routing_sheet_id: routingId,
        work_center_id: order.work_center_id || "",
        quantity: Number(order.quantity),
        planned_start_date: order.planned_start_date,
        planned_end_date: order.planned_end_date,
        status: order.status,
        priority: order.priority,
        responsible_person: order.responsible_person || "",
      });
    }
  }, [order, specifications, routingSheets]);

  // Автоматическая привязка спецификации и техмаршрута при изменении продукта
  const handleProductChange = (productId: string) => {
    // Найти первую активную спецификацию для продукта
    const matchingSpec = specifications?.find(
      (spec) => spec.product_id === productId && spec.is_active
    );
    
    // Найти первый активный техмаршрут для продукта
    const matchingRouting = routingSheets?.find(
      (sheet) => sheet.product_id === productId && sheet.is_active
    );

    setFormData((prev) => ({
      ...prev,
      product_id: productId,
      specification_id: matchingSpec?.id || "",
      routing_sheet_id: matchingRouting?.id || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      editOrderSchema.parse({
        product_id: formData.product_id,
        quantity: formData.quantity,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        status: formData.status,
        priority: formData.priority,
      });

      const oldQuantity = Number(order?.quantity || 0);
      const newQuantity = formData.quantity;
      const quantityChanged = newQuantity !== oldQuantity;

      // Автоматически переводим в работу если увеличили количество у завершенного заказа
      // или если заказ завершен, но выпущено меньше чем требуется
      let newStatus = formData.status;
      const incompleteBecauseOfNewQuantity = newQuantity > Number(order?.completed_quantity || 0);
      
      if (order && order.status === 'completed' && incompleteBecauseOfNewQuantity) {
        newStatus = 'in_progress';
        toast.info("Заказ переведён обратно в работу из-за изменения количества");
      }

      const updateData: any = {
        id: order!.id,
        product_id: formData.product_id,
        quantity: newQuantity,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        status: newStatus,
        priority: formData.priority,
        specification_id: formData.specification_id || null,
        routing_sheet_id: formData.routing_sheet_id || null,
        work_center_id: formData.work_center_id || null,
        responsible_person: formData.responsible_person || null,
      };

      // Сбрасываем дату завершения если заказ возвращается в работу
      if (newStatus === 'in_progress' && order?.status === 'completed') {
        updateData.actual_end_date = null;
        
        // Обновляем статус операций, которые "завершены" но выполнено меньше нового плана
        const { data: operations } = await supabase
          .from("production_order_operations")
          .select("id, completed_quantity, status")
          .eq("production_order_id", order.id);
          
        if (operations) {
          for (const op of operations) {
            if (op.status === 'completed' && Number(op.completed_quantity) < newQuantity) {
              await supabase
                .from("production_order_operations")
                .update({ status: 'in_progress' })
                .eq("id", op.id);
            }
          }
        }
      }

      await updateOrder.mutateAsync(updateData);

      // Записываем в историю изменение количества
      if (quantityChanged && user && order) {
        const diff = newQuantity - oldQuantity;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        addHistory.mutate({
          production_order_id: order.id,
          user_id: user.id,
          change_type: 'quantity_changed',
          old_value: oldQuantity.toString(),
          new_value: newQuantity.toString(),
          description: `Изменение плана: ${oldQuantity} → ${newQuantity} (${diffStr})`,
        });

        // Автоматически обновляем дочерние заказы при увеличении количества
        if (newQuantity > oldQuantity && childOrders && childOrders.length > 0 && formData.specification_id) {
          await updateChildOrdersQuantity.mutateAsync({
            parentOrderId: order.id,
            specificationId: formData.specification_id,
            oldQuantity,
            newQuantity,
          });
        }
      }

      // Инвалидируем кэш для обновления данных на странице деталей
      await queryClient.invalidateQueries({ queryKey: ["production-order", order?.order_number] });
      await queryClient.invalidateQueries({ queryKey: ["production-order-operations", order?.id] });
      await queryClient.invalidateQueries({ queryKey: ["production-order-history", order?.id] });
      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["child-production-orders", order?.id] });

      toast.success("Заказ успешно обновлен");
      navigate(`/production-orders/${order?.order_number}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Ошибка при обновлении заказа");
      }
    }
  };

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/production-orders/${order.order_number}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заказу
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Редактирование заказа {order.order_number}
          </h1>
          <p className="text-muted-foreground">Изменение параметров производственного заказа</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product_id">Продукт *</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={handleProductChange}
                    >
                      <SelectTrigger id="product_id" className={errors.product_id ? "border-destructive" : ""}>
                        <SelectValue placeholder="Выберите продукт" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.code} - {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.product_id && (
                      <p className="text-sm text-destructive">{errors.product_id}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Количество *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: Number(e.target.value) })
                      }
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="specification_id">Спецификация</Label>
                      {autoLoaded.specification && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Sparkles className="h-3 w-3" />
                                авто
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Автоматически подгружено для продукта</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Select
                      value={formData.specification_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, specification_id: value });
                        setAutoLoaded((prev) => ({ ...prev, specification: false }));
                      }}
                    >
                      <SelectTrigger id="specification_id">
                        <SelectValue placeholder="Выберите спецификацию" />
                      </SelectTrigger>
                      <SelectContent>
                        {specifications?.map((spec) => (
                          <SelectItem key={spec.id} value={spec.id}>
                            {spec.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="routing_sheet_id">Техмаршрут</Label>
                      {autoLoaded.routing && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Sparkles className="h-3 w-3" />
                                авто
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Автоматически подгружено для продукта</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Select
                      value={formData.routing_sheet_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, routing_sheet_id: value });
                        setAutoLoaded((prev) => ({ ...prev, routing: false }));
                      }}
                    >
                      <SelectTrigger id="routing_sheet_id">
                        <SelectValue placeholder="Выберите техмаршрут" />
                      </SelectTrigger>
                      <SelectContent>
                        {routingSheets?.map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {sheet.code} - {sheet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work_center_id">Производственный участок</Label>
                    <Select
                      value={formData.work_center_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, work_center_id: value })
                      }
                    >
                      <SelectTrigger id="work_center_id">
                        <SelectValue placeholder="Выберите участок" />
                      </SelectTrigger>
                      <SelectContent>
                        {workCenters?.map((wc) => (
                          <SelectItem key={wc.id} value={wc.id}>
                            {wc.code} - {wc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsible_person">Ответственный</Label>
                    <Input
                      id="responsible_person"
                      value={formData.responsible_person}
                      onChange={(e) =>
                        setFormData({ ...formData, responsible_person: e.target.value })
                      }
                      placeholder="Иванов И.И."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Планирование</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="planned_start_date">Плановое начало *</Label>
                    <Input
                      id="planned_start_date"
                      type="date"
                      value={formData.planned_start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, planned_start_date: e.target.value })
                      }
                      className={errors.planned_start_date ? "border-destructive" : ""}
                    />
                    {errors.planned_start_date && (
                      <p className="text-sm text-destructive">{errors.planned_start_date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planned_end_date">Плановое окончание *</Label>
                    <Input
                      id="planned_end_date"
                      type="date"
                      value={formData.planned_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, planned_end_date: e.target.value })
                      }
                      className={errors.planned_end_date ? "border-destructive" : ""}
                    />
                    {errors.planned_end_date && (
                      <p className="text-sm text-destructive">{errors.planned_end_date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Статус *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Запланировано</SelectItem>
                        <SelectItem value="released">Запущен</SelectItem>
                        <SelectItem value="in_progress">В производстве</SelectItem>
                        <SelectItem value="on_hold">Приостановлен</SelectItem>
                        <SelectItem value="completed">Завершено</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Приоритет *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger id="priority">
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
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/production-orders/${order.order_number}`)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={updateOrder.isPending}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                {updateOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Сохранить изменения
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EditProductionOrder;
