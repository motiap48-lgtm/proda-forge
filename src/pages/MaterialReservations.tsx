import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MaterialReservations = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["material_reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_reservations")
        .select(`
          *,
          production_order:production_orders(order_number, status),
          product:products(name, code, unit),
          warehouse:warehouses(name, code)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredReservations = reservations?.filter((res) =>
    res.production_order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "reserved":
        return { label: "Зарезервировано", variant: "default" as const, icon: Lock };
      case "issued":
        return { label: "Выдано", variant: "outline" as const, icon: CheckCircle2 };
      case "cancelled":
        return { label: "Отменено", variant: "destructive" as const, icon: XCircle };
      default:
        return { label: status, variant: "secondary" as const, icon: Lock };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Резервирование материалов
          </h1>
          <p className="text-muted-foreground">
            Управление резервированием материалов под производственные заказы
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по заказу или материалу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Загрузка данных...</p>
            </CardContent>
          </Card>
        ) : filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Резервирования не найдены</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map((reservation) => {
              const statusConfig = getStatusConfig(reservation.status);
              const StatusIcon = statusConfig.icon;
              const remainingQty = Number(reservation.reserved_quantity) - Number(reservation.issued_quantity);

              return (
                <Card
                  key={reservation.id}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <StatusIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {reservation.product?.name}
                              </h3>
                              <Badge variant={statusConfig.variant}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Заказ: {reservation.production_order?.order_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Склад: {reservation.warehouse?.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Зарезервировано</p>
                        <p className="text-sm font-bold text-foreground">
                          {Number(reservation.reserved_quantity).toFixed(2)} {reservation.product?.unit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Выдано</p>
                        <p className="text-sm font-medium text-green-600">
                          {Number(reservation.issued_quantity).toFixed(2)} {reservation.product?.unit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Осталось выдать</p>
                        <p className="text-sm font-bold text-amber-600">
                          {remainingQty.toFixed(2)} {reservation.product?.unit}
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

export default MaterialReservations;
