import { useState, useRef, useMemo } from "react";
import { useOverdueOrdersReport, CustomerOverdueGroup, OverdueOrderItem } from "@/hooks/useOverdueOrdersReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  Clock,
  Users,
  Package,
  Building2,
  Factory,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import XLSX from "@/lib/excel";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

type GroupingMode = 'customer' | 'flat';

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>;
    default:
      return null;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive" className="text-xs">Высокий</Badge>;
    case "normal":
      return <Badge variant="secondary" className="text-xs">Нормальный</Badge>;
    case "low":
      return <Badge variant="outline" className="text-xs">Низкий</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "planned":
      return <Badge variant="secondary" className="text-xs">Запланирован</Badge>;
    case "released":
      return <Badge variant="outline" className="text-xs">Выпущен</Badge>;
    case "in_progress":
      return <Badge variant="default" className="text-xs">В работе</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
};

const getOverdueSeverity = (days: number): { label: string; className: string } => {
  if (days > 14) return { label: "Критично", className: "bg-red-100 text-red-800 border-red-300" };
  if (days > 7) return { label: "Серьёзно", className: "bg-orange-100 text-orange-800 border-orange-300" };
  return { label: "Умеренно", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
};

export const OverdueOrdersReport = () => {
  const { data, isLoading } = useOverdueOrdersReport();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("customer");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [customerFilter, setCustomerFilter] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Просроченные_заказы_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [{
      "Всего просроченных заказов": data.summary.totalOrders,
      "Суммарная просрочка (дней)": data.summary.totalOverdueDays,
      "Средняя просрочка (дней)": data.summary.avgOverdueDays,
      "Остаток к выпуску": data.summary.totalRemaining,
      "Затронуто клиентов": data.summary.customersAffected,
    }];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

    // Orders sheet
    const ordersData = data.orders.map(order => ({
      "Заказ": order.order_number,
      "Изделие": order.product_name,
      "Код": order.product_code,
      "Тип": order.product_type === 'finished' ? 'ГП' : 
             order.product_type === 'assembly' ? 'СБ' : 
             order.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
      "Клиент": order.customer_name || "Без клиента",
      "План": order.quantity,
      "Выполнено": order.completed_quantity,
      "Остаток": order.remaining_quantity,
      "Дата завершения": order.planned_end_date,
      "Просрочка (дней)": order.overdue_days,
      "Статус": order.status,
      "Приоритет": order.priority,
      "Участок": order.work_center_name || "",
      "Цех": order.department || "",
    }));
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Заказы");

    // By customer sheet
    const customerData = data.groupedByCustomer.map(group => ({
      "Клиент": group.customer_name,
      "Заказов": group.total_orders,
      "Суммарная просрочка (дней)": group.total_overdue_days,
      "Средняя просрочка (дней)": group.avg_overdue_days,
      "Остаток к выпуску": group.total_remaining,
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customerData);
    XLSX.utils.book_append_sheet(wb, wsCustomers, "По клиентам");

    XLSX.writeFile(wb, `Просроченные_заказы_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

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

  const expandAll = () => {
    if (data) {
      setExpandedCustomers(new Set(data.groupedByCustomer.map(g => g.customer_id || "no_customer")));
    }
  };

  const collapseAll = () => {
    setExpandedCustomers(new Set());
  };

  // Get unique customers for filter
  const customers = useMemo(() => {
    if (!data) return [];
    return data.groupedByCustomer.map(g => ({
      id: g.customer_id || "no_customer",
      name: g.customer_name,
    }));
  }, [data]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!data) return null;

    let filteredOrders = data.orders;
    let filteredGroups = data.groupedByCustomer;

    // Filter by customer
    if (customerFilter !== "all") {
      if (customerFilter === "no_customer") {
        filteredOrders = filteredOrders.filter(o => !o.customer_id);
        filteredGroups = filteredGroups.filter(g => !g.customer_id);
      } else {
        filteredOrders = filteredOrders.filter(o => o.customer_id === customerFilter);
        filteredGroups = filteredGroups.filter(g => g.customer_id === customerFilter);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredOrders = filteredOrders.filter(o =>
        o.order_number.toLowerCase().includes(query) ||
        o.product_name.toLowerCase().includes(query) ||
        o.product_code.toLowerCase().includes(query) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
        (o.work_center_name && o.work_center_name.toLowerCase().includes(query))
      );

      filteredGroups = filteredGroups.map(g => ({
        ...g,
        orders: g.orders.filter(o =>
          o.order_number.toLowerCase().includes(query) ||
          o.product_name.toLowerCase().includes(query) ||
          o.product_code.toLowerCase().includes(query) ||
          (o.work_center_name && o.work_center_name.toLowerCase().includes(query))
        )
      })).filter(g => g.orders.length > 0);
    }

    return { orders: filteredOrders, groupedByCustomer: filteredGroups };
  }, [data, customerFilter, searchQuery]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  if (!data || data.orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Просроченных заказов нет</h3>
          <p className="text-muted-foreground">Все производственные заказы выполняются в срок</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Просроченных</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{data.summary.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Сумм. просрочка</p>
            </div>
            <p className="text-2xl font-bold">{data.summary.totalOverdueDays} дн.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ср. просрочка</p>
            </div>
            <p className="text-2xl font-bold">{data.summary.avgOverdueDays} дн.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Остаток</p>
            </div>
            <p className="text-2xl font-bold">{data.summary.totalRemaining}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Клиентов</p>
            </div>
            <p className="text-2xl font-bold">{data.summary.customersAffected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <SearchInput
          placeholder="Поиск..."
          hint="Поиск по заказу, изделию, клиенту"
          value={searchQuery}
          onChange={setSearchQuery}
          containerClassName="flex-1 min-w-[200px] max-w-sm"
        />

        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Клиент" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все клиенты</SelectItem>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupingMode} onValueChange={(v) => setGroupingMode(v as GroupingMode)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">По клиентам</SelectItem>
            <SelectItem value="flat">Общий список</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
        </div>
      </div>

      {/* Content */}
      {groupingMode === "customer" ? (
        <div className="space-y-3">
          {filteredData?.groupedByCustomer.map(group => {
            const key = group.customer_id || "no_customer";
            const isExpanded = expandedCustomers.has(key);

            return (
              <Card key={key}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCustomer(key)}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3 px-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <CardTitle className="text-base">{group.customer_name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {group.total_orders} заказов • {group.total_overdue_days} дней просрочки
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="destructive">{group.total_orders}</Badge>
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground">Ср. просрочка</div>
                            <div className="font-medium">{group.avg_overdue_days} дн.</div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Заказ</TableHead>
                            <TableHead>Изделие</TableHead>
                            <TableHead className="text-right">План</TableHead>
                            <TableHead className="text-right">Выполн.</TableHead>
                            <TableHead className="text-right">Остаток</TableHead>
                            <TableHead>Срок</TableHead>
                            <TableHead>Просрочка</TableHead>
                            <TableHead>Участок</TableHead>
                            <TableHead>Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.orders.map(order => {
                            const severity = getOverdueSeverity(order.overdue_days);
                            return (
                              <TableRow 
                                key={order.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => navigate(`/production-orders/${order.id}`)}
                              >
                                <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getProductTypeBadge(order.product_type)}
                                    <div>
                                      <div className="font-medium text-sm">{order.product_name}</div>
                                      <div className="text-xs text-muted-foreground">{order.product_code}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{order.quantity}</TableCell>
                                <TableCell className="text-right">{order.completed_quantity}</TableCell>
                                <TableCell className="text-right font-medium">{order.remaining_quantity}</TableCell>
                                <TableCell className="text-sm">
                                  {format(new Date(order.planned_end_date), "dd.MM.yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={severity.className}>
                                    {order.overdue_days} дн.
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {order.work_center_name && (
                                    <div>
                                      <div>{order.work_center_name}</div>
                                      {order.department && (
                                        <div className="text-xs text-muted-foreground">{order.department}</div>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказ</TableHead>
                  <TableHead>Изделие</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead className="text-right">План</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Просрочка</TableHead>
                  <TableHead>Участок</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.orders.map(order => {
                  const severity = getOverdueSeverity(order.overdue_days);
                  return (
                    <TableRow 
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/production-orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getProductTypeBadge(order.product_type)}
                          <span className="text-sm">{order.product_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{order.customer_name || "—"}</TableCell>
                      <TableCell className="text-right">{order.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{order.remaining_quantity}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.planned_end_date), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={severity.className}>
                          {order.overdue_days} дн.
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{order.work_center_name || "—"}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Print view */}
      <div className="hidden">
        <div ref={printRef} className="p-8 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              ОТЧЕТ ПО ПРОСРОЧЕННЫМ ЗАКАЗАМ
            </h1>
            <p style={{ fontSize: '11px', color: '#666' }}>
              Дата формирования: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}
            </p>
          </div>

          <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Сводка</h2>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td>Просроченных заказов:</td>
                  <td style={{ fontWeight: 'bold' }}>{data.summary.totalOrders}</td>
                  <td>Суммарная просрочка:</td>
                  <td style={{ fontWeight: 'bold' }}>{data.summary.totalOverdueDays} дней</td>
                </tr>
                <tr>
                  <td>Средняя просрочка:</td>
                  <td style={{ fontWeight: 'bold' }}>{data.summary.avgOverdueDays} дней</td>
                  <td>Затронуто клиентов:</td>
                  <td style={{ fontWeight: 'bold' }}>{data.summary.customersAffected}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {data.groupedByCustomer.map(group => (
            <div key={group.customer_id || "no_customer"} style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: '8px', marginBottom: '8px' }}>
                {group.customer_name} ({group.total_orders} заказов, {group.avg_overdue_days} дн. ср. просрочка)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Заказ</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Изделие</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>План</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Остаток</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Срок</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Просрочка</th>
                    <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Участок</th>
                  </tr>
                </thead>
                <tbody>
                  {group.orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{order.order_number}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{order.product_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{order.quantity}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{order.remaining_quantity}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{order.planned_end_date}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', fontWeight: 'bold', color: order.overdue_days > 7 ? '#dc2626' : '#f59e0b' }}>
                        {order.overdue_days} дн.
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{order.work_center_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ marginTop: '32px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
            <p>ERP Vostok Auto — Отчет по просроченным заказам</p>
          </div>
        </div>
      </div>
    </div>
  );
};
