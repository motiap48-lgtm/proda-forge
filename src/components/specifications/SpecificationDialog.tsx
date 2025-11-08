import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProducts } from "@/hooks/useProducts";
import { Plus, Trash2 } from "lucide-react";
import { useCreateSpecification } from "@/hooks/useSpecifications";

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
              <Label htmlFor="code">Код спецификации *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SPEC-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Продукт *</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите продукт" />
                </SelectTrigger>
                <SelectContent>
                  {producibleProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.code}) - {
                        product.product_type === "finished" ? "ГП" : 
                        product.product_type === "semi-finished" ? "ПФ" : "СУ"
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Select
                    value={material.material_id}
                    onValueChange={(value) => handleMaterialChange(index, "material_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите компонент" />
                    </SelectTrigger>
                    <SelectContent>
                      {componentProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code}) - {
                            product.product_type === "material" ? "Материал" : 
                            product.product_type === "semi-finished" ? "ПФ" : "СУ"
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
