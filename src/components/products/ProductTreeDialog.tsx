import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useProducts } from "@/hooks/useProducts";
import { Loader2, Package, ChevronRight, ChevronDown, Search, X, ChevronsDownUp, ChevronsUpDown, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TreeNodeProps {
  productId: string;
  productData?: any;
  quantity?: number;
  wasteRate?: number;
  level: number;
  searchQuery?: string;
  expandVersion?: number;
  collapseVersion?: number;
}

// Component for "Where Used" reverse tree
interface WhereUsedNodeProps {
  productId: string;
  productData?: any;
  level: number;
  searchQuery?: string;
  expandVersion?: number;
  collapseVersion?: number;
  allSpecifications: any[];
}

const WhereUsedNode = ({ productId, productData, level, searchQuery = "", expandVersion, collapseVersion, allSpecifications }: WhereUsedNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const lastExpandVersion = useRef(0);
  const lastCollapseVersion = useRef(0);

  useEffect(() => {
    if (expandVersion && expandVersion > lastExpandVersion.current) {
      lastExpandVersion.current = expandVersion;
      setIsExpanded(true);
    }
  }, [expandVersion]);

  useEffect(() => {
    if (collapseVersion && collapseVersion > lastCollapseVersion.current && level > 0) {
      lastCollapseVersion.current = collapseVersion;
      setIsExpanded(false);
    }
  }, [collapseVersion, level]);

  // Find all specifications that use this product as a material
  const parentProducts = useMemo(() => {
    return allSpecifications?.filter(spec => 
      spec.is_active && 
      spec.specification_materials?.some((mat: any) => mat.material_id === productId)
    ).map(spec => ({
      ...spec,
      material: spec.specification_materials?.find((mat: any) => mat.material_id === productId)
    })) || [];
  }, [allSpecifications, productId]);

  const product = productData;
  const hasChildren = parentProducts.length > 0;

  const currentNodeMatches = useMemo(() => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const name = product?.name?.toLowerCase() || "";
    const code = product?.code?.toLowerCase() || "";
    return name.includes(searchLower) || code.includes(searchLower);
  }, [searchQuery, product?.name, product?.code]);

  // Auto-expand when search matches - use ref to prevent loops
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    if (searchQuery !== prevSearchQuery.current) {
      prevSearchQuery.current = searchQuery;
      if (searchQuery && currentNodeMatches) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, currentNodeMatches]);

  // Don't hide nodes when searching - just highlight matches
  const shouldShow = !searchQuery || currentNodeMatches || level === 0;

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case "finished": return "ГП";
      case "semi-finished": return "ПФ";
      case "assembly": return "СБ";
      case "material": return "Материал";
      default: return type;
    }
  };

  if (!shouldShow) {
    return null;
  }

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
          {level === 0 && hasChildren && (
            <Badge variant="outline" className="text-xs">
              Используется в {parentProducts.length} изделиях
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && parentProducts.map((spec) => {
        const parentProduct = spec.products;
        return (
          <WhereUsedNode
            key={spec.id}
            productId={parentProduct?.id}
            productData={parentProduct}
            level={level + 1}
            searchQuery={searchQuery}
            expandVersion={expandVersion}
            collapseVersion={collapseVersion}
            allSpecifications={allSpecifications}
          />
        );
      })}
    </div>
  );
};

