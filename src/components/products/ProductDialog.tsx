import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface BatchProduct {
  id: string;
  code: string;
  name: string;
  product_type: string;
  unit: string;
}

export const ProductDialog = ({ open, onOpenChange, product }: ProductDialogProps) => {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    product_type: "material",
    unit: "шт",
    description: "",
  });
  const [batchProducts, setBatchProducts] = useState<BatchProduct[]>([
    { id: crypto.randomUUID(), code: "", name: "", product_type: "material", unit: "шт" }
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const getNextCode = async (productType: string) => {
    const prefixMap: Record<string, string> = {
      'material': 'МАТ',
      'semi-finished': 'ПФ',
      'assembly': 'СБ',
      'finished': 'ГП',
    };

    const prefix = prefixMap[productType];
    
    const { data, error } = await supabase
      .from('products')
      .select('code')
      .eq('product_type', productType)
      .eq('is_active', true)
      .ilike('code', `${prefix}%`)
      .order('code', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last code:', error);
      return `${prefix}-001`;
    }

    if (!data || data.length === 0) {
      return `${prefix}-001`;
    }

    const lastCode = data[0].code;
    const match = lastCode.match(/(\d+)$/);
    
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    }

    return `${prefix}-001`;
  };

  const handleProductTypeChange = async (productType: string, isSingle: boolean = true) => {
    const nextCode = await getNextCode(productType);
    
    if (isSingle) {
      setFormData({ ...formData, product_type: productType, code: nextCode });
    } else {
      // For batch, we'll update the last item's code
      const updatedBatch = [...batchProducts];
      const lastIndex = updatedBatch.length - 1;
      updatedBatch[lastIndex] = { 
        ...updatedBatch[lastIndex], 
        product_type: productType, 
        code: nextCode 
      };
      setBatchProducts(updatedBatch);
    }
  };

  useEffect(() => {
    const initializeDialog = async () => {
      if (open && product) {
        setMode("single");
        setFormData({
          code: product.code,
          name: product.name,
          product_type: product.product_type,
          unit: product.unit,
          description: product.description || "",
        });
      } else if (open && !product) {
        setMode("single");
        const nextCode = await getNextCode("material");
        setFormData({
          code: nextCode,
          name: "",
          product_type: "material",
          unit: "шт",
          description: "",
        });
        const batchCode = await getNextCode("material");
        setBatchProducts([
          { id: crypto.randomUUID(), code: batchCode, name: "", product_type: "material", unit: "шт" }
        ]);
      } else if (!open) {
        setMode("single");
        setFormData({
          code: "",
          name: "",
          product_type: "material",
          unit: "шт",
          description: "",
        });
        setBatchProducts([
          { id: crypto.randomUUID(), code: "", name: "", product_type: "material", unit: "шт" }
        ]);
      }
    };
    
    initializeDialog();
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      return;
    }

    if (product) {
      await updateMutation.mutateAsync({
        id: product.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
    
    onOpenChange(false);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validProducts = batchProducts.filter(p => p.code && p.name);
    
    if (validProducts.length === 0) {
      toast.error("Заполните хотя бы один продукт");
      return;
    }

    setIsCreating(true);
    try {
      await Promise.all(
        validProducts.map(p => 
          createMutation.mutateAsync({
            code: p.code,
            name: p.name,
            product_type: p.product_type,
            unit: p.unit,
          })
        )
      );
      toast.success(`Создано продуктов: ${validProducts.length}`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Ошибка при создании продуктов");
    } finally {
      setIsCreating(false);
    }
  };

  const addBatchRow = async () => {
    const lastProductType = batchProducts[batchProducts.length - 1]?.product_type || "material";
    const nextCode = await getNextCode(lastProductType);
    setBatchProducts([...batchProducts, { 
      id: crypto.randomUUID(), 
      code: nextCode, 
      name: "", 
      product_type: lastProductType, 
      unit: "шт" 
    }]);
  };

  const removeBatchRow = (id: string) => {
    if (batchProducts.length > 1) {
      setBatchProducts(batchProducts.filter(p => p.id !== id));
    }
  };

  const updateBatchProduct = async (id: string, field: keyof BatchProduct, value: string) => {
    if (field === 'product_type') {
      const nextCode = await getNextCode(value);
      setBatchProducts(batchProducts.map(p => 
        p.id === id ? { ...p, product_type: value, code: nextCode } : p
      ));
    } else {
      setBatchProducts(batchProducts.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      ));
    }
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
                <Label htmlFor="code">Код *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="PROD-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название продукта"
                  required
                />
              </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_type">Тип продукта *</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) => handleProductTypeChange(value, true)}
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
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="PROD-001"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Название продукта"
                      required
                    />
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
                            value={product.code}
                            onChange={(e) => updateBatchProduct(product.id, "code", e.target.value)}
                            placeholder="PROD-001"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Название *</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => updateBatchProduct(product.id, "name", e.target.value)}
                            placeholder="Название продукта"
                            required
                          />
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
