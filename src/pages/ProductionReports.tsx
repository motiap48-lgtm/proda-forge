import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionReports, useProductionSummary } from "@/hooks/useProductionReports";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingDown, TrendingUp, BarChart3, Building2, Package, Clock } from "lucide-react";
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

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  completed: { label: "Завершен", variant: "default" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

const ProductionReportsContent = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: reports, isLoading } = useProductionReports(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const { data: summary } = useProductionSummary(
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
                <CardTitle>Отчет по цехам и производственным участкам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Отчетность по цехам и производственным участкам в разработке</p>
                </div>
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
