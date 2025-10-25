import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const NewProductionOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    product: "",
    specification: "",
    quantity: "",
    priority: "normal",
    work_center: "",
    responsible: "",
    planned_start: "",
    planned_end: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Производственный заказ создан успешно");
    navigate("/production-orders");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
                    <Select
                      value={formData.product}
                      onValueChange={(value) => handleChange("product", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите продукт" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detail-a-125">Деталь А-125</SelectItem>
                        <SelectItem value="node-b-340">Узел Б-340</SelectItem>
                        <SelectItem value="component-v-89">Компонент В-89</SelectItem>
                        <SelectItem value="product-g-456">Изделие Г-456</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specification">Спецификация *</Label>
                    <Select
                      value={formData.specification}
                      onValueChange={(value) => handleChange("specification", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите спецификацию" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spec-1">SPEC-А-125-v2</SelectItem>
                        <SelectItem value="spec-2">SPEC-Б-340-v1</SelectItem>
                        <SelectItem value="spec-3">SPEC-В-89-v3</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Label htmlFor="work_center">Рабочий центр *</Label>
                      <Select
                        value={formData.work_center}
                        onValueChange={(value) => handleChange("work_center", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите цех" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shop-1">Цех №1</SelectItem>
                          <SelectItem value="shop-2">Цех №2</SelectItem>
                          <SelectItem value="shop-3">Цех №3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsible">Ответственный *</Label>
                      <Select
                        value={formData.responsible}
                        onValueChange={(value) => handleChange("responsible", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ответственного" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ivanov">Иванов И.И.</SelectItem>
                          <SelectItem value="petrov">Петров П.П.</SelectItem>
                          <SelectItem value="sidorov">Сидоров С.С.</SelectItem>
                        </SelectContent>
                      </Select>
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

                  <div className="space-y-2">
                    <Label htmlFor="notes">Примечания</Label>
                    <Textarea
                      id="notes"
                      placeholder="Дополнительная информация о заказе"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      rows={4}
                    />
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
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Создать заказ
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

export default NewProductionOrder;
