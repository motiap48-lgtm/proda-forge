import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Package, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpecificationMaterial {
  material_id: string;
  quantity: number;
  waste_rate: number;
  products: {
    name: string;
    code: string;
    unit: string;
    product_type: string;
  };
}

interface OperationMaterial {
  product_id: string;
  quantity_per_operation?: number | null;
}

interface OperationMaterialsSectionProps {
  operationIndex: number;
  operationName: string;
  specificationMaterials: SpecificationMaterial[];
  selectedMaterials: OperationMaterial[];
  onMaterialsChange: (materials: OperationMaterial[]) => void;
  disabled?: boolean;
}

const productTypeLabels: Record<string, string> = {
  material: "МАТ",
  "semi-finished": "ПФ",
  assembly: "СБ",
  finished: "ГП",
};

const productTypeColors: Record<string, string> = {
  material: "bg-green-500/10 text-green-600 border-green-500/20",
  "semi-finished": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  assembly: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  finished: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function OperationMaterialsSection({
  operationIndex,
  operationName,
  specificationMaterials,
  selectedMaterials,
  onMaterialsChange,
  disabled,
}: OperationMaterialsSectionProps) {
  const [isOpen, setIsOpen] = useState(selectedMaterials.length > 0);

  const handleToggleMaterial = (productId: string, checked: boolean) => {
    if (checked) {
      const specMaterial = specificationMaterials.find(
        (m) => m.material_id === productId
      );
      onMaterialsChange([
        ...selectedMaterials,
        {
          product_id: productId,
          quantity_per_operation: specMaterial?.quantity || null,
        },
      ]);
    } else {
      onMaterialsChange(
        selectedMaterials.filter((m) => m.product_id !== productId)
      );
    }
  };

  const handleQuantityChange = (productId: string, quantity: number | null) => {
    onMaterialsChange(
      selectedMaterials.map((m) =>
        m.product_id === productId
          ? { ...m, quantity_per_operation: quantity }
          : m
      )
    );
  };

  const isMaterialSelected = (productId: string) =>
    selectedMaterials.some((m) => m.product_id === productId);

  const getSelectedQuantity = (productId: string) => {
    const material = selectedMaterials.find((m) => m.product_id === productId);
    return material?.quantity_per_operation ?? null;
  };

  if (specificationMaterials.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-0 hover:bg-transparent h-auto py-2"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Компоненты операции</span>
            {selectedMaterials.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedMaterials.length}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-3">
              Выберите компоненты из спецификации, которые потребляются на этой
              операции
            </p>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {specificationMaterials.map((material) => {
                  const isSelected = isMaterialSelected(material.material_id);
                  const quantity = getSelectedQuantity(material.material_id);

                  return (
                    <div
                      key={material.material_id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        id={`mat-${operationIndex}-${material.material_id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleToggleMaterial(
                            material.material_id,
                            checked as boolean
                          )
                        }
                        disabled={disabled}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              productTypeColors[material.products.product_type]
                            )}
                          >
                            {productTypeLabels[material.products.product_type]}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {material.products.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {material.products.code} • Норма: {material.quantity}{" "}
                          {material.products.unit}
                          {material.waste_rate > 0 &&
                            ` (+${material.waste_rate}% отхода)`}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={quantity ?? ""}
                            onChange={(e) =>
                              handleQuantityChange(
                                material.material_id,
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : null
                              )
                            }
                            className="w-20 h-8 text-sm"
                            placeholder="Кол-во"
                            disabled={disabled}
                          />
                          <span className="text-xs text-muted-foreground">
                            {material.products.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
