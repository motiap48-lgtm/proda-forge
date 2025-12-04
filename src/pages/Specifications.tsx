import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Search, FileText, Package, Loader2, X, Clock, Layers } from "lucide-react";
import { useSpecifications } from "@/hooks/useSpecifications";
import { SpecificationDialog } from "@/components/specifications/SpecificationDialog";
import { FlattenedSpecificationDialog } from "@/components/specifications/FlattenedSpecificationDialog";

const Specifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyNoSpec, setShowOnlyNoSpec] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);
  const [flattenDialogOpen, setFlattenDialogOpen] = useState(false);
  const [flattenSpec, setFlattenSpec] = useState<any>(null);
  const { data: specifications, isLoading } = useSpecifications();

  const filteredSpecs = (specifications || []).filter(
    (spec: any) => {
      const matchesSearch = spec.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.products?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNoSpecFilter = !showOnlyNoSpec || spec.has_no_specification;
      return matchesSearch && matchesNoSpecFilter;
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Спецификации</h1>
            <p className="text-muted-foreground">
              Нормы расхода материалов на производство продукции
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать спецификацию
          </Button>
        </div>

        <SpecificationDialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedSpec(null);
          }}
          specification={selectedSpec}
        />

        <FlattenedSpecificationDialog
          open={flattenDialogOpen}
          onOpenChange={(open) => {
            setFlattenDialogOpen(open);
            if (!open) setFlattenSpec(null);
          }}
          specification={flattenSpec}
        />

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру или продукту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="nospec-filter" 
                  checked={showOnlyNoSpec}
                  onCheckedChange={(checked) => setShowOnlyNoSpec(checked as boolean)}
                />
                <Label 
                  htmlFor="nospec-filter" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Показать только "Нет спецификации"
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specifications List */}
        <div className="space-y-4">
          {filteredSpecs.map((spec: any) => (
            <Card
              key={spec.id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{spec.code}</h3>
                        <Badge variant={spec.is_active ? "default" : "secondary"}>
                          {spec.version}
                        </Badge>
                        {spec.is_active && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                            Активна
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{spec.products?.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">
                        Создана: {new Date(spec.created_at).toLocaleDateString()} • Материалов: {spec.specification_materials?.length || 0}
                      </p>
                      {spec.has_no_specification && (
                        <div className="mt-1.5">
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/30">
                            Нет спецификации
                          </Badge>
                        </div>
                      )}
                      {spec.specification_history && spec.specification_history.length > 0 && (() => {
                        const lastChange = spec.specification_history[0];
                        return (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {lastChange.description} • {lastChange.profiles?.full_name || "Пользователь"} • {new Date(lastChange.created_at).toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                      {spec.specification_materials && spec.specification_materials.some((m: any) => !m.waste_rate || Number(m.waste_rate) === 0) && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                            ⚠️ Не указаны отходы
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!spec.has_no_specification && spec.specification_materials?.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlattenSpec(spec);
                          setFlattenDialogOpen(true);
                        }}
                        title="Разложить в одноуровневую"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedSpec(spec);
                        setDialogOpen(true);
                      }}
                    >
                      Редактировать
                    </Button>
                  </div>
                </div>

                {spec.specification_materials && spec.specification_materials.length > 0 && !spec.has_no_specification && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Материалы:
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {spec.specification_materials.map((material: any, idx: number) => (
                        <div key={idx} className="text-sm bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-foreground">{material.products?.name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.quantity} {material.products?.unit || ""} • Отходы: {material.waste_rate}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSpecs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Спецификации не найдены</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Specifications;
