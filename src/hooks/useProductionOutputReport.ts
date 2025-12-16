import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

export interface DailyOutputItem {
  product_id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  unit: string;
  work_center_id: string | null;
  work_center_name: string;
  work_center_code: string;
  department: string | null;
  completed_quantity: number;
  order_numbers: string[];
  operation_name?: string;
}

export interface DailyOutput {
  date: string;
  items: DailyOutputItem[];
  totalQuantity: number;
}

export interface ProductionOutputSummary {
  totalDays: number;
  totalItems: number;
  totalQuantity: number;
  byProductType: {
    finished: number;
    assembly: number;
    'semi-finished': number;
  };
}

export interface DepartmentSummary {
  department: string;
  workCenters: {
    id: string;
    name: string;
    code: string;
    totalQuantity: number;
    byProductType: {
      finished: number;
      assembly: number;
      'semi-finished': number;
    };
  }[];
  totalQuantity: number;
  byProductType: {
    finished: number;
    assembly: number;
    'semi-finished': number;
  };
}

export interface PlanFactData {
  date: string;
  planned: number;
  actual: number;
  deviation: number;
  deviationPercent: number;
}

export interface PlanFactSummary {
  totalPlanned: number;
  totalActual: number;
  totalDeviation: number;
  deviationPercent: number;
  byDepartment: {
    department: string;
    planned: number;
    actual: number;
    deviation: number;
    deviationPercent: number;
  }[];
}

export type OutputReportMode = 'finished_products' | 'all_operations';

