import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", warehouseFilter],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select(`
          *,
          warehouse:warehouses(name, code),
          product:products(name, code, unit)
        `)
        .order("last_updated", { ascending: false });

      if (warehouseFilter !== "all") {
        query = query.eq("warehouse_id", warehouseFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredInventory = inventory?.filter((item) =>
    item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product?.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStockStatus = (available: number) => {
    if (available <= 0) return { label: "Нет в наличии", variant: "destructive" as const };
    if (available < 100) return { label: "Низкий остаток", variant: "default" as const };
    return { label: "В наличии", variant: "outline" as const };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Управление остатками</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Учет материалов и продукции на складах
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
            >
              <Plus className="mr-2 h-5 w-5" />
              Поступление
            </Button>
            <Button variant="outline" size="lg">
              <TrendingUp className="mr-2 h-5 w-5" />
              Отчеты
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <SearchInput
                placeholder="Поиск по наименованию или коду..."
                value={searchQuery}
                onChange={setSearchQuery}
                containerClassName="flex-1"
              />
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все склады</SelectItem>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Загрузка данных...</p>
            </CardContent>
          </Card>
        ) : filteredInventory.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || warehouseFilter !== "all" 
                  ? "Материалы не найдены" 
                  : "Нет данных об остатках. Добавьте первое поступление."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInventory.map((item) => {
              const status = getStockStatus(Number(item.available_quantity) || 0);
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {item.product?.name}
                              </h3>
                              <Badge {...status}>{status.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Код: {item.product?.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Склад: {item.warehouse?.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Всего</p>
                        <p className="text-lg font-bold text-foreground">
                          {Number(item.quantity).toFixed(2)} {item.product?.unit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Зарезервировано</p>
                        <p className="text-lg font-medium text-amber-600">
                          {Number(item.reserved_quantity).toFixed(2)} {item.product?.unit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Доступно</p>
                        <p className="text-lg font-bold text-green-600">
                          {Number(item.available_quantity).toFixed(2)} {item.product?.unit}
                        </p>
                      </div>
                    </div>
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

export default Inventory;
