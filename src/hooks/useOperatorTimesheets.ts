import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface OperatorTimesheet {
  id: string;
  operator_id: string;
  work_date: string;
  planned_minutes: number;
  actual_minutes: number;
  overtime_minutes: number;
  status: 'pending' | 'confirmed' | 'approved';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch timesheets for a date range
export const useOperatorTimesheets = (startDate: Date, endDate: Date, operatorIds?: string[]) => {
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["operator-timesheets", startDateStr, endDateStr, operatorIds],
    queryFn: async () => {
      let query = supabase
        .from("operator_timesheets")
        .select("*")
        .gte("work_date", startDateStr)
        .lte("work_date", endDateStr);
      
      if (operatorIds && operatorIds.length > 0) {
        query = query.in("operator_id", operatorIds);
      }
      
      const { data, error } = await query.order("work_date");
      
      if (error) throw error;
      return data as OperatorTimesheet[];
    },
  });
};

// Create or update a timesheet entry (upsert)
export const useUpsertTimesheet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      operator_id: string;
      work_date: string;
      planned_minutes?: number;
      actual_minutes: number;
      overtime_minutes?: number;
      status?: 'pending' | 'confirmed' | 'approved';
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("operator_timesheets")
        .upsert(
          {
            operator_id: data.operator_id,
            work_date: data.work_date,
            planned_minutes: data.planned_minutes ?? 0,
            actual_minutes: data.actual_minutes,
            overtime_minutes: data.overtime_minutes ?? 0,
            status: data.status ?? 'pending',
            notes: data.notes ?? null,
          },
          {
            onConflict: 'operator_id,work_date',
          }
        )
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
    },
  });
};

// Bulk upsert timesheets
export const useBulkUpsertTimesheets = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entries: Array<{
      operator_id: string;
      work_date: string;
      planned_minutes?: number;
      actual_minutes: number;
      overtime_minutes?: number;
      status?: 'pending' | 'confirmed' | 'approved';
      notes?: string;
    }>) => {
      const { data, error } = await supabase
        .from("operator_timesheets")
        .upsert(
          entries.map(e => ({
            operator_id: e.operator_id,
            work_date: e.work_date,
            planned_minutes: e.planned_minutes ?? 0,
            actual_minutes: e.actual_minutes,
            overtime_minutes: e.overtime_minutes ?? 0,
            status: e.status ?? 'pending',
            notes: e.notes ?? null,
          })),
          {
            onConflict: 'operator_id,work_date',
          }
        )
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
    },
  });
};

// Delete a timesheet entry
export const useDeleteTimesheet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operator_timesheets")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
    },
  });
};

// Helper to create a map for fast lookup
export const createTimesheetMap = (timesheets: OperatorTimesheet[]): Map<string, OperatorTimesheet> => {
  const map = new Map<string, OperatorTimesheet>();
  timesheets.forEach(ts => {
    const key = `${ts.operator_id}_${ts.work_date}`;
    map.set(key, ts);
  });
  return map;
};

// Get timesheet for a specific operator and date
export const getTimesheetForDate = (
  timesheetMap: Map<string, OperatorTimesheet>,
  operatorId: string,
  date: Date
): OperatorTimesheet | undefined => {
  const dateStr = format(date, "yyyy-MM-dd");
  const key = `${operatorId}_${dateStr}`;
  return timesheetMap.get(key);
};
