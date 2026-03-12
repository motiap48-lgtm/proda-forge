import { useState, useEffect, useRef } from "react";
import { generateUUID } from "@/lib/uuid";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertCircle, Info } from "lucide-react";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useMaterialCategories } from "@/hooks/useMaterialCategories";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  code: string;
  name: string;
  product_type: string;
  unit: string;
  description: string | null;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onProductCreated?: (productId: string) => void;
}

interface BatchProduct {
  id: string;
  code: string;
  name: string;
  product_type: string;
  unit: string;
  isDuplicate?: boolean;
}

export const ProductDialog = ({ open, onOpenChange, product, onProductCreated }: ProductDialogProps) => {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    product_type: "finished",
    unit: "шт",
    description: "",
    category: "",
  });
  const [batchProducts, setBatchProducts] = useState<BatchProduct[]>([
    { id: generateUUID(), code: "AUTO", name: "", product_type: "finished", unit: "шт" }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [nameDuplicate, setNameDuplicate] = useState(false);
  const [originalProductType, setOriginalProductType] = useState<string>("");
  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  const [createSpecAfter, setCreateSpecAfter] = useState(false);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categories } = useMaterialCategories();
  const batchRowsEndRef = useRef<HTMLDivElement>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (open && product) {
      setMode("single");
      setFormData({
        code: product.code,
        name: product.name,
        product_type: product.product_type,
        unit: product.unit,
        description: product.description || "",
        category: (product as any).category || "",
      });
      setOriginalProductType(product.product_type);
      setShowTypeChangeWarning(false);
    } else if (open && !product) {
      setMode("single");
      setFormData({
        code: "AUTO",
        name: "",
        product_type: "finished",
        unit: "шт",
        description: "",
        category: "",
      });
      setBatchProducts([
        { id: generateUUID(), code: "AUTO", name: "", product_type: "finished", unit: "шт" }
      ]);
      setOriginalProductType("");
      setShowTypeChangeWarning(false);
    } else if (!open) {
      setMode("single");
      setFormData({
        code: "",
        name: "",
        product_type: "finished",
        unit: "шт",
        description: "",
        category: "",
      });
      setBatchProducts([
        { id: crypto.randomUUID(), code: "AUTO", name: "", product_type: "finished", unit: "шт" }
      ]);
      setOriginalProductType("");
      setShowTypeChangeWarning(false);
    }
  }, [open, product]);

  // Проверка дубликата названия для одиночного режима
  useEffect(() => {
    if (!open || mode !== "single" || !formData.name.trim()) {
      setNameDuplicate(false);
      return;
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const query = supabase
          .from("products")
          .select("name, id")
          .eq("name", formData.name)
          .eq("is_active", true)
          .maybeSingle();

        const { data: existing } = await query;
        
        // Если редактируем, исключаем текущий продукт
        if (existing && (!product || existing.id !== product.id)) {
          setNameDuplicate(true);
        } else {
          setNameDuplicate(false);
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
      }
    }, 500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [formData.name, open, mode, product]);

  // Автоматическая генерация нового кода при изменении типа продукта
  useEffect(() => {
    if (!product || !originalProductType || formData.product_type === originalProductType) {
      setShowTypeChangeWarning(false);
      return;
    }

    // Тип продукта изменился - генерируем новый код
    const generateNewCode = async () => {
      try {
        console.log('Generating new code for type:', formData.product_type);
        const { data, error } = await supabase
          .rpc('generate_product_code', { p_product_type: formData.product_type });
        
        console.log('Generated code result:', { data, error });
        
        if (error) {
          console.error('Error from RPC:', error);
          toast.error('Ошибка генерации кода: ' + error.message);
          return;
        }
        
        if (data) {
          console.log('Setting new code:', data);
          setFormData(prev => {
            console.log('Previous code:', prev.code, 'New code:', data);
            return { ...prev, code: data };
          });
          setShowTypeChangeWarning(true);
          toast.success(`Код обновлен: ${product.code} → ${data}`);
        }
      } catch (error) {
        console.error("Error generating new code:", error);
        toast.error('Ошибка генерации кода');
      }
    };

    generateNewCode();
  }, [formData.product_type, originalProductType, product]);

  // Проверка дубликатов для массового режима
  useEffect(() => {
    if (!open || mode !== "batch") return;

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      const duplicateChecks = await Promise.all(
        batchProducts.map(async (p) => {
          if (!p.name.trim()) return { id: p.id, isDuplicate: false };

          try {
            const { data: existing } = await supabase
              .from("products")
              .select("name")
              .eq("name", p.name)
              .eq("is_active", true)
              .maybeSingle();

            return { id: p.id, isDuplicate: !!existing };
          } catch (error) {
            return { id: p.id, isDuplicate: false };
          }
        })
      );

      // Обновляем только флаг isDuplicate, сохраняя все остальные поля
      setBatchProducts(prev => prev.map(p => {
        const check = duplicateChecks.find(c => c.id === p.id);
        return check ? { ...p, isDuplicate: check.isDuplicate } : p;
      }));
    }, 500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [batchProducts.map(p => p.name).join(","), open, mode]);

  // Дополнительный эффект не нужен — коды генерируются в базе данных

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Для редактирования требуем код и название
    // Для создания код генерируется автоматически, требуем только название
    if (product && !formData.code) {
      toast.error("Укажите код продукта");
      return;
    }
    
    if (!formData.name) {
      toast.error("Укажите название продукта");
      return;
    }

    if (product) {
      await updateMutation.mutateAsync({
        id: product.id,
        data: formData,
      });
      onOpenChange(false);
    } else {
      const result = await createMutation.mutateAsync(formData);
      onOpenChange(false);
      
      // Если нужно создать спецификацию после создания продукта
      if (createSpecAfter && onProductCreated && result?.id) {
        setTimeout(() => {
          onProductCreated(result.id);
        }, 100);
      }
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validProducts = batchProducts.filter(p => p.name.trim());
    
    if (validProducts.length === 0) {
      toast.error("Заполните хотя бы один продукт");
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const p of validProducts) {
      try {
        await createMutation.mutateAsync({
          code: p.code,
          name: p.name,
          product_type: p.product_type,
          unit: p.unit,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Failed to create product:", p.name, error);
      }
    }

    setIsCreating(false);
    
    if (successCount > 0) {
      toast.success(`Создано продуктов: ${successCount}${errorCount > 0 ? `, ошибок: ${errorCount}` : ''}`);
    }
    if (errorCount > 0 && successCount === 0) {
      toast.error("Не удалось создать продукты");
    }
    
    // Закрываем диалог в любом случае
    onOpenChange(false);
  };

  const addBatchRow = () => {
    const lastProductType = batchProducts[batchProducts.length - 1]?.product_type || "finished";
    setBatchProducts([...batchProducts, { 
      id: crypto.randomUUID(), 
      code: "AUTO", 
      name: "", 
      product_type: lastProductType, 
      unit: "шт" 
    }]);
    
    // Прокрутка к последней строке после добавления
    setTimeout(() => {
      batchRowsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  const removeBatchRow = (id: string) => {
    if (batchProducts.length > 1) {
      setBatchProducts(batchProducts.filter(p => p.id !== id));
    }
  };

  const updateBatchProduct = (id: string, field: keyof BatchProduct, value: string) => {
    setBatchProducts(batchProducts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Редактировать продукт" : "Добавить продукт"}</DialogTitle>
          <DialogDescription>
            {product ? "Изменение информации о продукте" : "Создание нового продукта в системе"}
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Код * 
                  {showTypeChangeWarning && (
                    <span className="text-xs text-amber-600 ml-2">(обновлен автоматически)</span>
                  )}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="PROD-001"
                  required
                  disabled={showTypeChangeWarning}
                  className={showTypeChangeWarning ? "bg-muted" : ""}
                />
                {showTypeChangeWarning && (
                  <p className="text-xs text-muted-foreground">
                    Код заблокирован, так как тип продукта был изменен
                  </p>
                )}
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Название продукта"
                      required
                      className={nameDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {nameDuplicate && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span>Продукт с таким названием уже существует</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_type">Тип продукта *</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, product_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Материал</SelectItem>
                        <SelectItem value="semi-finished">Полуфабрикат</SelectItem>
                        <SelectItem value="assembly">Сборочный узел</SelectItem>
                        <SelectItem value="finished">Готовая продукция</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Единица измерения *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="шт">шт</SelectItem>
                    <SelectItem value="кг">кг</SelectItem>
                    <SelectItem value="л">л</SelectItem>
                    <SelectItem value="м">м</SelectItem>
                    <SelectItem value="м²">м²</SelectItem>
                    <SelectItem value="м³">м³</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.product_type === "material" && (
                <div className="space-y-2">
                  <Label htmlFor="category">Категория</Label>
                  <Select
                    value={formData.category || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без категории</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Категория помогает быстро находить материалы в спецификациях
                  </p>
                </div>
              )}
            </div>

            {showTypeChangeWarning && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-foreground">
                  Тип продукта изменен. Код автоматически обновлен с <span className="font-mono font-semibold">{product.code}</span> на <span className="font-mono font-semibold">{formData.code}</span> для соответствия новому типу.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание продукта"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "batch")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Одиночный</TabsTrigger>
              <TabsTrigger value="batch">Массовый</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code">Код *</Label>
                    <Input
                      id="code"
                      value={formData.code === "AUTO" ? "" : formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value || "AUTO" })}
                      placeholder="Генерируется автоматически"
                      disabled={!product}
                    />
                    {!product && (
                      <p className="text-xs text-muted-foreground">
                        Код будет сгенерирован автоматически при сохранении
                      </p>
                    )}
                  </div>

                   <div className="space-y-2">
                     <Label htmlFor="name">Название *</Label>
                     <Input
                       id="name"
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       placeholder="Название продукта"
                       required
                       className={nameDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}
                     />
                     {nameDuplicate && (
                       <div className="flex items-center gap-1 text-xs text-destructive">
                         <AlertCircle className="h-3 w-3" />
                         <span>Продукт с таким названием уже существует</span>
                       </div>
                     )}
                   </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_type">Тип продукта *</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Материал</SelectItem>
                        <SelectItem value="semi-finished">Полуфабрикат</SelectItem>
                        <SelectItem value="assembly">Сборочный узел</SelectItem>
                        <SelectItem value="finished">Готовая продукция</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Единица измерения *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="шт">шт</SelectItem>
                        <SelectItem value="кг">кг</SelectItem>
                        <SelectItem value="л">л</SelectItem>
                        <SelectItem value="м">м</SelectItem>
                        <SelectItem value="м²">м²</SelectItem>
                        <SelectItem value="м³">м³</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.product_type === "material" && (
                    <div className="space-y-2">
                      <Label htmlFor="category">Категория</Label>
                      <Select
                        value={formData.category || "none"}
                        onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Без категории" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Без категории</SelectItem>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Категория помогает быстро находить материалы в спецификациях
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Описание продукта"
                    rows={3}
                  />
                </div>

                {(formData.product_type === "finished" || 
                  formData.product_type === "semi-finished" || 
                  formData.product_type === "assembly") && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
                    <Checkbox 
                      id="createSpec" 
                      checked={createSpecAfter}
                      onCheckedChange={(checked) => setCreateSpecAfter(checked as boolean)}
                    />
                    <Label 
                      htmlFor="createSpec" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Создать спецификацию после создания продукта
                    </Label>
                  </div>
                )}

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="batch" className="mt-4">
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Список продуктов</Label>
                    <Button type="button" size="sm" onClick={addBatchRow}>
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить строку
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {batchProducts.map((product, index) => (
                      <div key={product.id} className="grid gap-2 grid-cols-[1fr_2fr_1.5fr_1fr_auto] items-end p-3 border rounded-lg bg-card">
                        <div className="space-y-1">
                          <Label className="text-xs">Код *</Label>
                          <Input
                            value={product.code === "AUTO" ? "" : product.code}
                            onChange={(e) => updateBatchProduct(product.id, "code", e.target.value || "AUTO")}
                            placeholder="Автоматически"
                            disabled
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Название *</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateBatchProduct(product.id, "name", e.target.value)}
                            placeholder="Название продукта"
                            required
                            className={product.isDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}
                          />
                          {product.isDuplicate && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Дубликат</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Тип *</Label>
                          <Select
                            value={product.product_type}
                            onValueChange={(value) => updateBatchProduct(product.id, "product_type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="material">Материал</SelectItem>
                              <SelectItem value="semi-finished">Полуфабрикат</SelectItem>
                              <SelectItem value="assembly">Сборочный узел</SelectItem>
                              <SelectItem value="finished">Готовая продукция</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Ед. изм. *</Label>
                          <Select
                            value={product.unit}
                            onValueChange={(value) => updateBatchProduct(product.id, "unit", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="шт">шт</SelectItem>
                              <SelectItem value="кг">кг</SelectItem>
                              <SelectItem value="л">л</SelectItem>
                              <SelectItem value="м">м</SelectItem>
                              <SelectItem value="м²">м²</SelectItem>
                              <SelectItem value="м³">м³</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBatchRow(product.id)}
                          disabled={batchProducts.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div ref={batchRowsEndRef} />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Создание..." : `Создать (${batchProducts.filter(p => p.code && p.name).length})`}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
