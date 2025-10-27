import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, GitBranch, Clock, Settings } from "lucide-react";

const mockRoutingSheets = [
  {
    id: "RS-001",
    name: "Техмаршрут: Деталь А-125",
    product: "Деталь А-125",
    operations_count: 5,
    total_time: 125,
    is_active: true,
    operations: [
      {
        sequence: 10,
        name: "Резка заготовки",
        work_center: "Цех №1 - Участок резки",
        setup_time: 15,
        cycle_time: 8,
      },
      {
        sequence: 20,
        name: "Сверление отверстий",
        work_center: "Цех №1 - Участок механообработки",
        setup_time: 10,
        cycle_time: 12,
      },
      {
        sequence: 30,
        name: "Зачистка",
        work_center: "Цех №1 - Участок финишной обработки",
        setup_time: 5,
        cycle_time: 6,
      },
    ],
  },
  {
    id: "RS-002",
    name: "Техмаршрут: Узел Б-340",
    product: "Узел Б-340",
    operations_count: 7,
    total_time: 240,
    is_active: true,
    operations: [
      {
        sequence: 10,
        name: "Резка профиля",
        work_center: "Цех №2 - Участок резки",
        setup_time: 20,
        cycle_time: 15,
      },
      {
        sequence: 20,
        name: "Сварка",
        work_center: "Цех №2 - Участок сварки",
        setup_time: 25,
        cycle_time: 45,
      },
    ],
  },
];

const RoutingSheets = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSheets = mockRoutingSheets.filter(
    (sheet) =>
      sheet.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Технологические маршруты</h1>
            <p className="text-muted-foreground">
              Последовательность операций для производства продукции
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать техмаршрут
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, названию или продукту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Routing Sheets List */}
        <div className="space-y-4">
          {filteredSheets.map((sheet) => (
            <Card
              key={sheet.id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <GitBranch className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{sheet.id}</h3>
                        {sheet.is_active && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                            Активен
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Продукт: {sheet.product}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Редактировать
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Операций:</span>
                    <span className="font-medium text-foreground">{sheet.operations_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Общее время:</span>
                    <span className="font-medium text-foreground">{sheet.total_time} мин</span>
                  </div>
                </div>

                {sheet.operations.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-foreground mb-3">Операции:</p>
                    <div className="space-y-2">
                      {sheet.operations.map((operation, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                          <Badge variant="secondary" className="mt-0.5 font-mono">
                            {operation.sequence}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{operation.name}</p>
                            <p className="text-xs text-muted-foreground">{operation.work_center}</p>
                            <div className="flex gap-4 mt-1">
                              <span className="text-xs text-muted-foreground">
                                ПЗ: {operation.setup_time} мин
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Штучное: {operation.cycle_time} мин
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSheets.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Технологические маршруты не найдены</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default RoutingSheets;
