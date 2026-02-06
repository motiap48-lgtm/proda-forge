import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TimesheetHistoryRecord {
  id: string;
  timesheet_id: string;
  operator_id: string;
  work_date: string;
  action_type: 'created' | 'updated' | 'deleted';
  old_actual_minutes: number | null;
  new_actual_minutes: number | null;
  old_planned_minutes: number | null;
  new_planned_minutes: number | null;
  old_status: string | null;
  new_status: string | null;
  old_notes: string | null;
  new_notes: string | null;
  changed_by: string | null;
  created_at: string;
}

// Fetch timesheet history for a specific operator
export const useTimesheetHistory = (operatorId: string | null, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ["timesheet-history", operatorId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!operatorId) return [];
      
      let query = supabase
        .from("timesheet_history")
        .select("*")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: false });
      
      if (startDate) {
        query = query.gte("work_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        query = query.lte("work_date", endDate.toISOString().split("T")[0]);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as TimesheetHistoryRecord[];
    },
    enabled: !!operatorId,
  });
};

// Clear timesheet history for an operator
export const useClearTimesheetHistory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (operatorId: string) => {
      const { error } = await supabase
        .from("timesheet_history")
        .delete()
        .eq("operator_id", operatorId);
      
      if (error) throw error;
      return operatorId;
    },
    onSuccess: (operatorId) => {
      queryClient.refetchQueries({ queryKey: ["timesheet-history", operatorId] });
      toast.success("История табеля очищена");
    },
    onError: (error: any) => {
      toast.error("Ошибка очистки истории: " + error.message);
    },
  });
};

// Labels for action types
export const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Создано", color: "bg-green-500" },
  updated: { label: "Изменено", color: "bg-blue-500" },
  deleted: { label: "Удалено", color: "bg-red-500" },
};

// Labels for status
export const TIMESHEET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Черновик", color: "text-muted-foreground" },
  draft: { label: "Черновик", color: "text-muted-foreground" },
  on_review: { label: "На проверке", color: "text-amber-600" },
  confirmed: { label: "Подтверждён", color: "text-blue-600" },
  approved: { label: "Утверждён", color: "text-green-600" },
};
