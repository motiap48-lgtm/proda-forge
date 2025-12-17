import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UsersRound, Clock, CalendarClock, BarChart3 } from "lucide-react";
import { WorkSchedulesTab } from "@/components/resource-planning/WorkSchedulesTab";
import { OperatorsTab } from "@/components/resource-planning/OperatorsTab";
import { BrigadesTab } from "@/components/resource-planning/BrigadesTab";
import { ShiftTasksTab } from "@/components/resource-planning/ShiftTasksTab";
import { ResourceGanttChart } from "@/components/resource-planning/ResourceGanttChart";

const ResourcePlanning = () => {
  const [activeTab, setActiveTab] = useState("shift-tasks");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ресурсное планирование
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Сменно-суточные задания, управление ресурсами и визуализация загрузки
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="shift-tasks" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              <span className="hidden sm:inline">ССЗ</span>
              <span className="sm:hidden">ССЗ</span>
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Загрузка</span>
              <span className="sm:hidden">Ганта</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Графики</span>
              <span className="sm:hidden">Графики</span>
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Операторы</span>
              <span className="sm:hidden">Опер.</span>
            </TabsTrigger>
            <TabsTrigger value="brigades" className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              <span className="hidden sm:inline">Бригады</span>
              <span className="sm:hidden">Бриг.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shift-tasks">
            <ShiftTasksTab />
          </TabsContent>

          <TabsContent value="gantt">
            <ResourceGanttChart />
          </TabsContent>

          <TabsContent value="schedules">
            <WorkSchedulesTab />
          </TabsContent>

          <TabsContent value="operators">
            <OperatorsTab />
          </TabsContent>

          <TabsContent value="brigades">
            <BrigadesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ResourcePlanning;
