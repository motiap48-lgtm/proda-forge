import { useState, useMemo } from "react";
import { Bell, Check, Trash2, AlertTriangle, Building2, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProductionOrdersWithCustomers } from "@/hooks/useProductionOrdersWithCustomers";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
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

export const NotificationPopover = () => {
  const navigate = useNavigate();
  const { data: orders } = useProductionOrdersWithCustomers();
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());
  const [groupByCustomer, setGroupByCustomer] = useState(true);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set(["no-customer"]));

  const overdueOrders = useMemo(() => {
    if (!orders) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders
      .filter(order => {
        if (dismissedOrders.has(order.id)) return false;
        if (order.status === "completed" || order.status === "cancelled") return false;
        
        const endDate = new Date(order.planned_end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today;
      })
      .map(order => {
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
    
    overdueOrders.forEach(order => {
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
    setDismissedOrders(prev => new Set([...prev, orderId]));
  };

  const dismissAll = () => {
    setDismissedOrders(new Set(overdueOrders.map(o => o.id)));
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

  const unreadCount = overdueOrders.length;

  const getOverdueLabel = (days: number) => {
    if (days === 1) return "1 день";
    if (days < 5) return `${days} дня`;
    return `${days} дней`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h4 className="font-semibold text-foreground">Просроченные заказы</h4>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGroupByCustomer(!groupByCustomer)}
              className="h-8 px-2 text-xs"
            >
              <Building2 className="h-3 w-3 mr-1" />
              {groupByCustomer ? "Список" : "По клиентам"}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAll}
                className="h-8 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Скрыть все
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
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
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
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
                        <p className="text-sm font-medium text-foreground">
                          {order.order_number}
                        </p>
                        <Badge variant="outline" className="text-xs text-destructive border-destructive">
                          -{getOverdueLabel(order.days_overdue)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.product_name}
                      </p>
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
      </PopoverContent>
    </Popover>
  );
};
