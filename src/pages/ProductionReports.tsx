import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionReports, useProductionSummary } from "@/hooks/useProductionReports";
import { useWorkCenterReports, WorkCenterReportData } from "@/hooks/useWorkCenterReports";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Building2, 
  Package, 
  Clock, 
  Factory,
  ChevronDown,
  ChevronsDown,
  ChevronsUp
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  completed: { label: "Завершен", variant: "default" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>;
    default:
      return null;
  }
};

const ProductionReportsContent = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [expandedWorkCenters, setExpandedWorkCenters] = useState<Set<string>>(new Set());

  const { data: reports, isLoading } = useProductionReports(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const { data: summary } = useProductionSummary(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const { data: workCenterReports, isLoading: wcLoading } = useWorkCenterReports(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const chartData = reports?.slice(0, 10).map((report) => ({
    name: report.order_number,
    план: report.planned_quantity,
    факт: report.completed_quantity,
  })) || [];

  const pieData = summary ? Object.entries(summary.statusCounts).map(([status, count]) => ({
    name: statusConfig[status as keyof typeof statusConfig]?.label || status,
    value: count,
  })) : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Отчеты производства</h1>
            <p className="text-muted-foreground">Аналитика и отчетность по производственным процессам</p>
          </div>
        </div>

        <Tabs defaultValue="plan-fact" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="plan-fact" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">План-факт</span>
            </TabsTrigger>
            <TabsTrigger value="work-centers" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">По цехам</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">По изделиям</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Временная</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan-fact" className="space-y-6">

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd.MM.yyyy", { locale: ru }) : "Дата начала"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd.MM.yyyy", { locale: ru }) : "Дата окончания"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Плановый объем</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalPlanned}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Фактический объем</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalCompleted}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Отклонение</CardTitle>
                {summary.totalDeviation >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalDeviation > 0 ? '+' : ''}{summary.totalDeviation}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.deviationPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>План-факт по заказам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="план" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="факт" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Распределение по статусам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Детальный отчет</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : reports && reports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер заказа</TableHead>
                    <TableHead>Изделие</TableHead>
                    <TableHead className="text-right">План</TableHead>
                    <TableHead className="text-right">Факт</TableHead>
                    <TableHead className="text-right">Отклонение</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Участок</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.order_number}>
                      <TableCell className="font-medium">{report.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.product_name}</div>
                          <div className="text-sm text-muted-foreground">{report.product_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{report.planned_quantity}</TableCell>
                      <TableCell className="text-right">{report.completed_quantity}</TableCell>
                      <TableCell className={`text-right ${report.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.deviation > 0 ? '+' : ''}{report.deviation}
                      </TableCell>
                      <TableCell className={`text-right ${report.deviation_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.deviation_percent > 0 ? '+' : ''}{report.deviation_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[report.status as keyof typeof statusConfig]?.variant || "secondary"}>
                          {statusConfig[report.status as keyof typeof statusConfig]?.label || report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{report.work_center_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="work-centers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-primary" />
                      Отчет по цехам и производственным участкам
                    </CardTitle>
                    <CardDescription>
                      Выполнение плана по цехам и участкам
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {workCenterReports && workCenterReports.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allIds = workCenterReports.map(r => r.work_center_id);
                            setExpandedWorkCenters(new Set(allIds));
                          }}
                        >
                          <ChevronsDown className="h-4 w-4 mr-1" />
                          Развернуть
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedWorkCenters(new Set())}
                        >
                          <ChevronsUp className="h-4 w-4 mr-1" />
                          Свернуть
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {wcLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : workCenterReports && workCenterReports.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      // Группируем по цехам
                      const departmentGroups = workCenterReports.reduce((acc, report) => {
                        const dept = report.department || 'Без цеха';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(report);
                        return acc;
                      }, {} as Record<string, WorkCenterReportData[]>);
                      
                      // Сортируем цеха
                      const sortedDepts = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b, "ru"));
                      
                      return sortedDepts.map((department) => {
                        const reports = departmentGroups[department];
                        // Сортируем участки внутри цеха
                        reports.sort((a, b) => a.work_center_name.localeCompare(b.work_center_name, "ru"));
                        
                        // Суммируем по цеху
                        const deptTotalPlanned = reports.reduce((s, r) => s + r.total_planned, 0);
                        const deptTotalCompleted = reports.reduce((s, r) => s + r.total_completed, 0);
                        const deptCompletionPercent = deptTotalPlanned > 0 
                          ? (deptTotalCompleted / deptTotalPlanned) * 100 
                          : 0;
                        
                        return (
                          <div key={department} className="space-y-3">
                            {/* Заголовок цеха */}
                            <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Factory className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-foreground">{department}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Участков: {reports.length} | Заказов: {reports.reduce((s, r) => s + r.items.length, 0)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground">План</p>
                                    <p className="font-semibold">{deptTotalPlanned}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Факт</p>
                                    <p className="font-semibold">{deptTotalCompleted}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Выполнение</p>
                                    <p className={`font-bold ${deptCompletionPercent >= 100 ? 'text-green-600' : deptCompletionPercent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {deptCompletionPercent.toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Участки в цехе */}
                            <div className="space-y-2 pl-4">
                              {reports.map((report) => {
                                const isExpanded = expandedWorkCenters.has(report.work_center_id);
                                return (
                                  <Collapsible 
                                    key={report.work_center_id} 
                                    open={isExpanded}
                                    onOpenChange={(open) => {
                                      setExpandedWorkCenters(prev => {
                                        const next = new Set(prev);
                                        if (open) {
                                          next.add(report.work_center_id);
                                        } else {
                                          next.delete(report.work_center_id);
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <Card className="border-2 border-l-4 border-l-primary">
                                      <CollapsibleTrigger asChild>
                                        <CardHeader className="bg-muted/50 py-3 cursor-pointer hover:bg-muted/70 transition-colors">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                              <div>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                  <Building2 className="h-4 w-4" />
                                                  {report.work_center_name}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                  Код: {report.work_center_code} | Продукция: {report.products?.length || 0} | Заказов: {report.items.length}
                                                </CardDescription>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                              <div className="text-right">
                                                <p className="text-xs text-muted-foreground">План</p>
                                                <p className="font-semibold">{report.total_planned}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Факт</p>
                                                <p className="font-semibold">{report.total_completed}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Отклонение</p>
                                                <p className={`font-semibold ${report.total_deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                  {report.total_deviation > 0 ? '+' : ''}{report.total_deviation}
                                                </p>
                                              </div>
                                              <div className="w-24">
                                                <p className="text-xs text-muted-foreground mb-1">Выполнение</p>
                                                <div className="flex items-center gap-2">
                                                  <Progress 
                                                    value={Math.min(report.completion_percent, 100)} 
                                                    className="h-2"
                                                  />
                                                  <span className={`text-xs font-bold ${report.completion_percent >= 100 ? 'text-green-600' : report.completion_percent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {report.completion_percent.toFixed(0)}%
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </CardHeader>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <CardContent className="pt-3 pb-3 space-y-4">
                                          {/* Выпускаемая продукция */}
                                          {report.products && report.products.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                                Выпускаемая продукция ({report.products.length})
                                              </h4>
                                              <div className="flex flex-wrap gap-2">
                                                {report.products.map((product) => (
                                                  <div 
                                                    key={product.product_id}
                                                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm"
                                                  >
                                                    {getProductTypeBadge(product.product_type)}
                                                    <div>
                                                      <p className="font-medium">{product.product_name}</p>
                                                      <p className="text-xs text-muted-foreground">{product.product_code}</p>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Производственные заказы */}
                                          {report.items.length > 0 ? (
                                            <div>
                                              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                                Производственные заказы ({report.items.length})
                                              </h4>
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Заказ</TableHead>
                                                    <TableHead>Изделие</TableHead>
                                                    <TableHead className="text-right">План</TableHead>
                                                    <TableHead className="text-right">Факт</TableHead>
                                                    <TableHead className="text-right">Откл.</TableHead>
                                                    <TableHead className="text-right">%</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {report.items.map((item, idx) => (
                                                    <TableRow key={`${item.order_number}-${idx}`}>
                                                      <TableCell className="font-medium">{item.order_number}</TableCell>
                                                      <TableCell>
                                                        <div className="flex items-center gap-2">
                                                          {getProductTypeBadge(item.product_type)}
                                                          <div>
                                                            <p className="font-medium">{item.product_name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                                          </div>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell className="text-right">{item.planned_quantity}</TableCell>
                                                      <TableCell className="text-right">{item.completed_quantity}</TableCell>
                                                      <TableCell className={`text-right ${item.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.deviation > 0 ? '+' : ''}{item.deviation}
                                                      </TableCell>
                                                      <TableCell className={`text-right ${item.deviation_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.deviation_percent > 0 ? '+' : ''}{item.deviation_percent.toFixed(1)}%
                                                      </TableCell>
                                                      <TableCell>
                                                        <Badge variant={statusConfig[item.status as keyof typeof statusConfig]?.variant || "secondary"}>
                                                          {statusConfig[item.status as keyof typeof statusConfig]?.label || item.status}
                                                        </Badge>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">Нет активных заказов</p>
                                          )}
                                        </CardContent>
                                      </CollapsibleContent>
                                    </Card>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет данных для отображения</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Отчет по изделиям</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Отчетность по изделиям в разработке</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Временная аналитика</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Временная аналитика в разработке</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ProductionReports = () => {
  return (
    <ProtectedRoute>
      <ProductionReportsContent />
    </ProtectedRoute>
  );
};

export default ProductionReports;
