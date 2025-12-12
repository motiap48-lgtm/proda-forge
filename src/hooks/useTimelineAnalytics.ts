import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, format, differenceInDays, addDays } from "date-fns";
import { ru } from "date-fns/locale";

export type TimeGranularity = 'day' | 'week' | 'month';

export interface TimelineDataPoint {
  date: string;
  label: string;
  planned: number;
  completed: number;
  deviation: number;
  deviationPercent: number;
  ordersCount: number;
}

export interface WorkCenterLoadPoint {
  work_center_id: string;
  work_center_name: string;
  work_center_code: string;
  department: string | null;
  date: string;
  label: string;
  planned: number;
  completed: number;
  load_percent: number;
}

export interface OrderTimingData {
  order_id: string;
  order_number: string;
  product_name: string;
  product_code: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  planned_duration: number;
  actual_duration: number | null;
  delay_days: number;
  status: string;
}

export interface CompletionForecast {
  order_id: string;
  order_number: string;
  product_name: string;
  quantity: number;
  completed_quantity: number;
  completion_percent: number;
  avg_daily_rate: number;
  estimated_completion_date: string | null;
  days_remaining: number | null;
  planned_end: string;
  is_on_track: boolean;
}

export const useTimelineAnalytics = (
  startDate?: string,
  endDate?: string,
  granularity: TimeGranularity = 'day'
) => {
  return useQuery({
    queryKey: ["timeline-analytics", startDate, endDate, granularity],
    queryFn: async () => {
      // Fetch production orders with dates
      let ordersQuery = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          status,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          created_at,
          product_id,
          work_center_id,
          products:product_id(id, name, code, product_type),
          work_centers:work_center_id(id, name, code, department)
        `)
        .order("planned_start_date", { ascending: true });

      if (startDate) {
        ordersQuery = ordersQuery.gte("planned_start_date", startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("planned_end_date", endDate);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

      // Group data by time period
      const getDateKey = (dateStr: string): string => {
        const date = new Date(dateStr);
        switch (granularity) {
          case 'week':
            return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          case 'month':
            return format(startOfMonth(date), 'yyyy-MM-dd');
          default:
            return format(startOfDay(date), 'yyyy-MM-dd');
        }
      };

      const getDateLabel = (dateStr: string): string => {
        const date = new Date(dateStr);
        switch (granularity) {
          case 'week':
            return `Неделя ${format(date, 'w', { locale: ru })} (${format(date, 'dd.MM', { locale: ru })})`;
          case 'month':
            return format(date, 'LLLL yyyy', { locale: ru });
          default:
            return format(date, 'dd.MM', { locale: ru });
        }
      };

      // Timeline trend data
      const timelineMap = new Map<string, {
        planned: number;
        completed: number;
        ordersCount: number;
      }>();

      // Work center load data
      const workCenterLoadMap = new Map<string, Map<string, {
        work_center_name: string;
        work_center_code: string;
        department: string | null;
        planned: number;
        completed: number;
      }>>();

      // Order timing analysis
      const orderTimings: OrderTimingData[] = [];

      // Completion forecast
      const forecasts: CompletionForecast[] = [];

      orders?.forEach(order => {
        const plannedStart = order.planned_start_date;
        const dateKey = getDateKey(plannedStart);
        
        // Aggregate timeline data
        if (!timelineMap.has(dateKey)) {
          timelineMap.set(dateKey, { planned: 0, completed: 0, ordersCount: 0 });
        }
        const point = timelineMap.get(dateKey)!;
        point.planned += Number(order.quantity);
        point.completed += Number(order.completed_quantity);
        point.ordersCount++;

        // Work center load
        const wc = order.work_centers as any;
        if (wc) {
          if (!workCenterLoadMap.has(wc.id)) {
            workCenterLoadMap.set(wc.id, new Map());
          }
          const wcDates = workCenterLoadMap.get(wc.id)!;
          if (!wcDates.has(dateKey)) {
            wcDates.set(dateKey, {
              work_center_name: wc.name,
              work_center_code: wc.code,
              department: wc.department,
              planned: 0,
              completed: 0,
            });
          }
          const wcPoint = wcDates.get(dateKey)!;
          wcPoint.planned += Number(order.quantity);
          wcPoint.completed += Number(order.completed_quantity);
        }

        // Order timing
        const product = order.products as any;
        const plannedDuration = differenceInDays(
          new Date(order.planned_end_date),
          new Date(order.planned_start_date)
        );
        
        let actualDuration: number | null = null;
        let delayDays = 0;
        
        if (order.actual_start_date && order.actual_end_date) {
          actualDuration = differenceInDays(
            new Date(order.actual_end_date),
            new Date(order.actual_start_date)
          );
          delayDays = differenceInDays(
            new Date(order.actual_end_date),
            new Date(order.planned_end_date)
          );
        } else if (order.actual_start_date && !order.actual_end_date) {
          // In progress - calculate delay from planned end
          const today = new Date();
          if (today > new Date(order.planned_end_date)) {
            delayDays = differenceInDays(today, new Date(order.planned_end_date));
          }
        }

        orderTimings.push({
          order_id: order.id,
          order_number: order.order_number,
          product_name: product?.name || '',
          product_code: product?.code || '',
          planned_start: order.planned_start_date,
          planned_end: order.planned_end_date,
          actual_start: order.actual_start_date,
          actual_end: order.actual_end_date,
          planned_duration: plannedDuration,
          actual_duration: actualDuration,
          delay_days: delayDays,
          status: order.status,
        });

        // Completion forecast for in-progress orders
        if (order.status === 'in_progress' && order.actual_start_date) {
          const quantity = Number(order.quantity);
          const completed = Number(order.completed_quantity);
          const completionPercent = quantity > 0 ? (completed / quantity) * 100 : 0;
          
          const daysElapsed = differenceInDays(new Date(), new Date(order.actual_start_date)) || 1;
          const avgDailyRate = completed / daysElapsed;
          
          let estimatedDate: string | null = null;
          let daysRemaining: number | null = null;
          
          if (avgDailyRate > 0) {
            const remaining = quantity - completed;
            daysRemaining = Math.ceil(remaining / avgDailyRate);
            estimatedDate = format(addDays(new Date(), daysRemaining), 'yyyy-MM-dd');
          }

          const isOnTrack = estimatedDate 
            ? new Date(estimatedDate) <= new Date(order.planned_end_date)
            : false;

          forecasts.push({
            order_id: order.id,
            order_number: order.order_number,
            product_name: product?.name || '',
            quantity,
            completed_quantity: completed,
            completion_percent: completionPercent,
            avg_daily_rate: avgDailyRate,
            estimated_completion_date: estimatedDate,
            days_remaining: daysRemaining,
            planned_end: order.planned_end_date,
            is_on_track: isOnTrack,
          });
        }
      });

      // Convert timeline map to array
      const timelineData: TimelineDataPoint[] = Array.from(timelineMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          label: getDateLabel(date),
          planned: data.planned,
          completed: data.completed,
          deviation: data.completed - data.planned,
          deviationPercent: data.planned > 0 ? ((data.completed - data.planned) / data.planned) * 100 : 0,
          ordersCount: data.ordersCount,
        }));

      // Convert work center load to array
      const workCenterLoadData: WorkCenterLoadPoint[] = [];
      workCenterLoadMap.forEach((dates, wcId) => {
        dates.forEach((data, dateKey) => {
          workCenterLoadData.push({
            work_center_id: wcId,
            work_center_name: data.work_center_name,
            work_center_code: data.work_center_code,
            department: data.department,
            date: dateKey,
            label: getDateLabel(dateKey),
            planned: data.planned,
            completed: data.completed,
            load_percent: data.planned > 0 ? (data.completed / data.planned) * 100 : 0,
          });
        });
      });

      // Sort order timings by delay
      orderTimings.sort((a, b) => b.delay_days - a.delay_days);

      // Sort forecasts by days remaining
      forecasts.sort((a, b) => (a.days_remaining || 999) - (b.days_remaining || 999));

      return {
        timelineData,
        workCenterLoadData,
        orderTimings,
        forecasts,
      };
    },
  });
};
