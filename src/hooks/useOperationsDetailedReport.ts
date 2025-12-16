import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OperationDetailedItem {
  operation_id: string;
  operation_name: string;
  operation_type: string;
  sequence: number;
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  product_type: string;
  order_number: string;
  order_id: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
  setup_time_planned: number;
  cycle_time_planned: number;
  setup_time_actual: number | null;
  cycle_time_actual: number | null;
  status: string;
}

export interface WorkCenterOperationsData {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  operations: OperationDetailedItem[];
  total_planned: number;
  total_completed: number;
  total_deviation: number;
  completion_percent: number;
}

export const useOperationsDetailedReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["operations-detailed-report", startDate, endDate],
    queryFn: async () => {
      // Fetch production order operations with all related data
      let query = supabase
        .from("production_order_operations")
        .select(`
          id,
          sequence,
          status,
          completed_quantity,
          setup_time_actual,
          cycle_time_actual,
          production_orders!inner(
            id,
            order_number,
            quantity,
            planned_start_date,
            planned_end_date,
            status,
            products:product_id(id, name, code, product_type)
          ),
          routing_operations:routing_operation_id(
            id,
            name,
            operation_type,
            setup_time_minutes,
            cycle_time_minutes,
            work_centers:work_center_id(id, code, name, department)
          )
        `)
        .in("production_orders.status", ["planned", "released", "in_progress"]);

      if (startDate) {
        query = query.gte("production_orders.planned_start_date", startDate);
      }
      if (endDate) {
        query = query.lte("production_orders.planned_end_date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by work center
      const workCenterMap = new Map<string, WorkCenterOperationsData>();

      data?.forEach((op: any) => {
        const order = op.production_orders;
        const routingOp = op.routing_operations;
        const workCenter = routingOp?.work_centers;
        const product = order?.products;

        if (!order || !routingOp || !product) return;

        // Only include production operations
        if (routingOp.operation_type !== 'production') return;

        const wcId = workCenter?.id || 'unassigned';
        const wcCode = workCenter?.code || '-';
        const wcName = workCenter?.name || 'Без участка';
        const dept = workCenter?.department || 'Без цеха';

        const plannedQty = Number(order.quantity) || 0;
        const completedQty = Number(op.completed_quantity) || 0;
        const deviation = completedQty - plannedQty;
        const deviationPercent = plannedQty > 0 ? (deviation / plannedQty) * 100 : 0;

        const operationItem: OperationDetailedItem = {
          operation_id: op.id,
          operation_name: routingOp.name,
          operation_type: routingOp.operation_type,
          sequence: op.sequence,
          work_center_id: wcId,
          work_center_code: wcCode,
          work_center_name: wcName,
          department: dept,
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          product_type: product.product_type,
          order_number: order.order_number,
          order_id: order.id,
          planned_quantity: plannedQty,
          completed_quantity: completedQty,
          deviation,
          deviation_percent: deviationPercent,
          setup_time_planned: routingOp.setup_time_minutes || 0,
          cycle_time_planned: routingOp.cycle_time_minutes || 0,
          setup_time_actual: op.setup_time_actual,
          cycle_time_actual: op.cycle_time_actual,
          status: op.status,
        };

        if (!workCenterMap.has(wcId)) {
          workCenterMap.set(wcId, {
            work_center_id: wcId,
            work_center_code: wcCode,
            work_center_name: wcName,
            department: dept,
            operations: [],
            total_planned: 0,
            total_completed: 0,
            total_deviation: 0,
            completion_percent: 0,
          });
        }

        const wcData = workCenterMap.get(wcId)!;
        wcData.operations.push(operationItem);
        wcData.total_planned += plannedQty;
        wcData.total_completed += completedQty;
      });

      // Calculate totals
      const result: WorkCenterOperationsData[] = [];
      workCenterMap.forEach((wc) => {
        wc.total_deviation = wc.total_completed - wc.total_planned;
        wc.completion_percent = wc.total_planned > 0 
          ? (wc.total_completed / wc.total_planned) * 100 
          : 0;
        
        // Sort operations by order number, then sequence
        wc.operations.sort((a, b) => {
          const orderCompare = a.order_number.localeCompare(b.order_number);
          if (orderCompare !== 0) return orderCompare;
          return a.sequence - b.sequence;
        });
        
        result.push(wc);
      });

      // Sort by department then work center name
      result.sort((a, b) => {
        const deptCompare = (a.department || "").localeCompare(b.department || "", "ru");
        if (deptCompare !== 0) return deptCompare;
        return (a.work_center_name || "").localeCompare(b.work_center_name || "", "ru");
      });

      return result;
    },
  });
};
