import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Factory,
  AlertTriangle,
  CheckCircle,
  Timer,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useTimelineAnalytics, TimeGranularity } from "@/hooks/useTimelineAnalytics";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface TimelineAnalyticsProps {
  startDate?: string;
  endDate?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planned: { label: "Запланирован", color: "bg-slate-100 text-slate-700" },
  released: { label: "Выпущен", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "В работе", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Завершен", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Отменен", color: "bg-red-100 text-red-700" },
};

export const TimelineAnalytics = ({ startDate, endDate }: TimelineAnalyticsProps) => {
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const { data, isLoading } = useTimelineAnalytics(startDate, endDate, granularity);

  // Summary statistics
  const summary = useMemo(() => {
    if (!data) return null;
    
    const totalPlanned = data.timelineData.reduce((s, d) => s + d.planned, 0);
    const totalCompleted = data.timelineData.reduce((s, d) => s + d.completed, 0);
    const totalDeviation = totalCompleted - totalPlanned;
    const deviationPercent = totalPlanned > 0 ? (totalDeviation / totalPlanned) * 100 : 0;
    
    const ordersOnTime = data.orderTimings.filter(o => o.delay_days <= 0).length;
    const ordersDelayed = data.orderTimings.filter(o => o.delay_days > 0).length;
    const avgDelay = data.orderTimings.length > 0
      ? data.orderTimings.reduce((s, o) => s + Math.max(0, o.delay_days), 0) / data.orderTimings.filter(o => o.delay_days > 0).length || 0
      : 0;

    const forecastsOnTrack = data.forecasts.filter(f => f.is_on_track).length;
    const forecastsDelayed = data.forecasts.filter(f => !f.is_on_track).length;

    return {
      totalPlanned,
      totalCompleted,
      totalDeviation,
      deviationPercent,
      ordersOnTime,
      ordersDelayed,
      avgDelay,
      forecastsOnTrack,
      forecastsDelayed,
    };
  }, [data]);

  // Deviation trend data for chart
  const deviationTrendData = useMemo(() => {
    if (!data) return [];
    let cumulative = 0;
    return data.timelineData.map(d => {
      cumulative += d.deviation;
      return {
        ...d,
        cumulativeDeviation: cumulative,
      };
    });
  }, [data]);

  // Work center aggregated data
  const workCenterSummary = useMemo(() => {
    if (!data) return [];
    const wcMap = new Map<string, {
      work_center_name: string;
      work_center_code: string;
      department: string | null;
      totalPlanned: number;
      totalCompleted: number;
      periodsCount: number;
    }>();

    data.workCenterLoadData.forEach(wc => {
      if (!wcMap.has(wc.work_center_id)) {
        wcMap.set(wc.work_center_id, {
          work_center_name: wc.work_center_name,
          work_center_code: wc.work_center_code,
          department: wc.department,
          totalPlanned: 0,
          totalCompleted: 0,
          periodsCount: 0,
        });
      }
      const entry = wcMap.get(wc.work_center_id)!;
      entry.totalPlanned += wc.planned;
      entry.totalCompleted += wc.completed;
      entry.periodsCount++;
    });

    return Array.from(wcMap.entries()).map(([id, data]) => ({
      work_center_id: id,
      ...data,
      loadPercent: data.totalPlanned > 0 ? (data.totalCompleted / data.totalPlanned) * 100 : 0,
    })).sort((a, b) => b.totalPlanned - a.totalPlanned);
  }, [data]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Загрузка аналитики...
      </div>
    );
  }

  if (!data || data.timelineData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет данных для временной аналитики</p>
            <p className="text-sm mt-2">Выберите период с производственными заказами</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Granularity selector and summary */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Select value={granularity} onValueChange={(v) => setGranularity(v as TimeGranularity)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">По дням</SelectItem>
              <SelectItem value="week">По неделям</SelectItem>
              <SelectItem value="month">По месяцам</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {data.timelineData.length} периодов
          </span>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Выполнение
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalCompleted} / {summary.totalPlanned}
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                summary.deviationPercent >= 0 ? 'text-green-600' : 'text-destructive'
              }`}>
                {summary.deviationPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {summary.deviationPercent > 0 ? '+' : ''}{summary.deviationPercent.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                В срок
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.ordersOnTime}</div>
              <p className="text-sm text-muted-foreground">заказов выполнено в срок</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                С задержкой
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary.ordersDelayed}</div>
              <p className="text-sm text-muted-foreground">
                {summary.avgDelay > 0 ? `Ср. задержка: ${summary.avgDelay.toFixed(0)} дн.` : 'заказов с задержкой'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                Прогноз
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-lg font-bold text-green-600">{summary.forecastsOnTrack}</div>
                  <p className="text-xs text-muted-foreground">в плане</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-lg font-bold text-destructive">{summary.forecastsDelayed}</div>
                  <p className="text-xs text-muted-foreground">риск</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts tabs */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend" className="gap-2">
            <Activity className="h-4 w-4" />
            Тренд план/факт
          </TabsTrigger>
          <TabsTrigger value="deviation" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Динамика отклонений
          </TabsTrigger>
          <TabsTrigger value="workcenters" className="gap-2">
            <Factory className="h-4 w-4" />
            Загрузка участков
          </TabsTrigger>
          <TabsTrigger value="timing" className="gap-2">
            <Calendar className="h-4 w-4" />
            Анализ сроков
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2">
            <Timer className="h-4 w-4" />
            Прогноз
          </TabsTrigger>
        </TabsList>

        {/* Trend chart */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Тренд выполнения план/факт</CardTitle>
              <CardDescription>Сравнение плановых и фактических объёмов по периодам</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'planned' ? 'План' : 'Факт'
                    ]}
                  />
                  <Legend formatter={(value) => value === 'planned' ? 'План' : 'Факт'} />
                  <Area 
                    type="monotone" 
                    dataKey="planned" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--accent))" 
                    fill="hsl(var(--accent))" 
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deviation dynamics */}
        <TabsContent value="deviation">
          <Card>
            <CardHeader>
              <CardTitle>Динамика отклонений</CardTitle>
              <CardDescription>Накопительное отклонение факта от плана во времени</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={deviationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        deviation: 'Откл. за период',
                        cumulativeDeviation: 'Накопительное откл.',
                      };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Legend formatter={(value) => {
                    const labels: Record<string, string> = {
                      deviation: 'Отклонение за период',
                      cumulativeDeviation: 'Накопительное отклонение',
                    };
                    return labels[value] || value;
                  }} />
                  <Line 
                    type="monotone" 
                    dataKey="deviation" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeDeviation" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work center load */}
        <TabsContent value="workcenters">
          <Card>
            <CardHeader>
              <CardTitle>Загрузка производственных участков</CardTitle>
              <CardDescription>Выполнение плана по участкам за выбранный период</CardDescription>
            </CardHeader>
            <CardContent>
              {workCenterSummary.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workCenterSummary.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis 
                        dataKey="work_center_name" 
                        type="category" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11}
                        width={150}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="totalPlanned" name="План" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="totalCompleted" name="Факт" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Участок</TableHead>
                          <TableHead>Цех</TableHead>
                          <TableHead className="text-right">План</TableHead>
                          <TableHead className="text-right">Факт</TableHead>
                          <TableHead className="text-right">Выполнение</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workCenterSummary.map(wc => (
                          <TableRow key={wc.work_center_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {wc.work_center_code}
                                </Badge>
                                {wc.work_center_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {wc.department || '—'}
                            </TableCell>
                            <TableCell className="text-right">{wc.totalPlanned}</TableCell>
                            <TableCell className="text-right">{wc.totalCompleted}</TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${
                                wc.loadPercent >= 100 ? 'text-green-600' : 
                                wc.loadPercent >= 80 ? 'text-amber-600' : 'text-destructive'
                              }`}>
                                {wc.loadPercent.toFixed(0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Нет данных по участкам
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order timing analysis */}
        <TabsContent value="timing">
          <Card>
            <CardHeader>
              <CardTitle>Анализ сроков выполнения</CardTitle>
              <CardDescription>Сравнение плановых и фактических сроков по заказам</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Заказ</TableHead>
                    <TableHead>Изделие</TableHead>
                    <TableHead>План начало</TableHead>
                    <TableHead>План окончание</TableHead>
                    <TableHead>Факт начало</TableHead>
                    <TableHead>Факт окончание</TableHead>
                    <TableHead className="text-right">План, дн.</TableHead>
                    <TableHead className="text-right">Факт, дн.</TableHead>
                    <TableHead className="text-right">Задержка</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orderTimings.slice(0, 20).map(order => (
                    <TableRow key={order.order_id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.product_name}</div>
                          <div className="text-xs text-muted-foreground">{order.product_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.planned_start), 'dd.MM.yy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.planned_end), 'dd.MM.yy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.actual_start 
                          ? format(new Date(order.actual_start), 'dd.MM.yy', { locale: ru })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.actual_end 
                          ? format(new Date(order.actual_end), 'dd.MM.yy', { locale: ru })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">{order.planned_duration}</TableCell>
                      <TableCell className="text-right">
                        {order.actual_duration !== null ? order.actual_duration : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        order.delay_days > 0 ? 'text-destructive' : 
                        order.delay_days < 0 ? 'text-green-600' : ''
                      }`}>
                        {order.delay_days > 0 ? `+${order.delay_days}` : order.delay_days === 0 ? '0' : order.delay_days}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[order.status]?.color || ''}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.orderTimings.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Показано 20 из {data.orderTimings.length} заказов
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completion forecast */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Прогноз завершения</CardTitle>
              <CardDescription>Прогнозируемые даты завершения на основе текущей скорости выполнения</CardDescription>
            </CardHeader>
            <CardContent>
              {data.forecasts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Заказ</TableHead>
                      <TableHead>Изделие</TableHead>
                      <TableHead className="text-right">Выполнено</TableHead>
                      <TableHead className="text-right">Прогресс</TableHead>
                      <TableHead className="text-right">Ср. скорость</TableHead>
                      <TableHead>План. окончание</TableHead>
                      <TableHead>Прогноз</TableHead>
                      <TableHead className="text-right">Осталось, дн.</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.forecasts.map(forecast => (
                      <TableRow key={forecast.order_id}>
                        <TableCell className="font-medium">{forecast.order_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{forecast.product_name}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {forecast.completed_quantity} / {forecast.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            forecast.completion_percent >= 80 ? 'text-green-600' :
                            forecast.completion_percent >= 50 ? 'text-amber-600' : 'text-muted-foreground'
                          }`}>
                            {forecast.completion_percent.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {forecast.avg_daily_rate.toFixed(1)}/день
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(forecast.planned_end), 'dd.MM.yy', { locale: ru })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {forecast.estimated_completion_date 
                            ? format(new Date(forecast.estimated_completion_date), 'dd.MM.yy', { locale: ru })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {forecast.days_remaining !== null ? forecast.days_remaining : '—'}
                        </TableCell>
                        <TableCell>
                          {forecast.is_on_track ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              В плане
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Риск
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет заказов в работе для прогнозирования</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
