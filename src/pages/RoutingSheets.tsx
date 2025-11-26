import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, GitBranch, Clock, Settings, Loader2, X } from "lucide-react";
import { useRoutingSheets } from "@/hooks/useRoutingSheets";

const RoutingSheets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: routingSheets, isLoading } = useRoutingSheets();

  const filteredSheets = routingSheets?.filter(
    (sheet) =>
      sheet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.products?.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
          </CardContent>
        </Card>

        {/* Routing Sheets List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Загрузка техмаршрутов...</p>
            </CardContent>
          </Card>
        ) : filteredSheets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "Технологические маршруты не найдены" : "Нет созданных техмаршрутов"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSheets.map((sheet) => {
              const operations = sheet.routing_operations || [];
              const totalTime = operations.reduce(
                (sum, op) => sum + (op.setup_time_minutes || 0) + (op.cycle_time_minutes || 0),
                0
              );

              return (
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
                            <h3 className="font-semibold text-foreground">{sheet.code}</h3>
                            {sheet.is_active && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                Активен
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Продукт: {sheet.products?.name || "Не указан"}
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
                        <span className="font-medium text-foreground">{operations.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Общее время:</span>
                        <span className="font-medium text-foreground">{totalTime} мин</span>
                      </div>
                    </div>

                    {operations.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm font-medium text-foreground mb-3">Операции:</p>
                        <div className="space-y-2">
                          {operations
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((operation) => (
                              <div
                                key={operation.id}
                                className="flex items-start gap-3 bg-muted/50 rounded-lg p-3"
                              >
                                <Badge variant="secondary" className="mt-0.5 font-mono">
                                  {operation.sequence}
                                </Badge>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">{operation.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {operation.work_centers?.name || "Рабочий центр не указан"}
                                  </p>
                                  <div className="flex gap-4 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      ПЗ: {operation.setup_time_minutes} мин
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Штучное: {operation.cycle_time_minutes} мин
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RoutingSheets;
