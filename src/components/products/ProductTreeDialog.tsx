import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useProducts } from "@/hooks/useProducts";
import { Loader2, Package, ChevronRight, ChevronDown, Search, X, ChevronsDownUp, ChevronsUpDown, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TreeNodeProps {
  productId: string;
  productData?: any;
  quantity?: number;
  wasteRate?: number;
  level: number;
  searchQuery?: string;
  expandToLevel?: number;
  collapseToLevel?: number;
  allSpecifications: any[];
}

// Component for "Where Used" reverse tree
interface WhereUsedNodeProps {
  productId: string;
  productData?: any;
  level: number;
  searchQuery?: string;
  expandToLevel?: number;
  collapseToLevel?: number;
  allSpecifications: any[];
}

// Helper function to check if a node or any descendant matches the search
const checkDescendantsMatch = (
  productId: string,
  searchQuery: string,
  allSpecifications: any[],
  visited: Set<string> = new Set()
): boolean => {
  if (!searchQuery || visited.has(productId)) return false;
  visited.add(productId);

  const specification = allSpecifications?.find(
    (spec) => spec.product_id === productId && spec.is_active
  );
  
  const product = specification?.products;
  if (product) {
    const searchLower = searchQuery.toLowerCase();
    const name = product?.name?.toLowerCase() || "";
    const code = product?.code?.toLowerCase() || "";
    if (name.includes(searchLower) || code.includes(searchLower)) {
      return true;
    }
  }

  const materials = (specification?.specification_materials || []) as any[];
  for (const material of materials) {
    const matProduct = material.products;
    if (matProduct) {
      const searchLower = searchQuery.toLowerCase();
      const name = matProduct?.name?.toLowerCase() || "";
      const code = matProduct?.code?.toLowerCase() || "";
      if (name.includes(searchLower) || code.includes(searchLower)) {
        return true;
      }
    }
    if (checkDescendantsMatch(material.material_id, searchQuery, allSpecifications, visited)) {
      return true;
    }
  }
  
  return false;
};

const WhereUsedNode = ({ productId, productData, level, searchQuery = "", expandToLevel, collapseToLevel, allSpecifications }: WhereUsedNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const lastExpandToLevel = useRef<number | undefined>(undefined);
  const lastCollapseToLevel = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (expandToLevel !== undefined && expandToLevel !== lastExpandToLevel.current) {
      lastExpandToLevel.current = expandToLevel;
      if (level < expandToLevel) {
        setIsExpanded(true);
      }
    }
  }, [expandToLevel, level]);

  useEffect(() => {
    if (collapseToLevel !== undefined && collapseToLevel !== lastCollapseToLevel.current) {
      lastCollapseToLevel.current = collapseToLevel;
      if (level >= collapseToLevel && level > 0) {
        setIsExpanded(false);
      }
    }
  }, [collapseToLevel, level]);

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

  // Auto-expand when search matches
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    if (searchQuery !== prevSearchQuery.current) {
      prevSearchQuery.current = searchQuery;
      if (searchQuery && currentNodeMatches) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, currentNodeMatches]);

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
            expandToLevel={expandToLevel}
            collapseToLevel={collapseToLevel}
            allSpecifications={allSpecifications}
          />
        );
      })}
    </div>
  );
};

