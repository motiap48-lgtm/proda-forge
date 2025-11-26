import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useProducts } from "@/hooks/useProducts";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useCreateSpecification } from "@/hooks/useSpecifications";
import { cn } from "@/lib/utils";

interface SpecificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SpecificationDialog = ({ open, onOpenChange }: SpecificationDialogProps) => {
  const [code, setCode] = useState("");
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("v1");
  const [isActive, setIsActive] = useState(true);
  const [materials, setMaterials] = useState<Array<{ material_id: string; quantity: string; waste_rate: string }>>([
    { material_id: "", quantity: "", waste_rate: "0" }
  ]);
  const [productOpen, setProductOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState<{ [key: number]: boolean }>({});

  const { data: products } = useProducts();
  const createMutation = useCreateSpecification();

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
            // Сборочный узел состоит из полуфабрикатов и материалов
            return p.product_type === "semi-finished" || p.product_type === "material";
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
    }
  }, [open]);

  const handleAddMaterial = () => {
    setMaterials([...materials, { material_id: "", quantity: "", waste_rate: "0" }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !productId) {
      return;
    }

    const validMaterials = materials
      .filter(m => m.material_id && m.quantity)
      .map(m => ({
        material_id: m.material_id,
        quantity: parseFloat(m.quantity),
        waste_rate: parseFloat(m.waste_rate) || 0,
      }));

    await createMutation.mutateAsync({
      code,
      product_id: productId,
      version,
      is_active: isActive,
      materials: validMaterials,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать спецификацию</DialogTitle>
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
                              selected.product_type === "semi-finished" ? "ПФ" : "СУ"
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
                              product.product_type === "semi-finished" ? "ПФ" : "СУ"
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Компоненты</Label>
              <Button type="button" onClick={handleAddMaterial} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Добавить компонент
              </Button>
            </div>

            {materials.map((material, index) => (
              <div key={index} className="grid gap-4 p-4 border rounded-lg md:grid-cols-[1fr,120px,120px,auto]">
                <div className="space-y-2">
                  <Label>Компонент</Label>
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
                                  selected.product_type === "semi-finished" ? "ПФ" : "СУ"
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
                                  product.product_type === "semi-finished" ? "ПФ" : "СУ"
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
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={material.quantity}
                    onChange={(e) => handleMaterialChange(index, "quantity", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Отходы %</Label>
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
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveMaterial(index)}
                    disabled={materials.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