export const useProductionOutputReport = (
  startDate?: string, 
  endDate?: string,
  mode: OutputReportMode = 'finished_products'
) => {
  return useQuery({
    queryKey: ["production-output-report", startDate, endDate, mode],
    queryFn: async () => {
      // Fetch completed operations with history entries for output registration
      const historyQuery = supabase
        .from("production_order_history")
        .select(`
          id,
          production_order_id,
          change_type,
          description,
          old_value,
          new_value,
          created_at,
          production_orders!production_order_history_production_order_id_fkey(
            id,
            order_number,
            product_id,
            work_center_id,
            routing_sheet_id,
            quantity,
            completed_quantity,
            planned_start_date,
            planned_end_date,
            products:product_id(id, name, code, product_type, unit),
            work_centers:work_center_id(id, name, code, department)
          )
        `)
        .eq("change_type", "output_registered")
        .order("created_at", { ascending: false });

      if (startDate) {
        historyQuery.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        historyQuery.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data: historyData, error } = await historyQuery;

      if (error) throw error;

      // Fetch production orders for plan data
      const ordersQuery = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          product_id,
          work_center_id,
          quantity,
          completed_quantity,
          planned_start_date,
          planned_end_date,
          status,
          products:product_id(id, name, code, product_type, unit),
          work_centers:work_center_id(id, name, code, department)
        `)
        .in("status", ["in_progress", "completed", "released"]);

      if (startDate) {
        ordersQuery.gte("planned_end_date", startDate);
      }
      if (endDate) {
        ordersQuery.lte("planned_end_date", endDate);
      }

      const { data: ordersData } = await ordersQuery;

      // Get all unique order IDs to fetch their operations
      const orderIds = new Set<string>();
      historyData?.forEach((entry) => {
        if (entry.production_order_id) {
          orderIds.add(entry.production_order_id);
        }
      });

      // Fetch production order operations to get max sequence for each order AND work center info per operation
      const { data: orderOperations } = await supabase
        .from("production_order_operations")
        .select(`
          id,
          production_order_id,
          sequence,
          routing_operations:routing_operation_id(
            name,
            work_center_id,
            work_centers:work_center_id(id, name, code, department)
          )
        `)
        .in("production_order_id", Array.from(orderIds));

      // Build map: production_order_id -> { maxSequence, lastOperationName }
      // Also build map: `${production_order_id}-${operation_name}` -> work_center_info
      const orderMaxSequence = new Map<string, { maxSequence: number; lastOperationName: string }>();
      const operationWorkCenterMap = new Map<string, { 
        work_center_id: string | null; 
        work_center_name: string; 
        work_center_code: string;
        department: string | null;
      }>();

      orderOperations?.forEach((op) => {
        const routingOp = op.routing_operations as any;
        const opName = routingOp?.name || '';
        const wcInfo = routingOp?.work_centers;
        
        // Track max sequence per order
        const info = orderMaxSequence.get(op.production_order_id);
        if (!info || op.sequence > info.maxSequence) {
          orderMaxSequence.set(op.production_order_id, { 
            maxSequence: op.sequence, 
            lastOperationName: opName 
          });
        }

        // Store work center info for each operation
        const opKey = `${op.production_order_id}-${opName}`;
        if (!operationWorkCenterMap.has(opKey)) {
          operationWorkCenterMap.set(opKey, {
            work_center_id: routingOp?.work_center_id || null,
            work_center_name: wcInfo?.name || 'Не указан',
            work_center_code: wcInfo?.code || '',
            department: wcInfo?.department || null,
          });
        }
      });

      // Group by date
      const outputByDate = new Map<string, Map<string, DailyOutputItem>>();
      
      // Track which orders we've already counted (for finished_products mode)
      const countedOrdersPerDay = new Set<string>();

      historyData?.forEach((entry) => {
        const order = entry.production_orders as any;
        if (!order?.products) return;

        // Extract operation name from history entry
        let operationName = "";
        let completedQty = 0;
        
        try {
          const parsed = JSON.parse(entry.new_value || "{}");
          if (typeof parsed === 'object' && parsed !== null) {
            operationName = parsed.operation_name || "";
            completedQty = parsed.good_quantity || 0;
          } else {
            const newValue = Number(entry.new_value) || 0;
            const oldValue = Number(entry.old_value) || 0;
            completedQty = Math.max(0, newValue - oldValue);
          }
        } catch {
          const newValue = Number(entry.new_value) || 0;
          const oldValue = Number(entry.old_value) || 0;
          completedQty = Math.max(0, newValue - oldValue);
        }

        if (completedQty === 0) return;

        const dateKey = format(parseISO(entry.created_at), "yyyy-MM-dd");

        // In finished_products mode, only count the LAST operation
        if (mode === 'finished_products') {
          const orderInfo = orderMaxSequence.get(entry.production_order_id);
          const orderDateKey = `${entry.production_order_id}-${dateKey}`;
          
          if (orderInfo && operationName === orderInfo.lastOperationName) {
            if (countedOrdersPerDay.has(orderDateKey)) {
              return;
            }
            countedOrdersPerDay.add(orderDateKey);
          } else {
            return;
          }
        }

        if (!outputByDate.has(dateKey)) {
          outputByDate.set(dateKey, new Map());
        }

        const dateItems = outputByDate.get(dateKey)!;
        
        // Get work center info from operation, not from order
        const opKey = `${entry.production_order_id}-${operationName}`;
        const opWcInfo = operationWorkCenterMap.get(opKey);
        const wcId = opWcInfo?.work_center_id || order.work_center_id;
        const wcName = opWcInfo?.work_center_name || order.work_centers?.name || 'Не указан';
        const wcCode = opWcInfo?.work_center_code || order.work_centers?.code || '';
        const wcDept = opWcInfo?.department || order.work_centers?.department || null;
        
        const itemKey = mode === 'all_operations' 
          ? `${order.product_id}-${wcId || 'none'}-${operationName}`
          : `${order.product_id}-${wcId || 'none'}`;

        if (dateItems.has(itemKey)) {
          const existing = dateItems.get(itemKey)!;
          existing.completed_quantity += completedQty;
          if (!existing.order_numbers.includes(order.order_number)) {
            existing.order_numbers.push(order.order_number);
          }
        } else {
          dateItems.set(itemKey, {
            product_id: order.product_id,
            product_name: order.products.name,
            product_code: order.products.code,
            product_type: order.products.product_type,
            unit: order.products.unit || 'шт',
            work_center_id: wcId,
            work_center_name: wcName,
            work_center_code: wcCode,
            department: wcDept,
            completed_quantity: completedQty,
            order_numbers: [order.order_number],
            operation_name: mode === 'all_operations' ? operationName : undefined,
          });
        }
      });

      // Convert to array
      const dailyOutputs: DailyOutput[] = [];
      outputByDate.forEach((items, date) => {
        const itemsArray = Array.from(items.values());
        dailyOutputs.push({
          date,
          items: itemsArray.sort((a, b) => a.product_name.localeCompare(b.product_name, 'ru')),
          totalQuantity: itemsArray.reduce((sum, item) => sum + item.completed_quantity, 0),
        });
      });

      dailyOutputs.sort((a, b) => b.date.localeCompare(a.date));

      // Calculate summary
      const allItems = dailyOutputs.flatMap(d => d.items);
      const summary: ProductionOutputSummary = {
        totalDays: dailyOutputs.length,
        totalItems: allItems.length,
        totalQuantity: allItems.reduce((sum, item) => sum + item.completed_quantity, 0),
        byProductType: {
          finished: allItems.filter(i => i.product_type === 'finished').reduce((sum, i) => sum + i.completed_quantity, 0),
          assembly: allItems.filter(i => i.product_type === 'assembly').reduce((sum, i) => sum + i.completed_quantity, 0),
          'semi-finished': allItems.filter(i => i.product_type === 'semi-finished').reduce((sum, i) => sum + i.completed_quantity, 0),
        },
      };

      // Calculate department summary for management export
      const departmentMap = new Map<string, DepartmentSummary>();
      allItems.forEach(item => {
        const dept = item.department || 'Без цеха';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, {
            department: dept,
            workCenters: [],
            totalQuantity: 0,
            byProductType: { finished: 0, assembly: 0, 'semi-finished': 0 },
          });
        }
        const deptData = departmentMap.get(dept)!;
        deptData.totalQuantity += item.completed_quantity;
        
        if (item.product_type === 'finished') deptData.byProductType.finished += item.completed_quantity;
        if (item.product_type === 'assembly') deptData.byProductType.assembly += item.completed_quantity;
        if (item.product_type === 'semi-finished') deptData.byProductType['semi-finished'] += item.completed_quantity;

        // Add to work center
        let wc = deptData.workCenters.find(w => w.id === item.work_center_id);
        if (!wc) {
          wc = {
            id: item.work_center_id || 'none',
            name: item.work_center_name,
            code: item.work_center_code,
            totalQuantity: 0,
            byProductType: { finished: 0, assembly: 0, 'semi-finished': 0 },
          };
          deptData.workCenters.push(wc);
        }
        wc.totalQuantity += item.completed_quantity;
        if (item.product_type === 'finished') wc.byProductType.finished += item.completed_quantity;
        if (item.product_type === 'assembly') wc.byProductType.assembly += item.completed_quantity;
        if (item.product_type === 'semi-finished') wc.byProductType['semi-finished'] += item.completed_quantity;
      });

      const departmentSummaries = Array.from(departmentMap.values())
        .sort((a, b) => a.department.localeCompare(b.department, 'ru'));

      // Calculate Plan/Fact data
      const planFactByDate = new Map<string, { planned: number; actual: number }>();
      const planFactByDept = new Map<string, { planned: number; actual: number }>();

      // Add planned from orders (by planned_end_date)
      ordersData?.forEach(order => {
        if (!order.planned_end_date) return;
        const dateKey = order.planned_end_date;
        if (!planFactByDate.has(dateKey)) {
          planFactByDate.set(dateKey, { planned: 0, actual: 0 });
        }
        planFactByDate.get(dateKey)!.planned += Number(order.quantity) || 0;

        // By department
        const dept = (order.work_centers as any)?.department || 'Без цеха';
        if (!planFactByDept.has(dept)) {
          planFactByDept.set(dept, { planned: 0, actual: 0 });
        }
        planFactByDept.get(dept)!.planned += Number(order.quantity) || 0;
      });

      // Add actual from daily outputs
      dailyOutputs.forEach(day => {
        if (!planFactByDate.has(day.date)) {
          planFactByDate.set(day.date, { planned: 0, actual: 0 });
        }
        planFactByDate.get(day.date)!.actual += day.totalQuantity;

        // By department
        day.items.forEach(item => {
          const dept = item.department || 'Без цеха';
          if (!planFactByDept.has(dept)) {
            planFactByDept.set(dept, { planned: 0, actual: 0 });
          }
          planFactByDept.get(dept)!.actual += item.completed_quantity;
        });
      });

      // Convert to arrays
      const planFactData: PlanFactData[] = Array.from(planFactByDate.entries())
        .map(([date, data]) => ({
          date,
          planned: data.planned,
          actual: data.actual,
          deviation: data.actual - data.planned,
          deviationPercent: data.planned > 0 ? ((data.actual - data.planned) / data.planned) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalPlanned = planFactData.reduce((sum, d) => sum + d.planned, 0);
      const totalActual = planFactData.reduce((sum, d) => sum + d.actual, 0);

      const planFactSummary: PlanFactSummary = {
        totalPlanned,
        totalActual,
        totalDeviation: totalActual - totalPlanned,
        deviationPercent: totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0,
        byDepartment: Array.from(planFactByDept.entries())
          .map(([dept, data]) => ({
            department: dept,
            planned: data.planned,
            actual: data.actual,
            deviation: data.actual - data.planned,
            deviationPercent: data.planned > 0 ? ((data.actual - data.planned) / data.planned) * 100 : 0,
          }))
          .sort((a, b) => a.department.localeCompare(b.department, 'ru')),
      };

      return { dailyOutputs, summary, departmentSummaries, planFactData, planFactSummary };
    },
  });
};
