import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkCenterReportItem {
  order_number: string;
  product_name: string;
  product_code: string;
  product_type: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
  status: string;
}

export interface WorkCenterReportData {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  items: WorkCenterReportItem[];
  total_planned: number;
  total_completed: number;
  total_deviation: number;
  completion_percent: number;
}

export const useWorkCenterReports = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["work-center-reports", startDate, endDate],
    queryFn: async () => {
      // Получаем все производственные заказы с участками
      let query = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          status,
          work_center_id,
          products:product_id(name, code, product_type),
          work_centers:work_center_id(id, code, name, department)
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

      // Группируем по участкам
      const workCenterMap = new Map<string, WorkCenterReportData>();

      data.forEach((order: any) => {
        const wcId = order.work_center_id || "unassigned";
        const wcName = order.work_centers?.name || "Без участка";
        const wcCode = order.work_centers?.code || "-";
        const department = order.work_centers?.department || "Без цеха";

        if (!workCenterMap.has(wcId)) {
          workCenterMap.set(wcId, {
            work_center_id: wcId,
            work_center_code: wcCode,
            work_center_name: wcName,
            department: department,
            items: [],
            total_planned: 0,
            total_completed: 0,
            total_deviation: 0,
            completion_percent: 0,
          });
        }

        const wcData = workCenterMap.get(wcId)!;
        const planned = Number(order.quantity);
        const completed = Number(order.completed_quantity);
        const deviation = completed - planned;
        const deviationPercent = planned > 0 ? (deviation / planned) * 100 : 0;

        wcData.items.push({
          order_number: order.order_number,
          product_name: order.products?.name || "N/A",
          product_code: order.products?.code || "N/A",
          product_type: order.products?.product_type || "material",
          planned_quantity: planned,
          completed_quantity: completed,
          deviation: deviation,
          deviation_percent: deviationPercent,
          status: order.status,
        });

        wcData.total_planned += planned;
        wcData.total_completed += completed;
      });

      // Вычисляем итоговые показатели
      const result: WorkCenterReportData[] = [];
      workCenterMap.forEach((wc) => {
        wc.total_deviation = wc.total_completed - wc.total_planned;
        wc.completion_percent = wc.total_planned > 0 
          ? (wc.total_completed / wc.total_planned) * 100 
          : 0;
        result.push(wc);
      });

      // Сортируем по цехам, потом по участкам
      result.sort((a, b) => {
        const deptCompare = (a.department || "").localeCompare(b.department || "", "ru");
        if (deptCompare !== 0) return deptCompare;
        return (a.work_center_name || "").localeCompare(b.work_center_name || "", "ru");
      });

      return result;
    },
  });
};
