 import { useState } from "react";
 import { useTabPersistence } from "@/hooks/useTabPersistence";
 import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  UsersRound, 
  Clock, 
  CalendarClock, 
  BarChart3, 
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  CalendarDays,
  FileBarChart,
  Timer
} from "lucide-react";
import { WorkSchedulesTab } from "@/components/resource-planning/WorkSchedulesTab";
import { OperatorsTab } from "@/components/resource-planning/OperatorsTab";
import { BrigadesTab } from "@/components/resource-planning/BrigadesTab";
import { ShiftTasksTab } from "@/components/resource-planning/ShiftTasksTab";
import { ResourceGanttChart } from "@/components/resource-planning/ResourceGanttChart";
import { CalendarExceptionsTab } from "@/components/resource-planning/CalendarExceptionsTab";
import { OperatorHoursReport } from "@/components/resource-planning/OperatorHoursReport";
import { OvertimeEntriesTab } from "@/components/resource-planning/OvertimeEntriesTab";
import { cn } from "@/lib/utils";

 const ResourcePlanning = () => {
   const [activeTab, setActiveTab] = useTabPersistence("shift-tasks");
   const [helpOpen, setHelpOpen] = useState(false);

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

        {/* Collapsible help section */}
        <Collapsible open={helpOpen} onOpenChange={setHelpOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HelpCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Как использовать ресурсное планирование?</h3>
                    <p className="text-sm text-muted-foreground">
                      Пошаговое руководство по настройке и работе с системой
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  helpOpen && "rotate-180"
                )} />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <Card className="mt-2 border-primary/20">
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Step 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        1
                      </div>
                      <h4 className="font-semibold">Настройте графики работы</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Создайте график 2/2 или 5/2
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Добавьте смены (дневная/ночная)
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Укажите перерывы (обед, регламентированные)
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        2
                      </div>
                      <h4 className="font-semibold">Заведите операторов</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Добавьте всех операторов станков
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Привяжите к участкам по умолчанию
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Укажите навыки и квалификацию
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        3
                      </div>
                      <h4 className="font-semibold">Создайте бригады</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Объедините сборщиков в бригады
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Назначьте бригадира (лидера)
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Укажите коэффициент производительности
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        4
                      </div>
                      <h4 className="font-semibold">Назначьте задания (ССЗ)</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Выберите дату и смену
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Назначьте оператора или бригаду
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Выберите операцию из заказа
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        5
                      </div>
                      <h4 className="font-semibold">Контролируйте загрузку</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Просматривайте диаграмму Ганта
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Анализируйте загрузку по дням/неделям
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        Выявляйте перегрузки и простои
                      </p>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <h4 className="font-semibold">Полезные советы</h4>
                    </div>
                    <div className="pl-10 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        Операторы на станках — индивидуально
                      </p>
                      <p className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        Сборщики — объединяйте в бригады
                      </p>
                      <p className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        Состав бригад можно менять гибко
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-8">
              <TabsTrigger value="shift-tasks" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <CalendarClock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">ССЗ</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Загрузка</span>
                <span className="text-xs sm:hidden">Ганта</span>
              </TabsTrigger>
              <TabsTrigger value="hours-report" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <FileBarChart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Часы</span>
              </TabsTrigger>
              <TabsTrigger value="overtime" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Переработки</span>
                <span className="text-xs sm:hidden">Сверх.</span>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Графики</span>
                <span className="text-xs sm:hidden">Граф.</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Календарь</span>
                <span className="text-xs sm:hidden">Кал.</span>
              </TabsTrigger>
              <TabsTrigger value="operators" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Операторы</span>
                <span className="text-xs sm:hidden">Опер.</span>
              </TabsTrigger>
              <TabsTrigger value="brigades" className="flex items-center gap-1.5 px-2 sm:px-3 whitespace-nowrap">
                <UsersRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm hidden sm:inline">Бригады</span>
                <span className="text-xs sm:hidden">Бриг.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="shift-tasks">
            <ShiftTasksTab />
          </TabsContent>

          <TabsContent value="gantt">
            <ResourceGanttChart />
          </TabsContent>

          <TabsContent value="hours-report">
            <OperatorHoursReport />
          </TabsContent>

          <TabsContent value="overtime">
            <OvertimeEntriesTab />
          </TabsContent>

          <TabsContent value="schedules">
            <WorkSchedulesTab />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarExceptionsTab />
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
