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

export interface WorkCenterProductItem {
  product_id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  routing_sheet_name: string;
  routing_sheet_code: string;
}

export interface WorkCenterReportData {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  items: WorkCenterReportItem[];
  products: WorkCenterProductItem[];
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
      let ordersQuery = supabase
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
        ordersQuery = ordersQuery.gte("planned_start_date", startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("planned_end_date", endDate);
      }

      // Получаем все маршрутные карты с операциями для определения продукции по участкам
      const routingQuery = supabase
        .from("routing_operations")
        .select(`
          id,
          work_center_id,
          routing_sheets:routing_sheet_id(
            id,
            code,
            name,
            is_active,
            products:product_id(id, name, code, product_type)
          ),
          work_centers:work_center_id(id, code, name, department)
        `)
        .eq("operation_type", "production");

      const [ordersResult, routingResult] = await Promise.all([ordersQuery, routingQuery]);

      if (ordersResult.error) throw ordersResult.error;
      if (routingResult.error) throw routingResult.error;

      const ordersData = ordersResult.data;
      const routingData = routingResult.data;

      // Группируем по участкам
      const workCenterMap = new Map<string, WorkCenterReportData>();

      // Добавляем данные из маршрутных карт (какие изделия производятся на участках)
      routingData.forEach((op: any) => {
        if (!op.work_center_id || !op.routing_sheets?.is_active) return;
        
        const wcId = op.work_center_id;
        const wcName = op.work_centers?.name || "Без участка";
        const wcCode = op.work_centers?.code || "-";
        const department = op.work_centers?.department || "Без цеха";
        const product = op.routing_sheets?.products;
        
        if (!product) return;
        
        // Только ПФ, СБ, ГП
        if (!["semi-finished", "assembly", "finished"].includes(product.product_type)) return;

        if (!workCenterMap.has(wcId)) {
          workCenterMap.set(wcId, {
            work_center_id: wcId,
            work_center_code: wcCode,
            work_center_name: wcName,
            department: department,
            items: [],
            products: [],
            total_planned: 0,
            total_completed: 0,
            total_deviation: 0,
            completion_percent: 0,
          });
        }

        const wcData = workCenterMap.get(wcId)!;
        
        // Проверяем, не добавлен ли уже этот продукт
        const existingProduct = wcData.products.find(p => p.product_id === product.id);
        if (!existingProduct) {
          wcData.products.push({
            product_id: product.id,
            product_name: product.name,
            product_code: product.code,
            product_type: product.product_type,
            routing_sheet_name: op.routing_sheets.name,
            routing_sheet_code: op.routing_sheets.code,
          });
        }
      });

      // Добавляем данные из заказов
      ordersData.forEach((order: any) => {
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
            products: [],
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
        
        // Сортируем продукты по типу и имени
        wc.products.sort((a, b) => {
          const typeOrder = { finished: 0, assembly: 1, "semi-finished": 2 };
          const typeCompare = (typeOrder[a.product_type as keyof typeof typeOrder] || 3) - 
                             (typeOrder[b.product_type as keyof typeof typeOrder] || 3);
          if (typeCompare !== 0) return typeCompare;
          return a.product_name.localeCompare(b.product_name, "ru");
        });
        
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