const TreeNode = ({ productId, productData, quantity, wasteRate, level, searchQuery = "", expandVersion, collapseVersion }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const lastExpandVersion = useRef(0);
  const lastCollapseVersion = useRef(0);
  const { data: specifications, isLoading } = useSpecifications();

  useEffect(() => {
    if (expandVersion && expandVersion > lastExpandVersion.current) {
      lastExpandVersion.current = expandVersion;
      setIsExpanded(true);
    }
  }, [expandVersion]);

  useEffect(() => {
    if (collapseVersion && collapseVersion > lastCollapseVersion.current && level > 0) {
      lastCollapseVersion.current = collapseVersion;
      setIsExpanded(false);
    }
  }, [collapseVersion, level]);

  const specification = specifications?.find(
    (spec) => spec.product_id === productId && spec.is_active
  );

  const product = productData || (specification?.products as any);
  const materials = (specification?.specification_materials || []) as any[];
  const hasChildren = materials.length > 0;

  // Проверяем совпадение с поисковым запросом
  const currentNodeMatches = useMemo(() => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const name = product?.name?.toLowerCase() || "";
    const code = product?.code?.toLowerCase() || "";
    return name.includes(searchLower) || code.includes(searchLower);
  }, [searchQuery, product?.name, product?.code]);

  // Auto-expand when search matches - use ref to prevent loops
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    if (searchQuery !== prevSearchQuery.current) {
      prevSearchQuery.current = searchQuery;
      if (searchQuery && currentNodeMatches) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, currentNodeMatches]);

  // Don't hide nodes when searching - just highlight matches
  const shouldShow = !searchQuery || currentNodeMatches || level === 0;

  if (!shouldShow) {
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

      {isExpanded && materials.map((material) => (
        <TreeNode
          key={material.id}
          productId={material.material_id}
          productData={material.products}
          quantity={material.quantity}
          wasteRate={material.waste_rate}
          level={level + 1}
          searchQuery={searchQuery}
          expandVersion={expandVersion}
          collapseVersion={collapseVersion}
        />
      ))}
    </div>
  );
};

interface ProductTreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productCode: string;
  productType?: string;
}

export const ProductTreeDialog = ({
  open,
  onOpenChange,
  productId,
  productName,
  productCode,
  productType,
}: ProductTreeDialogProps) => {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandVersion, setExpandVersion] = useState(0);
  const [collapseVersion, setCollapseVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"composition" | "whereUsed">("composition");
  const { data: allSpecifications } = useSpecifications();
  const { data: allProducts } = useProducts();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Find products matching search query for "Where Used" mode
  const matchingProductsForWhereUsed = useMemo(() => {
    if (!searchQuery || viewMode !== "whereUsed" || !allProducts) return [];
    const searchLower = searchQuery.toLowerCase();
    return allProducts.filter(p => 
      p.is_active && 
      (p.name.toLowerCase().includes(searchLower) || p.code.toLowerCase().includes(searchLower))
    );
  }, [searchQuery, viewMode, allProducts]);

  const handleExpandAll = () => {
    setExpandVersion(v => v + 1);
  };

  const handleCollapseAll = () => {
    setCollapseVersion(v => v + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {viewMode === "composition" ? "Состав продукта" : "Где используется"}: {productName}
          </DialogTitle>
          <DialogDescription>
            {viewMode === "composition" 
              ? "Иерархическая структура компонентов и материалов"
              : searchQuery 
                ? "Поиск продуктов и их использования в изделиях"
                : "В каких изделиях используется данный продукт"
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "composition" | "whereUsed")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="composition" className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Состав
            </TabsTrigger>
            <TabsTrigger value="whereUsed" className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Где используется
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={viewMode === "whereUsed" ? "Поиск продукта для просмотра использования..." : "Поиск по названию или коду..."}
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
          {viewMode === "composition" ? (
            <TreeNode 
              productId={productId} 
              productData={{ name: productName, code: productCode, product_type: productType }} 
              level={0}
              searchQuery={searchQuery}
              expandVersion={expandVersion}
              collapseVersion={collapseVersion}
            />
          ) : searchQuery && matchingProductsForWhereUsed.length > 0 ? (
            // Show matching products and where they are used
            <div className="space-y-4">
              {matchingProductsForWhereUsed.map(product => (
                <WhereUsedNode
                  key={product.id}
                  productId={product.id}
                  productData={product}
                  level={0}
                  searchQuery=""
                  expandVersion={expandVersion}
                  collapseVersion={collapseVersion}
                  allSpecifications={allSpecifications || []}
                />
              ))}
            </div>
          ) : searchQuery && matchingProductsForWhereUsed.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Продукты не найдены
            </div>
          ) : (
            <WhereUsedNode
              productId={productId}
              productData={{ name: productName, code: productCode, product_type: productType }}
              level={0}
              searchQuery=""
              expandVersion={expandVersion}
              collapseVersion={collapseVersion}
              allSpecifications={allSpecifications || []}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
