import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";

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

export const ProductDialog = ({ open, onOpenChange, product }: ProductDialogProps) => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    product_type: "material",
    unit: "шт",
    description: "",
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  useEffect(() => {
    if (open && product) {
      setFormData({
        code: product.code,
        name: product.name,
        product_type: product.product_type,
        unit: product.unit,
        description: product.description || "",
      });
    } else if (!open) {
      setFormData({
        code: "",
        name: "",
        product_type: "material",
        unit: "шт",
        description: "",
      });
    }
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Редактировать продукт" : "Добавить продукт"}</DialogTitle>
        </DialogHeader>

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
              {isLoading ? (product ? "Сохранение..." : "Создание...") : (product ? "Сохранить" : "Создать")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
