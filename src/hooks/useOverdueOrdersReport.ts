import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface OverdueOrderItem {
  id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  quantity: number;
  completed_quantity: number;
  remaining_quantity: number;
  planned_end_date: string;
  overdue_days: number;
  status: string;
  priority: string;
  customer_id: string | null;
  customer_name: string | null;
  work_center_id: string | null;
  work_center_name: string | null;
  department: string | null;
}

export interface CustomerOverdueGroup {
  customer_id: string | null;
  customer_name: string;
  orders: OverdueOrderItem[];
  total_orders: number;
  total_overdue_days: number;
  avg_overdue_days: number;
  total_remaining: number;
}

export const useOverdueOrdersReport = () => {
  return useQuery({
    queryKey: ["overdue-orders-report"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          planned_end_date,
          status,
          priority,
          customer_id,
          products:product_id(id, name, code, product_type),
          customers:customer_id(id, name),
          work_centers:work_center_id(id, name, department)
        `)
        .in("status", ["planned", "released", "in_progress"])
        .lt("planned_end_date", today.toISOString().split('T')[0])
        .order("planned_end_date", { ascending: true });

      if (error) throw error;

      const overdueOrders: OverdueOrderItem[] = data.map((order: any) => {
        const plannedEnd = new Date(order.planned_end_date);
        const overdueDays = differenceInDays(today, plannedEnd);
        const quantity = Number(order.quantity) || 0;
        const completedQuantity = Number(order.completed_quantity) || 0;

        return {
          id: order.id,
          order_number: order.order_number,
          product_id: order.products?.id || "",
          product_name: order.products?.name || "N/A",
          product_code: order.products?.code || "N/A",
          product_type: order.products?.product_type || "finished",
          quantity,
          completed_quantity: completedQuantity,
          remaining_quantity: quantity - completedQuantity,
          planned_end_date: order.planned_end_date,
          overdue_days: overdueDays,
          status: order.status,
          priority: order.priority,
          customer_id: order.customer_id,
          customer_name: order.customers?.name || null,
          work_center_id: order.work_centers?.id || null,
          work_center_name: order.work_centers?.name || null,
          department: order.work_centers?.department || null,
        };
      });

      // Group by customer
      const customerGroups = new Map<string, CustomerOverdueGroup>();

      overdueOrders.forEach(order => {
        const key = order.customer_id || "no_customer";
        
        if (!customerGroups.has(key)) {
          customerGroups.set(key, {
            customer_id: order.customer_id,
            customer_name: order.customer_name || "Без клиента",
            orders: [],
            total_orders: 0,
            total_overdue_days: 0,
            avg_overdue_days: 0,
            total_remaining: 0,
          });
        }

        const group = customerGroups.get(key)!;
        group.orders.push(order);
        group.total_orders += 1;
        group.total_overdue_days += order.overdue_days;
        group.total_remaining += order.remaining_quantity;
      });

      // Calculate averages
      customerGroups.forEach(group => {
        group.avg_overdue_days = group.total_orders > 0 
          ? Math.round(group.total_overdue_days / group.total_orders) 
          : 0;
        // Sort orders by overdue days desc
        group.orders.sort((a, b) => b.overdue_days - a.overdue_days);
      });

      // Convert to array and sort by total overdue days
      const groupedByCustomer = Array.from(customerGroups.values())
        .sort((a, b) => b.total_overdue_days - a.total_overdue_days);

      return {
        orders: overdueOrders,
        groupedByCustomer,
        summary: {
          totalOrders: overdueOrders.length,
          totalOverdueDays: overdueOrders.reduce((sum, o) => sum + o.overdue_days, 0),
          avgOverdueDays: overdueOrders.length > 0 
            ? Math.round(overdueOrders.reduce((sum, o) => sum + o.overdue_days, 0) / overdueOrders.length)
            : 0,
          totalRemaining: overdueOrders.reduce((sum, o) => sum + o.remaining_quantity, 0),
          customersAffected: customerGroups.size,
        }
      };
    },
  });
};
