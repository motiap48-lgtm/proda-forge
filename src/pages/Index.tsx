import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrdersWithCustomers } from "@/hooks/useProductionOrdersWithCustomers";
import { DashboardFilters, GroupBy, DateFilter } from "@/components/dashboard/DashboardFilters";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { GroupedOrdersList } from "@/components/dashboard/GroupedOrdersList";

const STORAGE_KEY = "dashboard-filters";

const Index = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useProductionOrdersWithCustomers();

  // Load filters from localStorage
  const loadFilters = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const savedFilters = loadFilters();

  const [groupBy, setGroupBy] = useState<GroupBy>(savedFilters.groupBy || "none");
  const [dateFilter, setDateFilter] = useState<DateFilter>(savedFilters.dateFilter || "all");
  const [customerFilter, setCustomerFilter] = useState(savedFilters.customerFilter || "all");
  const [productFilter, setProductFilter] = useState(savedFilters.productFilter || "all");
  const [priorityFilter, setPriorityFilter] = useState(savedFilters.priorityFilter || "all");
  const [statusFilter, setStatusFilter] = useState(savedFilters.statusFilter || "all");

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groupBy,
      dateFilter,
      customerFilter,
      productFilter,
      priorityFilter,
      statusFilter,
    }));
  }, [groupBy, dateFilter, customerFilter, productFilter, priorityFilter, statusFilter]);

  const hasActiveFilters = useMemo(() => {
    return (
      groupBy !== "none" ||
      dateFilter !== "all" ||
      customerFilter !== "all" ||
      productFilter !== "all" ||
      priorityFilter !== "all" ||
      statusFilter !== "all"
    );
  }, [groupBy, dateFilter, customerFilter, productFilter, priorityFilter, statusFilter]);

  const resetFilters = () => {
    setGroupBy("none");
    setDateFilter("all");
    setCustomerFilter("all");
    setProductFilter("all");
    setPriorityFilter("all");
    setStatusFilter("all");
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const todayEnd = today + 24 * 60 * 60 * 1000;
    const weekLater = today + 7 * 24 * 60 * 60 * 1000;
    const monthLater = today + 30 * 24 * 60 * 60 * 1000;

    return orders.filter((order) => {
      // Exclude completed and cancelled unless specifically filtered
      if (statusFilter === "all") {
        if (order.status === "completed" || order.status === "cancelled") {
          return false;
        }
      } else if (order.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const deadline = new Date(order.planned_end_date).getTime();
        switch (dateFilter) {
          case "overdue":
            if (deadline >= today) return false;
            break;
          case "today":
            if (deadline < today || deadline >= todayEnd) return false;
            break;
          case "week":
            if (deadline < today || deadline > weekLater) return false;
            break;
          case "month":
            if (deadline < today || deadline > monthLater) return false;
            break;
        }
      }

      // Customer filter
      if (customerFilter !== "all") {
        if (customerFilter === "none") {
          if (order.customer_id) return false;
        } else {
          if (order.customer_id !== customerFilter) return false;
        }
      }

      // Product filter
      if (productFilter !== "all" && order.product_id !== productFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && order.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [orders, dateFilter, customerFilter, productFilter, priorityFilter, statusFilter]);

  // Metrics calculations
  const metrics = useMemo(() => {
    if (!orders) {
      return {
        totalOrders: 0,
        activeOrders: 0,
        completedOrders: 0,
        overdueOrders: 0,
        onTimeOrders: 0,
        customersWithOrders: 0,
        totalQuantity: 0,
        completedQuantity: 0,
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const activeOrders = orders.filter(
      (o) => o.status !== "completed" && o.status !== "cancelled"
    );
    const completedOrders = orders.filter((o) => o.status === "completed");
    const overdueOrders = activeOrders.filter(
      (o) => new Date(o.planned_end_date).getTime() < now.getTime()
    );
    const onTimeOrders = activeOrders.filter(
      (o) => new Date(o.planned_end_date).getTime() >= now.getTime()
    );

    const uniqueCustomers = new Set(
      activeOrders.filter((o) => o.customer_id).map((o) => o.customer_id)
    );

    const totalQuantity = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
    const completedQuantity = activeOrders.reduce(
      (sum, o) => sum + o.completed_quantity,
      0
    );

    return {
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      overdueOrders: overdueOrders.length,
      onTimeOrders: onTimeOrders.length,
      customersWithOrders: uniqueCustomers.size,
      totalQuantity,
      completedQuantity,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Производственная панель
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Обзор производственных заказов и метрик
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-primary-glow"
            onClick={() => navigate("/production-orders/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новый заказ
          </Button>
        </div>

        {/* Metrics */}
        <DashboardMetrics {...metrics} isLoading={isLoading} />

        {/* Filters */}
        <DashboardFilters
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customerFilter={customerFilter}
          onCustomerFilterChange={setCustomerFilter}
          productFilter={productFilter}
          onProductFilterChange={setProductFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Orders List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка заказов...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет заказов по выбранным фильтрам
          </div>
        ) : (
          <GroupedOrdersList orders={filteredOrders} groupBy={groupBy} />
        )}
      </main>
    </div>
  );
};

export default Index;
