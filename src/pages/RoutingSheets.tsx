import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, GitBranch, Clock, Settings, Loader2, X, Edit, Trash2 } from "lucide-react";
import { useRoutingSheets, useCreateRoutingSheet, useUpdateRoutingSheet, useDeleteRoutingSheet } from "@/hooks/useRoutingSheets";
import { RoutingSheetDialog } from "@/components/routing-sheets/RoutingSheetDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RoutingSheets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  
  const { data: routingSheets, isLoading } = useRoutingSheets();
  const createMutation = useCreateRoutingSheet();
  const updateMutation = useUpdateRoutingSheet();
  const deleteMutation = useDeleteRoutingSheet();

  const filteredSheets = routingSheets?.filter(
    (sheet) =>
      sheet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSave = async (data: any) => {
    if (selectedSheet) {
      await updateMutation.mutateAsync({ id: selectedSheet.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
    setSelectedSheet(null);
  };

  const handleEdit = (sheet: any) => {
    setSelectedSheet(sheet);
    setDialogOpen(true);
  };

  const handleDelete = (sheet: any) => {
    if (confirm(`Удалить техмаршрут "${sheet.code}"? Это действие необратимо.`)) {
      deleteMutation.mutate(sheet.id);
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case "finished":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">ГП</Badge>;
      case "assembly":
        return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">СБ</Badge>;
      case "semi-finished":
        return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20 text-xs">ПФ</Badge>;
      default:
        return null;
    }
  };

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
            onClick={() => {
              setSelectedSheet(null);
              setDialogOpen(true);
            }}
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
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Технологические маршруты не найдены" : "Нет созданных техмаршрутов"}
              </p>
              {!searchQuery && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedSheet(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать первый техмаршрут
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSheets.map((sheet) => {
              const operations = sheet.routing_operations || [];
              const totalTime = operations.reduce(
                (sum: number, op: any) => sum + (op.setup_time_minutes || 0) + (op.cycle_time_minutes || 0),
                0
              );

              return (
                <Card
                  key={sheet.id}
                  className="transition-all hover:border-primary hover:shadow-md"
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
                          <div className="flex items-center gap-2 mt-1">
                            {sheet.products && getProductTypeBadge(sheet.products.product_type)}
                            <p className="text-xs text-muted-foreground">
                              {sheet.products?.code} — {sheet.products?.name || "Не указан"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sheet)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(sheet)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          {[...operations]
                            .sort((a: any, b: any) => a.sequence - b.sequence)
                            .map((operation: any) => (
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
                                    {operation.work_centers?.name || "Участок не указан"}
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

      <RoutingSheetDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedSheet(null);
        }}
        routingSheet={selectedSheet}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};

export default RoutingSheets;
