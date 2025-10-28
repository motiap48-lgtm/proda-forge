import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, PackageOpen, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MaterialIssues = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: issues, isLoading } = useQuery({
    queryKey: ["material_issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_issues")
        .select(`
          *,
          production_order:production_orders(order_number),
          warehouse:warehouses(name, code),
          lines:material_issue_lines(
            *,
            product:products(name, code, unit)
          )
        `)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredIssues = issues?.filter((issue) =>
    issue.issue_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    issue.production_order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "draft":
        return { label: "Черновик", variant: "secondary" as const };
      case "issued":
        return { label: "Выдано", variant: "outline" as const };
      case "cancelled":
        return { label: "Отменено", variant: "destructive" as const };
      default:
        return { label: status, variant: "default" as const };
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
            <h1 className="text-3xl font-bold text-foreground">Выдача материалов</h1>
            <p className="text-muted-foreground">
              Документы на выдачу материалов в производство
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать выдачу
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру документа или заказу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Загрузка данных...</p>
            </CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "Документы не найдены" : "Нет документов на выдачу материалов"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const statusConfig = getStatusConfig(issue.status);
              const totalLines = issue.lines?.length || 0;

              return (
                <Card
                  key={issue.id}
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
                            <h3 className="font-semibold text-foreground">{issue.issue_number}</h3>
                            <Badge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">
                            Заказ: {issue.production_order?.order_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Склад: {issue.warehouse?.name} • Дата: {issue.issue_date}
                          </p>
                          {issue.issued_by && (
                            <p className="text-xs text-muted-foreground">
                              Выдал: {issue.issued_by}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {issue.lines && issue.lines.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <PackageOpen className="h-4 w-4 text-muted-foreground" />
                          Материалы ({totalLines}):
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {issue.lines.map((line) => (
                            <div key={line.id} className="text-sm bg-muted/50 rounded-lg p-3">
                              <p className="font-medium text-foreground">{line.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Количество: {Number(line.quantity).toFixed(2)} {line.product?.unit}
                              </p>
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

export default MaterialIssues;
