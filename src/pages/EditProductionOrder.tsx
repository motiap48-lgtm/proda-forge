import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useProductionOrder, useUpdateProductionOrder } from "@/hooks/useProductionOrders";
import { useProducts } from "@/hooks/useProducts";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useWorkCenters } from "@/hooks/useWorkCenters";
import { useRoutingSheets } from "@/hooks/useRoutingSheets";
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
  const { data: order, isLoading: orderLoading } = useProductionOrder(id || "");
  const { data: products } = useProducts();
  const { data: specifications } = useSpecifications();
  const { data: workCenters } = useWorkCenters();
  const { data: routingSheets } = useRoutingSheets();
  const updateOrder = useUpdateProductionOrder();

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

  useEffect(() => {
    if (order) {
      setFormData({
        product_id: order.product_id || "",
        specification_id: order.specification_id || "",
        routing_sheet_id: order.routing_sheet_id || "",
        work_center_id: order.work_center_id || "",
        quantity: Number(order.quantity),
        planned_start_date: order.planned_start_date,
        planned_end_date: order.planned_end_date,
        status: order.status,
        priority: order.priority,
        responsible_person: order.responsible_person || "",
      });
    }
  }, [order]);

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

      await updateOrder.mutateAsync({
        id: order!.id,
        product_id: formData.product_id,
        quantity: formData.quantity,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        status: formData.status,
        priority: formData.priority,
        specification_id: formData.specification_id || null,
        routing_sheet_id: formData.routing_sheet_id || null,
        work_center_id: formData.work_center_id || null,
        responsible_person: formData.responsible_person || null,
      });

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
                      onValueChange={(value) =>
                        setFormData({ ...formData, product_id: value })
                      }
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
                    <Label htmlFor="specification_id">Спецификация</Label>
                    <Select
                      value={formData.specification_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, specification_id: value })
                      }
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
                    <Label htmlFor="routing_sheet_id">Техмаршрут</Label>
                    <Select
                      value={formData.routing_sheet_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, routing_sheet_id: value })
                      }
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
                    <Label htmlFor="work_center_id">Рабочий центр</Label>
                    <Select
                      value={formData.work_center_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, work_center_id: value })
                      }
                    >
                      <SelectTrigger id="work_center_id">
                        <SelectValue placeholder="Выберите рабочий центр" />
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
