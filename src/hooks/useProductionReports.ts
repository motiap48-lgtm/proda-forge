import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductionReportData {
  order_number: string;
  product_name: string;
  product_code: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: string;
  work_center_name: string | null;
}

export const useProductionReports = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["production-reports", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("production_orders")
        .select(`
          order_number,
          quantity,
          completed_quantity,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          status,
          products:product_id(name, code),
          work_centers:work_center_id(name)
        `)
        .order("planned_start_date", { ascending: false });

      if (startDate) {
        query = query.gte("planned_start_date", startDate);
      }
      if (endDate) {
        query = query.lte("planned_end_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((order: any) => ({
        order_number: order.order_number,
        product_name: order.products?.name || "N/A",
        product_code: order.products?.code || "N/A",
        planned_quantity: order.quantity,
        completed_quantity: order.completed_quantity,
        deviation: order.completed_quantity - order.quantity,
        deviation_percent: order.quantity > 0 
          ? ((order.completed_quantity - order.quantity) / order.quantity) * 100 
          : 0,
        planned_start_date: order.planned_start_date,
        planned_end_date: order.planned_end_date,
        actual_start_date: order.actual_start_date,
        actual_end_date: order.actual_end_date,
        status: order.status,
        work_center_name: order.work_centers?.name || null,
      })) as ProductionReportData[];
    },
  });
};

export const useProductionSummary = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["production-summary", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("production_orders")
        .select("quantity, completed_quantity, status");

      if (startDate) {
        query = query.gte("planned_start_date", startDate);
      }
      if (endDate) {
        query = query.lte("planned_end_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalPlanned = data.reduce((sum, order) => sum + Number(order.quantity), 0);
      const totalCompleted = data.reduce((sum, order) => sum + Number(order.completed_quantity), 0);
      const totalDeviation = totalCompleted - totalPlanned;
      const deviationPercent = totalPlanned > 0 ? (totalDeviation / totalPlanned) * 100 : 0;

      const statusCounts = data.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPlanned,
        totalCompleted,
        totalDeviation,
        deviationPercent,
        statusCounts,
        totalOrders: data.length,
      };
    },
  });
};
