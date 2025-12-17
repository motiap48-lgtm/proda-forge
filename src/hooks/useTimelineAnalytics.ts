import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, format, differenceInDays, addDays, eachDayOfInterval, parseISO, isWithinInterval } from "date-fns";
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
      // Fetch production orders with dates - use OR logic for date range to include orders active in the period
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

      // Get orders that overlap with the selected period
      if (startDate && endDate) {
        // Orders where: planned_start <= endDate AND planned_end >= startDate (overlapping interval)
        ordersQuery = ordersQuery
          .lte("planned_start_date", endDate)
          .gte("planned_end_date", startDate);
      } else if (startDate) {
        ordersQuery = ordersQuery.gte("planned_end_date", startDate);
      } else if (endDate) {
        ordersQuery = ordersQuery.lte("planned_start_date", endDate);
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

      // Generate all dates in the range
      const rangeStart = startDate ? parseISO(startDate) : new Date();
      const rangeEnd = endDate ? parseISO(endDate) : new Date();
      
      const allDates = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

      // Timeline trend data - distribute quantities across dates
      const timelineMap = new Map<string, {
        planned: number;
        completed: number;
        ordersCount: number;
      }>();

      // Initialize all dates with zeros
      allDates.forEach(date => {
        const dateKey = getDateKey(format(date, 'yyyy-MM-dd'));
        if (!timelineMap.has(dateKey)) {
          timelineMap.set(dateKey, { planned: 0, completed: 0, ordersCount: 0 });
        }
      });

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
        const orderStart = parseISO(order.planned_start_date);
        const orderEnd = parseISO(order.planned_end_date);
        const quantity = Number(order.quantity);
        const completedQty = Number(order.completed_quantity);
        
        // Calculate duration in days (min 1 day)
        const durationDays = Math.max(1, differenceInDays(orderEnd, orderStart) + 1);
        
        // Daily planned rate
        const dailyPlannedRate = quantity / durationDays;
        
        // Distribute planned quantity across each day of the order's duration
        allDates.forEach(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dateKey = getDateKey(dateStr);
          
          // Check if this date is within the order's planned period
          if (isWithinInterval(date, { start: orderStart, end: orderEnd })) {
            const point = timelineMap.get(dateKey)!;
            point.planned += dailyPlannedRate;
            
            // Count order only once per period
            const orderDateKey = getDateKey(order.planned_start_date);
            if (dateKey === orderDateKey) {
              point.ordersCount++;
            }
          }
        });

        // For completed: attribute to actual_end_date if available, otherwise to planned_end_date
        // But only if the order has some completion
        if (completedQty > 0) {
          const completionDate = order.actual_end_date || order.planned_end_date;
          const completionDateKey = getDateKey(completionDate);
          
          // Only add if the completion date is within our range
          if (timelineMap.has(completionDateKey)) {
            const point = timelineMap.get(completionDateKey)!;
            point.completed += completedQty;
          } else {
            // If completion is before range start, attribute to first date
            const firstDateKey = Array.from(timelineMap.keys())[0];
            if (firstDateKey && parseISO(completionDate) < rangeStart) {
              const point = timelineMap.get(firstDateKey)!;
              point.completed += completedQty;
            }
          }
        }

        // Work center load - distribute similarly
        const wc = order.work_centers as any;
        if (wc) {
          if (!workCenterLoadMap.has(wc.id)) {
            workCenterLoadMap.set(wc.id, new Map());
          }
          const wcDates = workCenterLoadMap.get(wc.id)!;
          
          allDates.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dateKey = getDateKey(dateStr);
            
            if (isWithinInterval(date, { start: orderStart, end: orderEnd })) {
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
              wcPoint.planned += dailyPlannedRate;
            }
          });
          
          // Add completed to work center
          if (completedQty > 0) {
            const completionDate = order.actual_end_date || order.planned_end_date;
            const completionDateKey = getDateKey(completionDate);
            if (wcDates.has(completionDateKey)) {
              const wcPoint = wcDates.get(completionDateKey)!;
              wcPoint.completed += completedQty;
            }
          }
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
          const completionPercent = quantity > 0 ? (completedQty / quantity) * 100 : 0;
          
          const daysElapsed = differenceInDays(new Date(), new Date(order.actual_start_date)) || 1;
          const avgDailyRate = completedQty / daysElapsed;
          
          let estimatedDate: string | null = null;
          let daysRemaining: number | null = null;
          
          if (avgDailyRate > 0) {
            const remaining = quantity - completedQty;
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
            completed_quantity: completedQty,
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
          planned: Math.round(data.planned * 100) / 100, // Round to 2 decimal places
          completed: data.completed,
          deviation: data.completed - Math.round(data.planned),
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
            planned: Math.round(data.planned * 100) / 100,
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
