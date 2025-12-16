import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

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

      // Get all unique order IDs to fetch their operations
      const orderIds = new Set<string>();
      historyData?.forEach((entry) => {
        if (entry.production_order_id) {
          orderIds.add(entry.production_order_id);
        }
      });

      // Fetch production order operations to get max sequence for each order
      const { data: orderOperations } = await supabase
        .from("production_order_operations")
        .select(`
          id,
          production_order_id,
          sequence,
          routing_operations:routing_operation_id(name)
        `)
        .in("production_order_id", Array.from(orderIds));

      // Build map: production_order_id -> { maxSequence, lastOperationName }
      const orderMaxSequence = new Map<string, { maxSequence: number; lastOperationName: string }>();
      orderOperations?.forEach((op) => {
        const info = orderMaxSequence.get(op.production_order_id);
        const opName = (op.routing_operations as any)?.name || '';
        if (!info || op.sequence > info.maxSequence) {
          orderMaxSequence.set(op.production_order_id, { 
            maxSequence: op.sequence, 
            lastOperationName: opName 
          });
        }
      });

      // Group by date
      const outputByDate = new Map<string, Map<string, DailyOutputItem>>();
      
      // Track which orders we've already counted (for finished_products mode)
      // Key: `${orderId}-${date}` to avoid double counting per day
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
            // Old format: plain number string - calculate delta
            const newValue = Number(entry.new_value) || 0;
            const oldValue = Number(entry.old_value) || 0;
            completedQty = Math.max(0, newValue - oldValue);
          }
        } catch {
          // Fallback for plain number strings that fail JSON parse
          const newValue = Number(entry.new_value) || 0;
          const oldValue = Number(entry.old_value) || 0;
          completedQty = Math.max(0, newValue - oldValue);
        }

        if (completedQty === 0) return; // Skip if no actual output

        const dateKey = format(parseISO(entry.created_at), "yyyy-MM-dd");

        // In finished_products mode, only count the LAST operation
        if (mode === 'finished_products') {
          const orderInfo = orderMaxSequence.get(entry.production_order_id);
          
          // Check if this operation is THE last operation by comparing names
          // Also ensure we haven't already counted this order for this date
          const orderDateKey = `${entry.production_order_id}-${dateKey}`;
          
          if (orderInfo && operationName === orderInfo.lastOperationName) {
            // This is the last operation - count it only once per order per day
            if (countedOrdersPerDay.has(orderDateKey)) {
              return; // Already counted this order for this date
            }
            countedOrdersPerDay.add(orderDateKey);
          } else {
            // Not the last operation, skip in finished_products mode
            return;
          }
        }

        if (!outputByDate.has(dateKey)) {
          outputByDate.set(dateKey, new Map());
        }

        const dateItems = outputByDate.get(dateKey)!;
        
        // In all_operations mode, include operation name in the key
        const itemKey = mode === 'all_operations' 
          ? `${order.product_id}-${order.work_center_id || 'none'}-${operationName}`
          : `${order.product_id}-${order.work_center_id || 'none'}`;

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
            work_center_id: order.work_center_id,
            work_center_name: order.work_centers?.name || 'Не указан',
            work_center_code: order.work_centers?.code || '',
            department: order.work_centers?.department || null,
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

      // Sort by date descending
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

      return { dailyOutputs, summary };
    },
  });
};
