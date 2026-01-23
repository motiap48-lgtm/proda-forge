import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface OvertimeEntry {
  id: string;
  operator_id: string;
  timesheet_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  description: string;
  work_order_id: string | null;
  status: 'pending' | 'approved' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  operators?: {
    id: string;
    full_name: string;
    code: string;
  };
  production_orders?: {
    id: string;
    order_number: string;
  } | null;
}

// Fetch overtime entries for a date range
export const useOvertimeEntries = (startDate?: Date, endDate?: Date, operatorIds?: string[]) => {
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : undefined;
  
  return useQuery({
    queryKey: ["overtime-entries", startDateStr, endDateStr, operatorIds],
    queryFn: async () => {
      let query = supabase
        .from("overtime_entries")
        .select(`
          *,
          operators:operator_id(id, full_name, code),
          production_orders:work_order_id(id, order_number)
        `)
        .order("work_date", { ascending: false })
        .order("start_time", { ascending: true });
      
      if (startDateStr) {
        query = query.gte("work_date", startDateStr);
      }
      if (endDateStr) {
        query = query.lte("work_date", endDateStr);
      }
      if (operatorIds && operatorIds.length > 0) {
        query = query.in("operator_id", operatorIds);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as OvertimeEntry[];
    },
  });
};

// Fetch overtime entries for a specific operator and date
export const useOvertimeEntriesForDate = (operatorId: string, date: Date) => {
  const dateStr = format(date, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["overtime-entries", operatorId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_entries")
        .select(`
          *,
          production_orders:work_order_id(id, order_number)
        `)
        .eq("operator_id", operatorId)
        .eq("work_date", dateStr)
        .neq("status", "cancelled")
        .order("start_time");
      
      if (error) throw error;
      return data as OvertimeEntry[];
    },
    enabled: !!operatorId && !!date,
  });
};

// Create overtime entry
export const useCreateOvertimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      operator_id: string;
      work_date: string;
      start_time: string;
      end_time: string;
      description: string;
      work_order_id?: string | null;
      timesheet_id?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from("overtime_entries")
        .insert({
          operator_id: data.operator_id,
          work_date: data.work_date,
          start_time: data.start_time,
          end_time: data.end_time,
          description: data.description,
          work_order_id: data.work_order_id || null,
          timesheet_id: data.timesheet_id || null,
          status: 'pending',
          created_by: user?.user?.id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries"] });
    },
  });
};

// Update overtime entry
export const useUpdateOvertimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      start_time?: string;
      end_time?: string;
      description?: string;
      work_order_id?: string | null;
      work_date?: string;
      status?: 'pending' | 'approved' | 'cancelled';
    }) => {
      const updateData: any = { ...data };
      delete updateData.id;
      
      // If approving, set approved_by and approved_at
      if (data.status === 'approved') {
        const { data: user } = await supabase.auth.getUser();
        updateData.approved_by = user?.user?.id || null;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { data: result, error } = await supabase
        .from("overtime_entries")
        .update(updateData)
        .eq("id", data.id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries"] });
    },
  });
};

// Delete overtime entry
export const useDeleteOvertimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("overtime_entries")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries"] });
    },
  });
};

// Approve overtime entry (with validation)
export const useApproveOvertimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First check if description is filled
      const { data: entry, error: fetchError } = await supabase
        .from("overtime_entries")
        .select("description")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!entry.description || entry.description.trim() === '') {
        throw new Error("Нельзя подтвердить переработку без описания выполненных работ");
      }
      
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from("overtime_entries")
        .update({
          status: 'approved',
          approved_by: user?.user?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries"] });
    },
  });
};

// Helper: Calculate total overtime for operator on a date
export const calculateOvertimeForDate = (
  overtimeEntries: OvertimeEntry[],
  operatorId: string,
  date: Date
): number => {
  const dateStr = format(date, "yyyy-MM-dd");
  return overtimeEntries
    .filter(e => 
      e.operator_id === operatorId && 
      e.work_date === dateStr && 
      e.status !== 'cancelled'
    )
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
};

// Helper: Create map for fast lookup
export const createOvertimeMap = (entries: OvertimeEntry[]): Map<string, OvertimeEntry[]> => {
  const map = new Map<string, OvertimeEntry[]>();
  entries.forEach(entry => {
    if (entry.status === 'cancelled') return;
    const key = `${entry.operator_id}_${entry.work_date}`;
    const existing = map.get(key) || [];
    existing.push(entry);
    map.set(key, existing);
  });
  return map;
};

// Helper: Get total overtime minutes from map
export const getOvertimeMinutesFromMap = (
  overtimeMap: Map<string, OvertimeEntry[]>,
  operatorId: string,
  date: Date
): number => {
  const dateStr = format(date, "yyyy-MM-dd");
  const key = `${operatorId}_${dateStr}`;
  const entries = overtimeMap.get(key) || [];
  return entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
};
