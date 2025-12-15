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

export const useProductionOutputReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["production-output-report", startDate, endDate],
    queryFn: async () => {
      // Fetch completed operations with history entries for output registration
      const historyQuery = supabase
        .from("production_order_history")
        .select(`
          id,
          production_order_id,
          change_type,
          description,
          new_value,
          created_at,
          production_orders!production_order_history_production_order_id_fkey(
            id,
            order_number,
            product_id,
            work_center_id,
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

      // Group by date
      const outputByDate = new Map<string, Map<string, DailyOutputItem>>();

      historyData?.forEach((entry) => {
        const order = entry.production_orders as any;
        if (!order?.products) return;

        const dateKey = format(parseISO(entry.created_at), "yyyy-MM-dd");
        
        // Parse the new_value to get completed quantity
        let completedQty = 0;
        try {
          const parsed = JSON.parse(entry.new_value || "{}");
          completedQty = parsed.completed_quantity || parsed.goodQuantity || 0;
        } catch {
          completedQty = 0;
        }

        if (!outputByDate.has(dateKey)) {
          outputByDate.set(dateKey, new Map());
        }

        const dateItems = outputByDate.get(dateKey)!;
        const itemKey = `${order.product_id}-${order.work_center_id || 'none'}`;

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
