import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useProducts } from "@/hooks/useProducts";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useCreateSpecification, useUpdateSpecification } from "@/hooks/useSpecifications";
import { cn } from "@/lib/utils";

interface SpecificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specification?: any;
}

export const SpecificationDialog = ({ open, onOpenChange, specification }: SpecificationDialogProps) => {
  const [code, setCode] = useState("");
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("v1");
  const [isActive, setIsActive] = useState(true);
  const [materials, setMaterials] = useState<Array<{ material_id: string; quantity: string; waste_rate: string }>>([
    { material_id: "", quantity: "", waste_rate: "0" }
  ]);
  const [productOpen, setProductOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState<{ [key: number]: boolean }>({});
  const materialsEndRef = useRef<HTMLDivElement>(null);

  const { data: products } = useProducts();
  const createMutation = useCreateSpecification();
  const updateMutation = useUpdateSpecification();

  const producibleProducts = products?.filter(p => 
    p.product_type === "finished" || 
    p.product_type === "semi-finished" || 
    p.product_type === "assembly"
  ) || [];
  
  const allComponentProducts = products?.filter(p => 
    p.product_type === "material" || 
    p.product_type === "semi-finished" || 
    p.product_type === "assembly"
  ) || [];

  // Фильтруем компоненты в зависимости от типа выбранного продукта
  const selectedProduct = products?.find(p => p.id === productId);
  const componentProducts = selectedProduct
    ? allComponentProducts.filter(p => {
        switch (selectedProduct.product_type) {
          case "finished":
            // Готовая продукция состоит из сборочных узлов или полуфабрикатов
            return p.product_type === "assembly" || p.product_type === "semi-finished";
          case "assembly":
            // Сборочный узел состоит из других узлов, полуфабрикатов и материалов
            return p.product_type === "assembly" || p.product_type === "semi-finished" || p.product_type === "material";
          case "semi-finished":
            // Полуфабрикат состоит из материалов
            return p.product_type === "material";
          default:
            return true;
        }
      })
    : allComponentProducts;

  useEffect(() => {
    if (!open) {
      setCode("");
      setProductId("");
      setVersion("v1");
      setIsActive(true);
      setMaterials([{ material_id: "", quantity: "", waste_rate: "0" }]);
    } else if (specification) {
      // Загружаем данные для редактирования
      setCode(specification.code);
      setProductId(specification.product_id);
      setVersion(specification.version);
      setIsActive(specification.is_active);
      
      if (specification.specification_materials && specification.specification_materials.length > 0) {
        setMaterials(
          specification.specification_materials.map((m: any) => ({
            // Используем id из связанной таблицы для получения material_id
            material_id: m.material_id || (m.products?.id),
            quantity: m.quantity.toString(),
            waste_rate: m.waste_rate.toString(),
          }))
        );
      } else {
        setMaterials([{ material_id: "", quantity: "", waste_rate: "0" }]);
      }
    }
  }, [open, specification]);

  const handleAddMaterial = () => {
    setMaterials([...materials, { material_id: "", quantity: "", waste_rate: "0" }]);
    // Прокрутка к новому компоненту
    setTimeout(() => {
      materialsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const validMaterials = materials.filter(m => m.material_id && m.quantity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      return;
    }

    const materialsToSave = validMaterials.map(m => ({
      material_id: m.material_id,
      quantity: parseFloat(m.quantity),
      waste_rate: parseFloat(m.waste_rate) || 0,
    }));

    if (specification) {
      // Режим редактирования
      await updateMutation.mutateAsync({
        id: specification.id,
        code,
        product_id: productId,
        version,
        is_active: isActive,
        materials: materialsToSave,
      });
    } else {
      // Режим создания
      await createMutation.mutateAsync({
        code,
        product_id: productId,
        version,
        is_active: isActive,
        materials: materialsToSave,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{specification ? "Редактировать спецификацию" : "Создать спецификацию"}</DialogTitle>
          <DialogDescription>
            Определите состав продукта, указав необходимые компоненты и их количество
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Код спецификации</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AUTO (генерируется автоматически)"
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым для автоматической генерации
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Продукт *</Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="w-full justify-between text-left"
                  >
                    <span className="truncate">
                      {productId
                        ? (() => {
                            const selected = producibleProducts.find((p) => p.id === productId);
                            return selected ? `${selected.code} ${selected.name} - ${
                              selected.product_type === "finished" ? "ГП" : 
                              selected.product_type === "semi-finished" ? "ПФ" : "СБ"
                            }` : "Выберите продукт";
                          })()
                        : "Выберите продукт"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Поиск продукта..." />
                    <CommandList>
                      <CommandEmpty>Продукт не найден</CommandEmpty>
                      <CommandGroup>
                        {producibleProducts.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.code} ${product.name}`}
                            onSelect={() => {
                              setProductId(product.id);
                              setProductOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                productId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {product.code} {product.name} ({
                              product.product_type === "finished" ? "ГП" : 
                              product.product_type === "semi-finished" ? "ПФ" : "СБ"
                            })
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Версия</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active">Активная спецификация</Label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Компоненты</Label>
              <Button type="button" onClick={handleAddMaterial} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {materials.map((material, index) => (
                <div key={index} className="grid gap-2 p-3 border rounded-lg bg-card md:grid-cols-[1fr,100px,100px,auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">Компонент</Label>
                  <Popover 
                    open={materialOpen[index]} 
                    onOpenChange={(open) => setMaterialOpen({ ...materialOpen, [index]: open })}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={materialOpen[index]}
                        className="w-full justify-between text-left"
                      >
                        <span className="truncate">
                          {material.material_id
                            ? (() => {
                                const selected = componentProducts.find((p) => p.id === material.material_id);
                                return selected ? `${selected.code} ${selected.name} - ${
                                  selected.product_type === "material" ? "Материал" : 
                                  selected.product_type === "semi-finished" ? "ПФ" : "СБ"
                                }` : "Выберите компонент";
                              })()
                            : "Выберите компонент"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Поиск компонента..." />
                        <CommandList>
                          <CommandEmpty>Компонент не найден</CommandEmpty>
                          <CommandGroup>
                            {componentProducts.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={`${product.code} ${product.name}`}
                                onSelect={() => {
                                  handleMaterialChange(index, "material_id", product.id);
                                  setMaterialOpen({ ...materialOpen, [index]: false });
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    material.material_id === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {product.code} {product.name} ({
                                  product.product_type === "material" ? "Материал" : 
                                  product.product_type === "semi-finished" ? "ПФ" : "СБ"
                                })
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Количество
                    {material.material_id && (() => {
                      const selected = componentProducts.find((p) => p.id === material.material_id);
                      return selected ? `, ${selected.unit}` : "";
                    })()}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={material.quantity}
                    onChange={(e) => handleMaterialChange(index, "quantity", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Отходы %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={material.waste_rate}
                    onChange={(e) => handleMaterialChange(index, "waste_rate", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMaterial(index)}
                    disabled={materials.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              ))}
              <div ref={materialsEndRef} />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {specification 
                ? (updateMutation.isPending ? "Сохранение..." : `Сохранить (${validMaterials.length})`)
                : (createMutation.isPending ? "Создание..." : `Создать (${validMaterials.length})`)
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
