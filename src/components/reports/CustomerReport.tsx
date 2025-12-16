import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProductionOrdersWithCustomers } from "@/hooks/useProductionOrdersWithCustomers";
import { useCustomers } from "@/hooks/useCustomers";
import { 
  Search, 
  Users, 
  Package, 
  TrendingUp, 
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  Building2
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface CustomerStats {
  customerId: string | null;
  customerName: string;
  customerCode: string;
  totalOrders: number;
  totalQuantity: number;
  completedQuantity: number;
  completionPercent: number;
  plannedOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  orders: Array<{
    id: string;
    order_number: string;
    product_name: string;
    quantity: number;
    completed_quantity: number;
    status: string;
    planned_end_date: string;
  }>;
}

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершен", variant: "outline" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

export const CustomerReport = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: orders, isLoading: ordersLoading } = useProductionOrdersWithCustomers();
  const { data: customers, isLoading: customersLoading } = useCustomers();

  const customerStats = useMemo(() => {
    if (!orders) return [];

    const statsMap = new Map<string | null, CustomerStats>();

    // Initialize with all customers
    customers?.forEach(customer => {
      statsMap.set(customer.id, {
        customerId: customer.id,
        customerName: customer.name,
        customerCode: customer.code,
        totalOrders: 0,
        totalQuantity: 0,
        completedQuantity: 0,
        completionPercent: 0,
        plannedOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        orders: [],
      });
    });

    // Add "No customer" group
    statsMap.set(null, {
      customerId: null,
      customerName: "Без клиента",
      customerCode: "-",
      totalOrders: 0,
      totalQuantity: 0,
      completedQuantity: 0,
      completionPercent: 0,
      plannedOrders: 0,
      inProgressOrders: 0,
      completedOrders: 0,
      orders: [],
    });

    // Aggregate orders
    orders.forEach(order => {
      const customerId = order.customer_id;
      let stats = statsMap.get(customerId);
      
      if (!stats && customerId) {
        // Customer from order not in customers list (edge case)
        stats = {
          customerId,
          customerName: order.customers?.name || "Неизвестный",
          customerCode: order.customers?.code || "-",
          totalOrders: 0,
          totalQuantity: 0,
          completedQuantity: 0,
          completionPercent: 0,
          plannedOrders: 0,
          inProgressOrders: 0,
          completedOrders: 0,
          orders: [],
        };
        statsMap.set(customerId, stats);
      }

      if (stats) {
        stats.totalOrders++;
        stats.totalQuantity += order.quantity;
        stats.completedQuantity += order.completed_quantity;

        if (order.status === "planned" || order.status === "released") {
          stats.plannedOrders++;
        } else if (order.status === "in_progress" || order.status === "on_hold") {
          stats.inProgressOrders++;
        } else if (order.status === "completed") {
          stats.completedOrders++;
        }

        stats.orders.push({
          id: order.id,
          order_number: order.order_number,
          product_name: order.products?.name || "N/A",
          quantity: order.quantity,
          completed_quantity: order.completed_quantity,
          status: order.status,
          planned_end_date: order.planned_end_date,
        });
      }
    });

    // Calculate completion percentages
    statsMap.forEach(stats => {
      stats.completionPercent = stats.totalQuantity > 0 
        ? (stats.completedQuantity / stats.totalQuantity) * 100 
        : 0;
    });

    return Array.from(statsMap.values())
      .filter(stats => stats.totalOrders > 0 || stats.customerId !== null)
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders, customers]);

  const filteredStats = useMemo(() => {
    return customerStats.filter(stats => {
      const matchesSearch = 
        stats.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stats.customerCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (statusFilter === "all") return matchesSearch;
      
      // Filter by having orders with specific status
      const hasMatchingOrders = stats.orders.some(order => {
        if (statusFilter === "active") {
          return ["planned", "released", "in_progress", "on_hold"].includes(order.status);
        }
        return order.status === statusFilter;
      });
      
      return matchesSearch && hasMatchingOrders;
    });
  }, [customerStats, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return filteredStats.reduce((acc, stats) => ({
      totalOrders: acc.totalOrders + stats.totalOrders,
      totalQuantity: acc.totalQuantity + stats.totalQuantity,
      completedQuantity: acc.completedQuantity + stats.completedQuantity,
      customersWithOrders: acc.customersWithOrders + (stats.totalOrders > 0 ? 1 : 0),
    }), { totalOrders: 0, totalQuantity: 0, completedQuantity: 0, customersWithOrders: 0 });
  }, [filteredStats]);

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_клиентам_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportExcel = () => {
    const summaryData = filteredStats.map(stats => ({
      "Клиент": stats.customerName,
      "Код": stats.customerCode,
      "Всего заказов": stats.totalOrders,
      "Запланировано": stats.plannedOrders,
      "В работе": stats.inProgressOrders,
      "Завершено": stats.completedOrders,
      "Количество план": stats.totalQuantity,
      "Количество факт": stats.completedQuantity,
      "Выполнение %": stats.completionPercent.toFixed(1),
    }));

    const ordersData = filteredStats.flatMap(stats => 
      stats.orders.map(order => ({
        "Клиент": stats.customerName,
        "Номер заказа": order.order_number,
        "Продукт": order.product_name,
        "Количество план": order.quantity,
        "Количество факт": order.completed_quantity,
        "Статус": statusConfig[order.status as keyof typeof statusConfig]?.label || order.status,
        "Срок": new Date(order.planned_end_date).toLocaleDateString(),
      }))
    );

    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, 
      { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка по клиентам");

    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    wsOrders["!cols"] = [
      { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 16 }, 
      { wch: 16 }, { wch: 14 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, "Заказы по клиентам");

    XLSX.writeFile(wb, `Отчет_по_клиентам_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (ordersLoading || customersLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Клиентов с заказами</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.customersWithOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Количество план</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выполнено</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.completedQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totals.totalQuantity > 0 
                ? ((totals.completedQuantity / totals.totalQuantity) * 100).toFixed(1) 
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Статус заказов" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="planned">Запланированы</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершены</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handlePrint()}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="space-y-3">
        {filteredStats.map((stats) => {
          const customerId = stats.customerId || "no-customer";
          const isExpanded = expandedCustomers.has(customerId);
          
          return (
            <Card key={customerId}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleCustomer(customerId)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">{stats.customerName}</CardTitle>
                          <p className="text-sm text-muted-foreground">{stats.customerCode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{stats.totalOrders} заказов</p>
                          <p className="text-muted-foreground">
                            {stats.completedQuantity.toLocaleString()} / {stats.totalQuantity.toLocaleString()} шт
                          </p>
                        </div>
                        <div className="w-24">
                          <Progress value={stats.completionPercent} className="h-2" />
                          <p className="text-xs text-center mt-1">{stats.completionPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 mb-4">
                      <Badge variant="secondary">Запланировано: {stats.plannedOrders}</Badge>
                      <Badge variant="default">В работе: {stats.inProgressOrders}</Badge>
                      <Badge variant="outline">Завершено: {stats.completedOrders}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер заказа</TableHead>
                          <TableHead>Продукт</TableHead>
                          <TableHead className="text-right">План</TableHead>
                          <TableHead className="text-right">Факт</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Срок</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{order.product_name}</TableCell>
                            <TableCell className="text-right">{order.quantity}</TableCell>
                            <TableCell className="text-right">{order.completed_quantity}</TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"}>
                                {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(order.planned_end_date).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {filteredStats.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет данных для отображения
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print View (hidden) */}
      <div className="hidden">
        <div ref={printRef} className="p-8">
          <h1 className="text-2xl font-bold mb-6">Отчёт по клиентам</h1>
          <p className="text-sm text-muted-foreground mb-6">Дата формирования: {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
          
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Клиент</th>
                <th className="text-right p-2">Заказов</th>
                <th className="text-right p-2">План</th>
                <th className="text-right p-2">Факт</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((stats) => (
                <tr key={stats.customerId || "no-customer"} className="border-b">
                  <td className="p-2">{stats.customerName}</td>
                  <td className="text-right p-2">{stats.totalOrders}</td>
                  <td className="text-right p-2">{stats.totalQuantity.toLocaleString()}</td>
                  <td className="text-right p-2">{stats.completedQuantity.toLocaleString()}</td>
                  <td className="text-right p-2">{stats.completionPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="p-2">Итого</td>
                <td className="text-right p-2">{totals.totalOrders}</td>
                <td className="text-right p-2">{totals.totalQuantity.toLocaleString()}</td>
                <td className="text-right p-2">{totals.completedQuantity.toLocaleString()}</td>
                <td className="text-right p-2">
                  {totals.totalQuantity > 0 
                    ? ((totals.completedQuantity / totals.totalQuantity) * 100).toFixed(1) 
                    : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
