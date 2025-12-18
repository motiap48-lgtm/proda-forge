import { useState } from "react";
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
  CalendarDays
} from "lucide-react";
import { WorkSchedulesTab } from "@/components/resource-planning/WorkSchedulesTab";
import { OperatorsTab } from "@/components/resource-planning/OperatorsTab";
import { BrigadesTab } from "@/components/resource-planning/BrigadesTab";
import { ShiftTasksTab } from "@/components/resource-planning/ShiftTasksTab";
import { ResourceGanttChart } from "@/components/resource-planning/ResourceGanttChart";
import { CalendarExceptionsTab } from "@/components/resource-planning/CalendarExceptionsTab";
import { cn } from "@/lib/utils";

const ResourcePlanning = () => {
  const [activeTab, setActiveTab] = useState("shift-tasks");
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
          <TabsList className="grid w-full grid-cols-6 mb-6">
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
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Календарь</span>
              <span className="sm:hidden">Кален.</span>
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
