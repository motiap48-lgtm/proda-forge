import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Factory, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useWorkCenters } from "@/hooks/useWorkCenters";

const WorkCenters = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: workCenters, isLoading } = useWorkCenters();

  const filteredCenters = (workCenters || []).filter(
    (center: any) =>
      center.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Активен</Badge>;
      case "maintenance":
        return <Badge variant="default">На обслуживании</Badge>;
      case "inactive":
        return <Badge variant="secondary">Неактивен</Badge>;
      default:
        return null;
    }
  };

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
            <h1 className="text-3xl font-bold text-foreground">Рабочие центры</h1>
            <p className="text-muted-foreground">
              Управление производственными участками и оборудованием
            </p>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
          >
            <Plus className="mr-2 h-5 w-5" />
            Добавить рабочий центр
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, названию или цеху..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Centers List */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCenters.map((center: any) => {
            const loadPercent = 0; // TODO: Calculate from production orders
            return (
              <Card
                key={center.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Factory className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{center.code}</h3>
                          {getStatusBadge(center.status)}
                        </div>
                        <p className="text-sm font-medium text-foreground">{center.name}</p>
                        <p className="text-xs text-muted-foreground">{center.department || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity and Load */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Загрузка</span>
                      <span className="text-sm font-bold text-green-600">
                        {loadPercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={loadPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      0 из {center.capacity_minutes_per_day} мин/день
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Эффективность</p>
                      <p className="text-sm font-bold text-foreground">{center.efficiency_percent}%</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Мощность</p>
                      <p className="text-sm font-bold text-foreground">{center.capacity_minutes_per_day} мин</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCenters.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Рабочие центры не найдены</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default WorkCenters;
