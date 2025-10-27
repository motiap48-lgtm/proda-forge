import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Factory, Users, Calendar, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockWorkCenters = [
  {
    id: "WC-001",
    name: "Участок резки металла",
    department: "Цех №1",
    capacity: 480,
    current_load: 360,
    efficiency: 85,
    status: "active",
    equipment: ["Гильотина ГН-3", "Плазморез CNC"],
    workers: 4,
    shift: "2 смены",
  },
  {
    id: "WC-002",
    name: "Участок механообработки",
    department: "Цех №1",
    capacity: 960,
    current_load: 840,
    efficiency: 92,
    status: "active",
    equipment: ["Токарный станок 16К20", "Фрезерный станок 6Р12", "Сверлильный станок 2Н135"],
    workers: 8,
    shift: "3 смены",
  },
  {
    id: "WC-003",
    name: "Участок сварки",
    department: "Цех №2",
    capacity: 480,
    current_load: 120,
    efficiency: 78,
    status: "active",
    equipment: ["Сварочный аппарат MIG/MAG", "Полуавтомат TIG"],
    workers: 3,
    shift: "2 смены",
  },
  {
    id: "WC-004",
    name: "Участок покраски",
    department: "Цех №3",
    capacity: 240,
    current_load: 0,
    efficiency: 0,
    status: "maintenance",
    equipment: ["Камера порошковой покраски"],
    workers: 2,
    shift: "1 смена",
  },
];

const WorkCenters = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCenters = mockWorkCenters.filter(
    (center) =>
      center.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      center.department.toLowerCase().includes(searchQuery.toLowerCase())
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

  const getLoadColor = (loadPercent: number) => {
    if (loadPercent >= 90) return "text-red-600";
    if (loadPercent >= 75) return "text-amber-600";
    return "text-green-600";
  };

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
          {filteredCenters.map((center) => {
            const loadPercent = (center.current_load / center.capacity) * 100;
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
                          <h3 className="font-semibold text-foreground">{center.id}</h3>
                          {getStatusBadge(center.status)}
                        </div>
                        <p className="text-sm font-medium text-foreground">{center.name}</p>
                        <p className="text-xs text-muted-foreground">{center.department}</p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity and Load */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Загрузка</span>
                      <span className={`text-sm font-bold ${getLoadColor(loadPercent)}`}>
                        {loadPercent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={loadPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {center.current_load} из {center.capacity} мин/день
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Эффективность</p>
                      <p className="text-sm font-bold text-foreground">{center.efficiency}%</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Рабочих</p>
                      <p className="text-sm font-bold text-foreground">{center.workers}</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Режим</p>
                      <p className="text-sm font-bold text-foreground">{center.shift}</p>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Оборудование:</p>
                    <div className="flex flex-wrap gap-1">
                      {center.equipment.map((eq, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
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
