import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Package } from "lucide-react";

const mockSpecifications = [
  {
    id: "SPEC-001",
    product: "Деталь А-125",
    version: "v2",
    is_active: true,
    materials_count: 5,
    created_date: "2024-01-10",
    materials: [
      { name: "Сталь листовая 3мм", quantity: 2.5, unit: "кг", waste_rate: 5 },
      { name: "Болт М8х20", quantity: 4, unit: "шт", waste_rate: 2 },
    ],
  },
  {
    id: "SPEC-002",
    product: "Узел Б-340",
    version: "v1",
    is_active: true,
    materials_count: 8,
    created_date: "2024-01-15",
    materials: [
      { name: "Алюминиевый профиль", quantity: 1.2, unit: "м", waste_rate: 3 },
      { name: "Винт М6х15", quantity: 8, unit: "шт", waste_rate: 1 },
    ],
  },
  {
    id: "SPEC-003",
    product: "Деталь А-125",
    version: "v1",
    is_active: false,
    materials_count: 5,
    created_date: "2023-12-01",
    materials: [],
  },
];

const Specifications = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSpecs = mockSpecifications.filter(
    (spec) =>
      spec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spec.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать спецификацию
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру или продукту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Specifications List */}
        <div className="space-y-4">
          {filteredSpecs.map((spec) => (
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
                        <h3 className="font-semibold text-foreground">{spec.id}</h3>
                        <Badge variant={spec.is_active ? "default" : "secondary"}>
                          {spec.version}
                        </Badge>
                        {spec.is_active && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                            Активна
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{spec.product}</p>
                      <p className="text-xs text-muted-foreground">
                        Создана: {spec.created_date} • Материалов: {spec.materials_count}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Редактировать
                  </Button>
                </div>

                {spec.materials.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Материалы:
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {spec.materials.map((material, idx) => (
                        <div key={idx} className="text-sm bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-foreground">{material.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.quantity} {material.unit} • Отходы: {material.waste_rate}%
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
