import { useState, useMemo } from "react";
import {
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  Building2,
  Clock,
  ChevronDown,
  ChevronRight,
  UserCheck,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionOrdersWithCustomers } from "@/hooks/useProductionOrdersWithCustomers";
import { useAllOperatorAbsences, ABSENCE_TYPE_LABELS } from "@/hooks/useOperatorAbsences";
import { useOperators } from "@/hooks/useResourcePlanning";
import { useAbsenceCompensations, COMPENSATION_STATUS_LABELS } from "@/hooks/useAbsenceCompensations";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, addDays, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";

interface OverdueOrder {
  id: string;
  order_number: string;
  product_name: string;
  customer_name: string | null;
  customer_id: string | null;
  planned_end_date: string;
  days_overdue: number;
}

interface CustomerGroup {
  customerId: string | null;
  customerName: string;
  orders: OverdueOrder[];
}

interface ReturningEmployee {
  id: string;
  operatorId: string;
  operatorName: string;
  absenceType: string;
  endDate: string;
  daysUntilReturn: number;
}

export const NotificationPopover = () => {
  const navigate = useNavigate();
  const { data: orders } = useProductionOrdersWithCustomers();
  const { data: absences = [] } = useAllOperatorAbsences();
  const { data: operators = [] } = useOperators();
  const { data: compensations = [] } = useAbsenceCompensations();
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());
  const [dismissedReturning, setDismissedReturning] = useState<Set<string>>(new Set());
  const [dismissedCompensations, setDismissedCompensations] = useState<Set<string>>(new Set());
  const [groupByCustomer, setGroupByCustomer] = useState(true);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set(["no-customer"]));

  // Employees returning in the next 3 days
  const returningEmployees = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = addDays(today, 3);

    return absences
      .filter((absence) => {
        if (dismissedReturning.has(absence.id)) return false;
        if (absence.status !== "approved") return false;

        const endDate = new Date(absence.end_date);
        endDate.setHours(0, 0, 0, 0);

        // Return date is the day after end_date
        const returnDate = addDays(endDate, 1);

        return returnDate >= today && returnDate <= threeDaysFromNow;
      })
      .map((absence) => {
        const endDate = new Date(absence.end_date);
        const returnDate = addDays(endDate, 1);
        const operator = operators.find((op) => op.id === absence.operator_id);

        return {
          id: absence.id,
          operatorId: absence.operator_id,
          operatorName: operator?.full_name || "Неизвестный сотрудник",
          absenceType: absence.absence_type,
          endDate: absence.end_date,
          daysUntilReturn: differenceInDays(returnDate, today),
        };
      })
      .sort((a, b) => a.daysUntilReturn - b.daysUntilReturn);
  }, [absences, operators, dismissedReturning]);

  const overdueOrders = useMemo(() => {
    if (!orders) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders
      .filter((order) => {
        if (dismissedOrders.has(order.id)) return false;
        if (order.status === "completed" || order.status === "cancelled") return false;

        const endDate = new Date(order.planned_end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today;
      })
      .map((order) => {
        const endDate = new Date(order.planned_end_date);
        const diffTime = today.getTime() - endDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: order.id,
          order_number: order.order_number,
          product_name: order.products?.name || "N/A",
          customer_name: order.customers?.name || null,
          customer_id: order.customer_id,
          planned_end_date: order.planned_end_date,
          days_overdue: diffDays,
        };
      })
      .sort((a, b) => b.days_overdue - a.days_overdue);
  }, [orders, dismissedOrders]);

  const customerGroups = useMemo(() => {
    const groups = new Map<string | null, CustomerGroup>();

    overdueOrders.forEach((order) => {
      const key = order.customer_id;
      if (!groups.has(key)) {
        groups.set(key, {
          customerId: key,
          customerName: order.customer_name || "Без клиента",
          orders: [],
        });
      }
      groups.get(key)!.orders.push(order);
    });

    return Array.from(groups.values()).sort((a, b) => b.orders.length - a.orders.length);
  }, [overdueOrders]);

  const dismissOrder = (orderId: string) => {
    setDismissedOrders((prev) => new Set([...prev, orderId]));
  };

  const dismissAll = () => {
    setDismissedOrders(new Set(overdueOrders.map((o) => o.id)));
  };

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const dismissReturning = (id: string) => {
    setDismissedReturning((prev) => new Set([...prev, id]));
  };

  const dismissCompensation = (id: string) => {
    setDismissedCompensations((prev) => new Set([...prev, id]));
  };

  // Compensations awaiting confirmation (status = partial means date has passed)
  const pendingCompensations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return compensations
      .filter((comp) => {
        if (dismissedCompensations.has(comp.id)) return false;
        if (comp.status !== "partial") return false;

        // Check for records where date has passed but not confirmed
        const hasUnconfirmedPastRecords = comp.compensation_records?.some((r) => {
          if (r.status === "confirmed") return false;
          const compDate = new Date(r.compensation_date);
          compDate.setHours(0, 0, 0, 0);
          return compDate <= today;
        });

        return hasUnconfirmedPastRecords;
      })
      .map((comp) => {
        const operator = operators.find((op) => op.id === comp.operator_id);
        const unconfirmedRecords =
          comp.compensation_records?.filter((r) => {
            if (r.status === "confirmed") return false;
            const compDate = new Date(r.compensation_date);
            compDate.setHours(0, 0, 0, 0);
            return compDate <= today;
          }) || [];

        return {
          id: comp.id,
          operatorId: comp.operator_id,
          operatorName: operator?.full_name || "Неизвестный сотрудник",
          absenceDate: comp.absence_date,
          absenceHours: comp.absence_hours,
          reason: comp.reason,
          unconfirmedRecords,
        };
      })
      .sort((a, b) => new Date(a.absenceDate).getTime() - new Date(b.absenceDate).getTime());
  }, [compensations, operators, dismissedCompensations]);

  const totalNotifications = overdueOrders.length + returningEmployees.length + pendingCompensations.length;

  const getOverdueLabel = (days: number) => {
    if (days === 1) return "1 день";
    if (days < 5) return `${days} дня`;
    return `${days} дней`;
  };

  const getReturnLabel = (days: number) => {
    if (days === 0) return "сегодня";
    if (days === 1) return "завтра";
    if (days === 2) return "послезавтра";
    return `через ${days} дня`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalNotifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[9px]"
            >
              {totalNotifications > 99 ? "99+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <Tabs defaultValue="overdue" className="w-full">
          <div className="border-b p-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="overdue" className="gap-1 text-xs px-2">
                <AlertTriangle className="h-3 w-3" />
                Просрочка
                {overdueOrders.length > 0 && (
                  <Badge variant="destructive" className="text-xs h-4 px-1 ml-0.5">
                    {overdueOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="compensations" className="gap-1 text-xs px-2">
                <ClipboardCheck className="h-3 w-3" />
                Отработка
                {pendingCompensations.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-4 px-1 ml-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {pendingCompensations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="returning" className="gap-1 text-xs px-2">
                <UserCheck className="h-3 w-3" />
                Выход
                {returningEmployees.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-4 px-1 ml-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {returningEmployees.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overdue" className="m-0">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h4 className="font-semibold text-foreground text-sm">Просроченные заказы</h4>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGroupByCustomer(!groupByCustomer)}
                  className="h-7 px-2 text-xs"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  {groupByCustomer ? "Список" : "По клиентам"}
                </Button>
                {overdueOrders.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={dismissAll} className="h-7 px-2 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Скрыть все
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="h-[350px]">
              {overdueOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Нет просроченных заказов</p>
                </div>
              ) : groupByCustomer ? (
                <div className="divide-y">
                  {customerGroups.map((group) => {
                    const groupKey = group.customerId || "no-customer";
                    const isExpanded = expandedCustomers.has(groupKey);

                    return (
                      <Collapsible key={groupKey} open={isExpanded} onOpenChange={() => toggleCustomer(groupKey)}>
                        <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{group.customerName}</span>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              {group.orders.length}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-6 pr-2 pb-2 space-y-1">
                            {group.orders.map((order) => (
                              <div
                                key={order.id}
                                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                                onClick={() => navigate(`/production-orders/${order.order_number}`)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{order.order_number}</p>
                                  <p className="text-xs text-muted-foreground truncate">{order.product_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs text-destructive border-destructive">
                                    -{getOverdueLabel(order.days_overdue)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dismissOrder(order.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y">
                  {overdueOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/production-orders/${order.order_number}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{order.order_number}</p>
                            <Badge variant="outline" className="text-xs text-destructive border-destructive">
                              -{getOverdueLabel(order.days_overdue)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{order.product_name}</p>
                          {order.customer_name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {order.customer_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Срок: {new Date(order.planned_end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissOrder(order.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="returning" className="m-0">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <h4 className="font-semibold text-foreground text-sm">Возвращение сотрудников</h4>
              </div>
              <span className="text-xs text-muted-foreground">Ближайшие 3 дня</span>
            </div>
            <ScrollArea className="h-[350px]">
              {returningEmployees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CalendarClock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Нет сотрудников, возвращающихся в ближайшие дни</p>
                </div>
              ) : (
                <div className="divide-y">
                  {returningEmployees.map((emp) => {
                    const absenceInfo = ABSENCE_TYPE_LABELS[emp.absenceType] || {
                      label: "Отсутствие",
                      icon: "📋",
                      color: "bg-gray-500",
                    };

                    return (
                      <div key={emp.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{absenceInfo.icon}</span>
                              <p className="text-sm font-medium text-foreground">{emp.operatorName}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{absenceInfo.label}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  emp.daysUntilReturn === 0
                                    ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                                    : emp.daysUntilReturn === 1
                                      ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                                      : "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20"
                                }`}
                              >
                                Выходит {getReturnLabel(emp.daysUntilReturn)}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => dismissReturning(emp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compensations" className="m-0">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-foreground text-sm">Ожидают подтверждения</h4>
              </div>
              <span className="text-xs text-muted-foreground">Отработка</span>
            </div>
            <ScrollArea className="h-[350px]">
              {pendingCompensations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Нет отработок, ожидающих подтверждения</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingCompensations.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/planning/resources")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{comp.operatorName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Отсутствие: {new Date(comp.absenceDate).toLocaleDateString("ru-RU")} ({comp.absenceHours}ч)
                          </p>
                          {comp.reason && (
                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">{comp.reason}</p>
                          )}
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {comp.unconfirmedRecords.map((record) => (
                              <Badge
                                key={record.id}
                                variant="outline"
                                className="text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20"
                              >
                                {new Date(record.compensation_date).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                • {record.hours_worked}ч
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissCompensation(comp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
