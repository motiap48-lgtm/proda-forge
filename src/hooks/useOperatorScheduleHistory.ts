import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OperatorScheduleHistory {
  id: string;
  operator_id: string;
  work_schedule_id: string | null;
  work_schedule_name: string | null;
  assigned_shift_id: string | null;
  assigned_shift_name: string | null;
  shift_rotation_enabled: boolean;
  shift_rotation_start_date: string | null;
  assigned_shift_number: number | null;
  effective_from: string;
  effective_to: string | null;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export const useOperatorScheduleHistory = (operatorId: string | null) => {
  return useQuery({
    queryKey: ["operator-schedule-history", operatorId],
    queryFn: async () => {
      if (!operatorId) return [];
      
      const { data, error } = await supabase
        .from("operator_schedule_history")
        .select("*")
        .eq("operator_id", operatorId)
        .order("effective_from", { ascending: false });

      if (error) {
        console.error("Error fetching operator schedule history:", error);
        throw error;
      }

      return data as OperatorScheduleHistory[];
    },
    enabled: !!operatorId,
  });
};
