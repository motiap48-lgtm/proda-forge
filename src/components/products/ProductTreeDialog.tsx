import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpecifications } from "@/hooks/useSpecifications";
import { Loader2, Package, ChevronRight, ChevronDown, Search, X, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductTreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productCode: string;
}

interface TreeNodeProps {
  productId: string;
  productData?: any;
  quantity?: number;
  wasteRate?: number;
  level: number;
  searchQuery?: string;
  onMatchFound?: (hasMatch: boolean) => void;
  expandAll?: boolean;
  collapseAll?: boolean;
}

const TreeNode = ({ productId, productData, quantity, wasteRate, level, searchQuery = "", onMatchFound, expandAll, collapseAll }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [childMatches, setChildMatches] = useState<boolean[]>([]);
  const { data: specifications, isLoading } = useSpecifications();

  // Handle expand/collapse all
  useEffect(() => {
    if (expandAll) {
      setIsExpanded(true);
    }
  }, [expandAll]);

  useEffect(() => {
    if (collapseAll && level > 0) {
      setIsExpanded(false);
    }
  }, [collapseAll, level]);

  const specification = specifications?.find(
    (spec) => spec.product_id === productId && spec.is_active
  );

  const product = productData || (specification?.products as any);
  const materials = (specification?.specification_materials || []) as any[];
  const hasChildren = materials.length > 0;

  // Проверяем совпадение с поисковым запросом
  const searchLower = searchQuery.toLowerCase();
  const currentNodeMatches = useMemo(() => {
    if (!searchQuery) return true;
    const name = product?.name?.toLowerCase() || "";
    const code = product?.code?.toLowerCase() || "";
    return name.includes(searchLower) || code.includes(searchLower);
  }, [searchQuery, product?.name, product?.code, searchLower]);

  // Определяем, есть ли совпадения в дочерних элементах
  const hasChildMatches = childMatches.some(match => match);
  const hasAnyMatch = currentNodeMatches || hasChildMatches;

  // Автоматически раскрываем узел если есть совпадения в детях
  useEffect(() => {
    if (searchQuery && hasChildMatches && !isExpanded) {
      setIsExpanded(true);
    }
  }, [searchQuery, hasChildMatches, isExpanded]);

  // Сообщаем родителю о наличии совпадений
  useEffect(() => {
    if (onMatchFound) {
      onMatchFound(hasAnyMatch);
    }
  }, [hasAnyMatch, onMatchFound]);

  // Обработчик для отслеживания совпадений в дочерних элементах
  const handleChildMatch = (index: number) => (hasMatch: boolean) => {
    setChildMatches(prev => {
      const newMatches = [...prev];
      newMatches[index] = hasMatch;
      return newMatches;
    });
  };

  // Не отображаем узел если нет совпадений при активном поиске
  if (searchQuery && !hasAnyMatch) {
    return null;
  }

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
        className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer ${
          currentNodeMatches && searchQuery 
            ? "bg-primary/10 hover:bg-primary/20 border-l-2 border-primary" 
            : "hover:bg-accent/50"
        }`}
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

      {isExpanded && materials.map((material, index) => (
        <TreeNode
          key={material.id}
          productId={material.material_id}
          productData={material.products}
          quantity={material.quantity}
          wasteRate={material.waste_rate}
          level={level + 1}
          searchQuery={searchQuery}
          onMatchFound={handleChildMatch(index)}
          expandAll={expandAll}
          collapseAll={collapseAll}
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
  productCode,
}: ProductTreeDialogProps) => {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);

  // Debounce search query with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleExpandAll = () => {
    setCollapseAll(false);
    setExpandAll(true);
    setTimeout(() => setExpandAll(false), 100);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Состав продукта: {productName}</DialogTitle>
          <DialogDescription>
            Иерархическая структура компонентов и материалов
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или коду..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 pr-9"
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setInputValue("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="flex-1"
            >
              <ChevronsDownUp className="h-4 w-4 mr-2" />
              Развернуть всё
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="flex-1"
            >
              <ChevronsUpDown className="h-4 w-4 mr-2" />
              Свернуть всё
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <TreeNode 
            productId={productId} 
            productData={{ name: productName, code: productCode }} 
            level={0}
            searchQuery={searchQuery}
            expandAll={expandAll}
            collapseAll={collapseAll}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
