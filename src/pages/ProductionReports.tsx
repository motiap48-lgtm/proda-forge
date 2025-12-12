import { useState, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionReports, useProductionSummary } from "@/hooks/useProductionReports";
import { useWorkCenterReports, WorkCenterReportData, WorkCenterProductItem } from "@/hooks/useWorkCenterReports";
import { useProductOperationsReport, ProductReportItem } from "@/hooks/useProductOperationsReport";
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
  ChevronsUp,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { useReactToPrint } from "react-to-print";
import { exportWorkCenterReportsToExcel, sortProductsByField } from "@/components/reports/WorkCenterReportExport";
import { WorkCenterReportPrintView } from "@/components/reports/WorkCenterReportPrintView";
import { ProductOperationsReport } from "@/components/reports/ProductOperationsReport";
import { TimelineAnalytics } from "@/components/reports/TimelineAnalytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const [sortField, setSortField] = useState<'name' | 'code' | 'type' | 'planned' | 'completed' | 'deviation'>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [printWorkCenterId, setPrintWorkCenterId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_цехам_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportExcel = () => {
    if (workCenterReports) {
      exportWorkCenterReportsToExcel(
        workCenterReports,
        startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate ? format(endDate, "yyyy-MM-dd") : undefined
      );
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortProducts = (products: WorkCenterProductItem[]) => {
    return sortProductsByField(products, sortField, sortDirection);
  };

  const groupProductsByType = (products: WorkCenterProductItem[]) => {
    const sorted = sortProducts(products);
    return {
      finished: sorted.filter(p => p.product_type === 'finished'),
      assembly: sorted.filter(p => p.product_type === 'assembly'),
      'semi-finished': sorted.filter(p => p.product_type === 'semi-finished'),
    };
  };

  // Фильтрация отчётов по поисковому запросу
  const filterReportsBySearch = (reports: WorkCenterReportData[]): WorkCenterReportData[] => {
    if (!searchQuery.trim()) return reports;
    
    const query = searchQuery.toLowerCase().trim();
    
    return reports.map(report => {
      // Проверяем совпадение по участку или цеху
      const matchesWorkCenter = 
        report.work_center_name.toLowerCase().includes(query) ||
        report.work_center_code.toLowerCase().includes(query) ||
        (report.department && report.department.toLowerCase().includes(query));
      
      // Фильтруем продукцию
      const filteredProducts = report.products?.filter(product => 
        product.product_name.toLowerCase().includes(query) ||
        product.product_code.toLowerCase().includes(query)
      ) || [];
      
      // Если участок совпадает - показываем всю его продукцию
      // Если нет - показываем только совпавшую продукцию
      if (matchesWorkCenter) {
        return report;
      } else if (filteredProducts.length > 0) {
        return { ...report, products: filteredProducts };
      }
      return null;
    }).filter((r): r is WorkCenterReportData => r !== null);
  };

  const filteredWorkCenterReports = workCenterReports ? filterReportsBySearch(workCenterReports) : [];

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
            {/* Скрытый компонент для печати */}
            <div className="hidden">
              <WorkCenterReportPrintView 
                ref={printRef}
                reports={workCenterReports || []}
                singleWorkCenterId={printWorkCenterId}
                startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
                endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-primary" />
                      Отчет по цехам и производственным участкам
                    </CardTitle>
                    <CardDescription>
                      Выполнение плана по цехам и участкам с полной разузловкой
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {workCenterReports && workCenterReports.length > 0 && (
                      <>
                        {/* Кнопка экспорта в Excel */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportExcel}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-1" />
                          Excel
                        </Button>

                        {/* Меню печати */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Printer className="h-4 w-4 mr-1" />
                              Печать
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setPrintWorkCenterId(undefined);
                              setTimeout(() => handlePrint(), 100);
                            }}>
                              Все участки
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {workCenterReports.map(report => (
                              <DropdownMenuItem 
                                key={report.work_center_id}
                                onClick={() => {
                                  setPrintWorkCenterId(report.work_center_id);
                                  setTimeout(() => handlePrint(), 100);
                                }}
                              >
                                {report.work_center_name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Меню сортировки */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <ArrowUpDown className="h-4 w-4 mr-1" />
                              Сортировка
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSort('type')}>
                              По типу {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('name')}>
                              По названию {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('code')}>
                              По коду {sortField === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSort('planned')}>
                              По плану {sortField === 'planned' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('completed')}>
                              По факту {sortField === 'completed' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSort('deviation')}>
                              По отклонению {sortField === 'deviation' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

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
                {/* Поле поиска */}
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по цеху, участку или продукции..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Найдено участков: {filteredWorkCenterReports.length} из {workCenterReports?.length || 0}
                    </p>
                  )}
                </div>

                {wcLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : filteredWorkCenterReports.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      // Группируем по цехам
                      const departmentGroups = filteredWorkCenterReports.reduce((acc, report) => {
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
                                          {/* Выпускаемая продукция по типам */}
                                          {report.products && report.products.length > 0 && (
                                            <div className="space-y-4">
                                              {(() => {
                                                const grouped = groupProductsByType(report.products);
                                                const typeLabels = {
                                                  finished: { label: 'Готовая продукция', color: 'bg-blue-50 border-blue-200' },
                                                  assembly: { label: 'Сборочные узлы', color: 'bg-purple-50 border-purple-200' },
                                                  'semi-finished': { label: 'Полуфабрикаты', color: 'bg-orange-50 border-orange-200' },
                                                };
                                                
                                                return (['finished', 'assembly', 'semi-finished'] as const).map(type => {
                                                  const products = grouped[type];
                                                  if (products.length === 0) return null;
                                                  
                                                  const typeInfo = typeLabels[type];
                                                  const typeTotalPlanned = products.reduce((s, p) => s + p.planned_quantity, 0);
                                                  const typeTotalCompleted = products.reduce((s, p) => s + p.completed_quantity, 0);
                                                  
                                                  return (
                                                    <div key={type} className={`rounded-lg border ${typeInfo.color} p-3`}>
                                                      <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                                          {getProductTypeBadge(type)}
                                                          <span>{typeInfo.label} ({products.length})</span>
                                                        </h4>
                                                        <div className="text-xs text-muted-foreground flex gap-3">
                                                          <span>План: <strong>{typeTotalPlanned}</strong></span>
                                                          <span>Факт: <strong>{typeTotalCompleted}</strong></span>
                                                        </div>
                                                      </div>
                                                      <Table>
                                                        <TableHeader>
                                                          <TableRow>
                                                            <TableHead 
                                                              className="cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleSort('code')}
                                                            >
                                                              <div className="flex items-center">
                                                                Код {getSortIcon('code')}
                                                              </div>
                                                            </TableHead>
                                                            <TableHead 
                                                              className="cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleSort('name')}
                                                            >
                                                              <div className="flex items-center">
                                                                Наименование {getSortIcon('name')}
                                                              </div>
                                                            </TableHead>
                                                            <TableHead 
                                                              className="text-right cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleSort('planned')}
                                                            >
                                                              <div className="flex items-center justify-end">
                                                                План {getSortIcon('planned')}
                                                              </div>
                                                            </TableHead>
                                                            <TableHead 
                                                              className="text-right cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleSort('completed')}
                                                            >
                                                              <div className="flex items-center justify-end">
                                                                Факт {getSortIcon('completed')}
                                                              </div>
                                                            </TableHead>
                                                            <TableHead 
                                                              className="text-right cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleSort('deviation')}
                                                            >
                                                              <div className="flex items-center justify-end">
                                                                Откл. {getSortIcon('deviation')}
                                                              </div>
                                                            </TableHead>
                                                            <TableHead className="text-right">%</TableHead>
                                                          </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                          {products.map((product) => (
                                                            <TableRow key={product.product_id}>
                                                              <TableCell className="font-mono text-xs">
                                                                {product.product_code}
                                                              </TableCell>
                                                              <TableCell>
                                                                <p className="font-medium">{product.product_name}</p>
                                                              </TableCell>
                                                              <TableCell className="text-right">{product.planned_quantity}</TableCell>
                                                              <TableCell className="text-right">{product.completed_quantity}</TableCell>
                                                              <TableCell className={`text-right ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {product.deviation > 0 ? '+' : ''}{product.deviation}
                                                              </TableCell>
                                                              <TableCell className={`text-right ${product.deviation_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {product.deviation_percent > 0 ? '+' : ''}{product.deviation_percent.toFixed(1)}%
                                                              </TableCell>
                                                            </TableRow>
                                                          ))}
                                                        </TableBody>
                                                      </Table>
                                                    </div>
                                                  );
                                                });
                                              })()}
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
                    {searchQuery ? (
                      <p>По запросу "{searchQuery}" ничего не найдено</p>
                    ) : (
                      <p>Нет данных для отображения</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductOperationsReport 
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <TimelineAnalytics 
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
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
