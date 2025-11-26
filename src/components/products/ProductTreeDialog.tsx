import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpecifications } from "@/hooks/useSpecifications";
import { Loader2, Package, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ProductTreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

interface TreeNodeProps {
  productId: string;
  productData?: any; // Данные о продукте, если уже загружены
  quantity?: number;
  wasteRate?: number;
  level: number;
}

const TreeNode = ({ productId, productData, quantity, wasteRate, level }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const { data: specifications, isLoading } = useSpecifications();

  const specification = specifications?.find(
    (spec) => spec.product_id === productId && spec.is_active
  );

  // Используем переданные данные о продукте или берем из спецификации
  const product = productData || (specification?.products as any);
  const materials = (specification?.specification_materials || []) as any[];

  const hasChildren = materials.length > 0;

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case "finished": return "ГП";
      case "semi-finished": return "ПФ";
      case "assembly": return "СБ";
      case "material": return "Материал";
      default: return type;
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 transition-colors cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}
        
        <Package className="h-4 w-4 text-primary flex-shrink-0" />
        
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="font-medium truncate">
            {product?.name || "Загрузка..."}
          </span>
          <span className="text-muted-foreground text-sm">
            ({product?.code})
          </span>
          {product?.product_type && (
            <Badge 
              className={`text-xs ${
                product.product_type === "finished" ? "bg-product-finished text-product-finished-foreground" :
                product.product_type === "assembly" ? "bg-product-assembly text-product-assembly-foreground" :
                product.product_type === "semi-finished" ? "bg-product-semi-finished text-product-semi-finished-foreground" :
                "bg-product-material text-product-material-foreground"
              }`}
            >
              {getProductTypeLabel(product.product_type)}
            </Badge>
          )}
          {quantity !== undefined && (
            <span className="text-sm text-muted-foreground">
              × {quantity} {product?.unit || "шт"}
            </span>
          )}
          {wasteRate !== undefined && wasteRate > 0 && (
            <Badge variant="outline" className="text-xs">
              Отход: {wasteRate}%
            </Badge>
          )}
        </div>
      </div>

      {isLoading && isExpanded && (
        <div className="flex items-center gap-2 p-2" style={{ paddingLeft: `${(level + 1) * 24 + 8}px` }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      )}

      {isExpanded && materials.map((material) => (
        <TreeNode
          key={material.id}
          productId={material.material_id}
          productData={material.products}
          quantity={material.quantity}
          wasteRate={material.waste_rate}
          level={level + 1}
        />
      ))}
    </div>
  );
};

export const ProductTreeDialog = ({
  open,
  onOpenChange,
  productId,
  productName,
}: ProductTreeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Состав продукта: {productName}</DialogTitle>
          <DialogDescription>
            Иерархическая структура компонентов и материалов
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <TreeNode productId={productId} productData={{ name: productName }} level={0} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
