import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProductionOrders } from "@/components/dashboard/ProductionOrders";
import { Package, Clock, TrendingUp } from "lucide-react";
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
      
      <main className="container py-4 sm:py-6 lg:py-8">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
          <MetricCard
            title="Заказов в работе"
            value={activeOrders.toString()}
            icon={Package}
            variant="default"
          />
          <MetricCard
            title="Выполнено"
            value={completedOrders.toString()}
            icon={TrendingUp}
            variant="accent"
          />
          <MetricCard
            title="Срочных заказов"
            value={urgentOrders.toString()}
            icon={Clock}
            variant="warning"
          />
        </div>

        <ProductionOrders />
      </main>
    </div>
  );
};

export default Index;
