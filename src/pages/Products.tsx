import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Pencil, Trash2, GitBranch, Info, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProducts, useDeleteProduct, useBulkDeleteProducts } from "@/hooks/useProducts";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductTreeDialog } from "@/components/products/ProductTreeDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  code: string;
  name: string;
  product_type: string;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [treeDialogOpen, setTreeDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  const [bulkDeletingType, setBulkDeletingType] = useState<string | null>(null);
  const [codeFilter, setCodeFilter] = useState<string | null>(null);
  const { data: products, isLoading } = useProducts();
  const deleteMutation = useDeleteProduct();
  const bulkDeleteMutation = useBulkDeleteProducts();

  const filteredProducts = products?.filter(
    (product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (codeFilter) {
        return product.code.startsWith(codeFilter);
      }
      
      return true;
    }
  );

  const finishedProducts = filteredProducts?.filter(p => p.product_type === "finished") || [];
  const materials = filteredProducts?.filter(p => p.product_type === "material") || [];
  const semiFinished = filteredProducts?.filter(p => p.product_type === "semi-finished") || [];
  const assemblies = filteredProducts?.filter(p => p.product_type === "assembly") || [];

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleViewTree = (product: Product) => {
    setSelectedProduct(product);
    setTreeDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingProduct) {
      await deleteMutation.mutateAsync(deletingProduct.id);
      setDeletingProduct(null);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeletingType) {
      await bulkDeleteMutation.mutateAsync(bulkDeletingType);
      setBulkDeletingType(null);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Номенклатура</h1>
            <p className="text-muted-foreground">Управление продукцией и материалами</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить продукт
          </Button>
        </div>

        <Collapsible open={isInstructionOpen} onOpenChange={setIsInstructionOpen}>
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <AlertDescription>
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-foreground">Порядок работы со спецификациями:</div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isInstructionOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Создайте материалы</div>
                      <div className="text-sm text-muted-foreground">Внесите все сырье и материалы, которые используются в производстве</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Создайте полуфабрикат</div>
                      <div className="text-sm text-muted-foreground">Добавьте продукт с типом "Полуфабрикат"</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Укажите расход материалов</div>
                      <div className="text-sm text-muted-foreground mb-2">Перейдите в раздел "Спецификации" и создайте спецификацию с составом и расходом материалов</div>
                      <Link to="/references/specifications">
                        <Button variant="outline" size="sm" className="h-8">
                          Перейти к спецификациям
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </AlertDescription>
          </Alert>
        </Collapsible>

        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или коду..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground self-center">Фильтр по коду:</span>
            <Button
              variant={codeFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setCodeFilter(null)}
            >
              Все
            </Button>
            <Button
              variant={codeFilter === "МАТ" ? "default" : "outline"}
              size="sm"
              onClick={() => setCodeFilter("МАТ")}
            >
              МАТ (Материалы)
            </Button>
            <Button
              variant={codeFilter === "ПФ" ? "default" : "outline"}
              size="sm"
              onClick={() => setCodeFilter("ПФ")}
            >
              ПФ (Полуфабрикаты)
            </Button>
            <Button
              variant={codeFilter === "СБ" ? "default" : "outline"}
              size="sm"
              onClick={() => setCodeFilter("СБ")}
            >
              СБ (Сборочные узлы)
            </Button>
            <Button
              variant={codeFilter === "ГП" ? "default" : "outline"}
              size="sm"
              onClick={() => setCodeFilter("ГП")}
            >
              ГП (Готовая продукция)
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Все ({filteredProducts?.length || 0})</TabsTrigger>
            <TabsTrigger value="materials">Материалы ({materials.length})</TabsTrigger>
            <TabsTrigger value="semi-finished">Полуфабрикаты ({semiFinished.length})</TabsTrigger>
            <TabsTrigger value="assembly">Сборочные узлы ({assemblies.length})</TabsTrigger>
            <TabsTrigger value="finished">Готовая продукция ({finishedProducts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts?.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-2">
                        {(product.product_type === "finished" || 
                          product.product_type === "semi-finished" || 
                          product.product_type === "assembly") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTree(product)}
                            title="Показать состав"
                          >
                            <GitBranch className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Тип:</span>
                        <Badge variant={
                          product.product_type === "finished" ? "default" : 
                          product.product_type === "semi-finished" ? "outline" : 
                          product.product_type === "assembly" ? "outline" : 
                          "secondary"
                        }>
                          {product.product_type === "finished" ? "Готовая продукция" : 
                           product.product_type === "semi-finished" ? "Полуфабрикат" :
                           product.product_type === "assembly" ? "Сборочный узел" :
                           "Материал"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ед. изм.:</span>
                        <span>{product.unit}</span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="finished" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {finishedProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewTree(product)}
                          title="Показать состав"
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ед. изм.:</span>
                        <span>{product.unit}</span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeletingType("material")}
                disabled={materials.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить все материалы
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {materials.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ед. изм.:</span>
                        <span>{product.unit}</span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="semi-finished" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {semiFinished.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewTree(product)}
                          title="Показать состав"
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ед. изм.:</span>
                        <span>{product.unit}</span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assembly" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assemblies.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewTree(product)}
                          title="Показать состав"
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ед. изм.:</span>
                        <span>{product.unit}</span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {filteredProducts?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Продукция не найдена</p>
            </CardContent>
          </Card>
        )}
      </main>

      <ProductDialog 
        open={dialogOpen} 
        onOpenChange={handleCloseDialog}
        product={editingProduct}
      />

      {selectedProduct && (
        <ProductTreeDialog
          open={treeDialogOpen}
          onOpenChange={setTreeDialogOpen}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
        />
      )}

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить продукт?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить продукт "{deletingProduct?.name}" ({deletingProduct?.code})?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkDeletingType} onOpenChange={() => setBulkDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить все материалы?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить все материалы? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