const TreeNode = ({ productId, productData, quantity, wasteRate, level, searchQuery = "", expandToLevel, collapseToLevel, allSpecifications }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const lastExpandToLevel = useRef<number | undefined>(undefined);
  const lastCollapseToLevel = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (expandToLevel !== undefined && expandToLevel !== lastExpandToLevel.current) {
      lastExpandToLevel.current = expandToLevel;
      if (level < expandToLevel) {
        setIsExpanded(true);
      }
    }
  }, [expandToLevel, level]);

  useEffect(() => {
    if (collapseToLevel !== undefined && collapseToLevel !== lastCollapseToLevel.current) {
      lastCollapseToLevel.current = collapseToLevel;
      if (level >= collapseToLevel && level > 0) {
        setIsExpanded(false);
      }
    }
  }, [collapseToLevel, level]);

  const specification = allSpecifications?.find(
    (spec) => spec.product_id === productId && spec.is_active
  );

  const product = productData || (specification?.products as any);
  const materials = (specification?.specification_materials || []) as any[];
  const hasChildren = materials.length > 0;

  // Check if current node matches search
  const currentNodeMatches = useMemo(() => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const name = product?.name?.toLowerCase() || "";
    const code = product?.code?.toLowerCase() || "";
    return name.includes(searchLower) || code.includes(searchLower);
  }, [searchQuery, product?.name, product?.code]);

  // Check if any descendant matches
  const hasDescendantMatch = useMemo(() => {
    if (!searchQuery) return false;
    for (const material of materials) {
      const matProduct = material.products;
      if (matProduct) {
        const searchLower = searchQuery.toLowerCase();
        const name = matProduct?.name?.toLowerCase() || "";
        const code = matProduct?.code?.toLowerCase() || "";
        if (name.includes(searchLower) || code.includes(searchLower)) {
          return true;
        }
      }
      if (checkDescendantsMatch(material.material_id, searchQuery, allSpecifications)) {
        return true;
      }
    }
    return false;
  }, [searchQuery, materials, allSpecifications]);

  // Auto-expand when search matches or has descendant match
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    if (searchQuery !== prevSearchQuery.current) {
      prevSearchQuery.current = searchQuery;
      if (searchQuery && (currentNodeMatches || hasDescendantMatch)) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, currentNodeMatches, hasDescendantMatch]);

  // Show node if it matches or has matching descendants or is root or no search
  const shouldShow = !searchQuery || currentNodeMatches || hasDescendantMatch || level === 0;

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

      {isExpanded && materials.map((material) => (
        <TreeNode
          key={material.id}
          productId={material.material_id}
          productData={material.products}
          quantity={material.quantity}
          wasteRate={material.waste_rate}
          level={level + 1}
          searchQuery={searchQuery}
          expandToLevel={expandToLevel}
          collapseToLevel={collapseToLevel}
          allSpecifications={allSpecifications}
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
  const [expandToLevel, setExpandToLevel] = useState<number | undefined>(undefined);
  const [collapseToLevel, setCollapseToLevel] = useState<number | undefined>(undefined);
  const [expandTrigger, setExpandTrigger] = useState(0);
  const [collapseTrigger, setCollapseTrigger] = useState(0);
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

  const handleExpandToLevel = (level: number) => {
    setExpandToLevel(level);
    setExpandTrigger(t => t + 1);
  };

  const handleCollapseToLevel = (level: number) => {
    setCollapseToLevel(level);
    setCollapseTrigger(t => t + 1);
  };

  // Combine trigger with level for unique keys
  const effectiveExpandToLevel = expandTrigger > 0 ? expandToLevel : undefined;
  const effectiveCollapseToLevel = collapseTrigger > 0 ? collapseToLevel : undefined;

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <ChevronsDownUp className="h-4 w-4 mr-2" />
                  Развернуть
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExpandToLevel(1)}>
                  До уровня 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExpandToLevel(2)}>
                  До уровня 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExpandToLevel(3)}>
                  До уровня 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExpandToLevel(4)}>
                  До уровня 4
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExpandToLevel(5)}>
                  До уровня 5
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExpandToLevel(100)}>
                  Всё
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <ChevronsUpDown className="h-4 w-4 mr-2" />
                  Свернуть
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleCollapseToLevel(1)}>
                  До уровня 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCollapseToLevel(2)}>
                  До уровня 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCollapseToLevel(3)}>
                  До уровня 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCollapseToLevel(0)}>
                  Всё (кроме корня)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {viewMode === "composition" ? (
            <TreeNode 
              productId={productId} 
              productData={{ name: productName, code: productCode, product_type: productType }} 
              level={0}
              searchQuery={searchQuery}
              expandToLevel={effectiveExpandToLevel}
              collapseToLevel={effectiveCollapseToLevel}
              allSpecifications={allSpecifications || []}
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
                  expandToLevel={effectiveExpandToLevel}
                  collapseToLevel={effectiveCollapseToLevel}
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
              expandToLevel={effectiveExpandToLevel}
              collapseToLevel={effectiveCollapseToLevel}
              allSpecifications={allSpecifications || []}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
