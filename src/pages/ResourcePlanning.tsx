import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, UsersRound, Clock } from "lucide-react";
import { WorkSchedulesTab } from "@/components/resource-planning/WorkSchedulesTab";
import { OperatorsTab } from "@/components/resource-planning/OperatorsTab";
import { BrigadesTab } from "@/components/resource-planning/BrigadesTab";

const ResourcePlanning = () => {
  const [activeTab, setActiveTab] = useState("schedules");

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
            Управление графиками работы, операторами и бригадами
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Графики работы</span>
              <span className="sm:hidden">Графики</span>
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Операторы</span>
              <span className="sm:hidden">Операторы</span>
            </TabsTrigger>
            <TabsTrigger value="brigades" className="flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              <span className="hidden sm:inline">Бригады</span>
              <span className="sm:hidden">Бригады</span>
            </TabsTrigger>
          </TabsList>

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
