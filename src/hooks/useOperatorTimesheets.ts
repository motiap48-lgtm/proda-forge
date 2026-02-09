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
    // Force fresh data fetch when records change for immediate UI updates
    staleTime: 0,
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
      // Force immediate refetch of ALL operator-timesheets queries
      queryClient.refetchQueries({ 
        queryKey: ["operator-timesheets"],
        type: 'all'
      });
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
      // Separate entries into upserts (actual > 0) and deletes (actual = 0)
      const toUpsert = entries.filter(e => e.actual_minutes > 0);
      const toDelete = entries.filter(e => e.actual_minutes === 0);
      
      let upsertedData: any[] = [];
      
      // Upsert non-zero entries
      if (toUpsert.length > 0) {
        const { data, error } = await supabase
          .from("operator_timesheets")
          .upsert(
            toUpsert.map(e => ({
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
        upsertedData = data || [];
      }
      
      // Delete zero entries (if they exist in DB)
      if (toDelete.length > 0) {
        // Build conditions for deletion
        for (const entry of toDelete) {
          const { error } = await supabase
            .from("operator_timesheets")
            .delete()
            .eq("operator_id", entry.operator_id)
            .eq("work_date", entry.work_date);
          
          if (error) throw error;
        }
      }
      
      return upsertedData;
    },
    onSuccess: () => {
      // Force immediate refetch of ALL operator-timesheets queries
      // Using refetchQueries instead of invalidateQueries to ensure data updates immediately
      queryClient.refetchQueries({ 
        queryKey: ["operator-timesheets"],
        type: 'all'
      });
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
      // Force immediate refetch of ALL operator-timesheets queries
      queryClient.refetchQueries({ 
        queryKey: ["operator-timesheets"],
        type: 'all'
      });
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

// Update timesheet status
export const useUpdateTimesheetStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      operator_id: string;
      work_date: string;
      status: 'pending' | 'draft' | 'on_review' | 'confirmed' | 'approved';
    }) => {
      const { data: result, error } = await supabase
        .from("operator_timesheets")
        .update({ status: data.status })
        .eq("operator_id", data.operator_id)
        .eq("work_date", data.work_date)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ["operator-timesheets"],
        type: 'all'
      });
    },
  });
};

// Bulk update timesheet status for multiple entries
export const useBulkUpdateTimesheetStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      entries: Array<{ operator_id: string; work_date: string }>;
      status: 'pending' | 'draft' | 'on_review' | 'confirmed' | 'approved';
    }) => {
      // Update each entry
      const results = await Promise.all(
        data.entries.map(async (entry) => {
          const { data: result, error } = await supabase
            .from("operator_timesheets")
            .update({ status: data.status })
            .eq("operator_id", entry.operator_id)
            .eq("work_date", entry.work_date)
            .select()
            .single();
          
          if (error) throw error;
          return result;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ["operator-timesheets"],
        type: 'all'
      });
    },
  });
};
