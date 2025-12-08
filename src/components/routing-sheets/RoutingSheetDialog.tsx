import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Trash2, GripVertical, Wand2, ArrowUp, ArrowDown, Factory, Clock } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";
import { toast } from "sonner";

interface Operation {
  id?: string;
  sequence: number;
  name: string;
  work_center_id: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
}

interface RoutingSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routingSheet?: any;
  onSave: (data: {
    code: string;
    name: string;
    product_id: string;
    is_active: boolean;
    operations: Operation[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function RoutingSheetDialog({
  open,
  onOpenChange,
  routingSheet,
  onSave,
  isLoading,
}: RoutingSheetDialogProps) {
  const { data: products } = useProducts();
  const { data: workCenters } = useActiveWorkCenters();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);

  const isEditing = !!routingSheet;

  useEffect(() => {
    if (routingSheet) {
      setCode(routingSheet.code || "");
      setName(routingSheet.name || "");
      setProductId(routingSheet.product_id || "");
      setIsActive(routingSheet.is_active ?? true);
      
      const existingOps = routingSheet.routing_operations?.map((op: any) => ({
        id: op.id,
        sequence: op.sequence,
        name: op.name,
        work_center_id: op.work_center_id || op.work_centers?.id,
        setup_time_minutes: op.setup_time_minutes || 0,
        cycle_time_minutes: op.cycle_time_minutes || 0,
      })) || [];
      
      setOperations(existingOps.sort((a: Operation, b: Operation) => a.sequence - b.sequence));
    } else {
      setCode("AUTO");
      setName("");
      setProductId("");
      setIsActive(true);
      setOperations([]);
    }
  }, [routingSheet, open]);

  // Filter products that can have routing sheets (finished, assembly, semi-finished)
  const eligibleProducts = products?.filter(
    (p) => p.product_type !== "material" && p.is_active
  ) || [];

  const productOptions = eligibleProducts.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name}`,
    searchText: `${p.code} ${p.name}`,
  }));

  const workCenterOptions = workCenters?.map((wc) => ({
    value: wc.id,
    label: `${wc.code} — ${wc.name}`,
    searchText: `${wc.code} ${wc.name}`,
  })) || [];

  const addOperation = () => {
    const newSequence = operations.length > 0 
      ? Math.max(...operations.map(o => o.sequence)) + 1 
      : 1;
    
    setOperations([
      ...operations,
      {
        sequence: newSequence,
        name: "",
        work_center_id: "",
        setup_time_minutes: 0,
        cycle_time_minutes: 0,
      },
    ]);
  };

  const removeOperation = (index: number) => {
    const newOps = operations.filter((_, i) => i !== index);
    // Re-sequence
    setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
  };

  const updateOperation = (index: number, updates: Partial<Operation>) => {
    setOperations(
      operations.map((op, i) => (i === index ? { ...op, ...updates } : op))
    );
  };

  const moveOperation = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === operations.length - 1)
    ) {
      return;
    }

    const newOps = [...operations];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap
    [newOps[index], newOps[targetIndex]] = [newOps[targetIndex], newOps[index]];
    
    // Re-sequence
    setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
  };

  const handleSave = async () => {
    if (!productId) {
      toast.error("Выберите продукт");
      return;
    }
    if (!name.trim()) {
      toast.error("Введите название техмаршрута");
      return;
    }
    if (operations.length === 0) {
      toast.error("Добавьте хотя бы одну операцию");
      return;
    }
    
    const invalidOps = operations.filter(
      (op) => !op.name.trim() || !op.work_center_id
    );
    if (invalidOps.length > 0) {
      toast.error("Заполните все поля операций (название и участок)");
      return;
    }

    await onSave({
      code: code === "AUTO" ? "" : code,
      name: name.trim(),
      product_id: productId,
      is_active: isActive,
      operations,
    });
  };

  const totalSetupTime = operations.reduce((sum, op) => sum + (op.setup_time_minutes || 0), 0);
  const totalCycleTime = operations.reduce((sum, op) => sum + (op.cycle_time_minutes || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактирование техмаршрута" : "Создание техмаршрута"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Код</Label>
              <div className="relative">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Авто"
                  disabled={code === "AUTO"}
                  className="pr-10"
                />
                {code === "AUTO" && (
                  <Wand2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Код генерируется автоматически (RS-XXX)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Маршрут сборки изделия"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Продукт *</Label>
              <SearchableSelect
                options={productOptions}
                value={productId}
                onValueChange={setProductId}
                placeholder="Выберите продукт"
                searchPlaceholder="Поиск по коду или названию..."
                emptyText="Продукт не найден"
              />
              <p className="text-xs text-muted-foreground">
                Только ГП, СБ и ПФ (не материалы)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-sm">
                  {isActive ? "Активен" : "Неактивен"}
                </span>
              </div>
            </div>
          </div>

          {/* Operations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Операции</h3>
                <p className="text-sm text-muted-foreground">
                  Последовательность производственных операций
                </p>
              </div>
              <Button onClick={addOperation} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Добавить операцию
              </Button>
            </div>

            {operations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">
                    Добавьте операции для создания техмаршрута
                  </p>
                  <Button onClick={addOperation} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить первую операцию
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {operations.map((op, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-2">
                          <Badge variant="secondary" className="font-mono text-lg px-3">
                            {op.sequence}
                          </Badge>
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveOperation(index, "up")}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveOperation(index, "down")}
                              disabled={index === operations.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex-1 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Название операции *</Label>
                            <Input
                              value={op.name}
                              onChange={(e) =>
                                updateOperation(index, { name: e.target.value })
                              }
                              placeholder="Например: Токарная обработка"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Производственный участок *</Label>
                            <SearchableSelect
                              options={workCenterOptions}
                              value={op.work_center_id}
                              onValueChange={(v) =>
                                updateOperation(index, { work_center_id: v })
                              }
                              placeholder="Выберите участок"
                              searchPlaceholder="Поиск..."
                              emptyText="Участок не найден"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Время наладки (ПЗ), мин</Label>
                            <Input
                              type="number"
                              min="0"
                              value={op.setup_time_minutes}
                              onChange={(e) =>
                                updateOperation(index, {
                                  setup_time_minutes: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Штучное время, мин</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={op.cycle_time_minutes}
                              onChange={(e) =>
                                updateOperation(index, {
                                  cycle_time_minutes: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeOperation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Итого:</span>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Наладка: </span>
                          <span className="font-medium">{totalSetupTime} мин</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Штучное: </span>
                          <span className="font-medium">{totalCycleTime} мин</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Всего: </span>
                          <span className="font-bold">{totalSetupTime + totalCycleTime} мин</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}