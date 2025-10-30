import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProductionOrders } from "@/components/dashboard/ProductionOrders";
import { ProductionChart } from "@/components/dashboard/ProductionChart";
import { Package, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useProductionOrders } from "@/hooks/useProductionOrders";

const Index = () => {
  const { data: orders } = useProductionOrders();
  
  const activeOrders = orders?.filter(o => o.status === 'in_progress' || o.status === 'released').length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const urgentOrders = orders?.filter(o => {
    const daysUntilDeadline = Math.ceil((new Date(o.planned_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 3 && o.status !== 'completed';
  }).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <main className="container py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Заказов в работе"
            value={activeOrders.toString()}
            change="+3 за неделю"
            trend="up"
            icon={Package}
            variant="default"
          />
          <MetricCard
            title="Выполнено"
            value={completedOrders.toString()}
            change="+12% к плану"
            trend="up"
            icon={TrendingUp}
            variant="accent"
          />
          <MetricCard
            title="Срочных заказов"
            value={urgentOrders.toString()}
            change="требуют внимания"
            trend={urgentOrders > 0 ? "down" : "up"}
            icon={Clock}
            variant="warning"
          />
          <MetricCard
            title="Загрузка оборудования"
            value="87%"
            change="+5% за месяц"
            trend="up"
            icon={AlertTriangle}
            variant="default"
          />
        </div>

        {/* Charts and Orders */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <ProductionChart />
          <ProductionOrders />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="group rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
            <h3 className="font-semibold text-foreground mb-2">Планирование MRP</h3>
            <p className="text-sm text-muted-foreground">
              Расчет потребности в материалах и формирование графика производства
            </p>
          </div>
          <div className="group rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
            <h3 className="font-semibold text-foreground mb-2">Диспетчеризация</h3>
            <p className="text-sm text-muted-foreground">
              Распределение заданий по рабочим центрам и контроль выработки
            </p>
          </div>
          <div className="group rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-lg cursor-pointer">
            <h3 className="font-semibold text-foreground mb-2">Учет затрат</h3>
            <p className="text-sm text-muted-foreground">
              Калькуляция себестоимости и анализ производственных расходов
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
