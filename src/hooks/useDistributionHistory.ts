import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DistributionHistoryRecord {
  id: string;
  routing_sheet_id: string;
  strategy: string;
  components_distributed: number;
  operations_affected: number;
  user_id: string | null;
  created_at: string;
  notes: string | null;
}

export function useDistributionHistory(routingSheetId?: string) {
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ["distribution-history", routingSheetId],
    queryFn: async () => {
      let query = supabase
        .from("distribution_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (routingSheetId) {
        query = query.eq("routing_sheet_id", routingSheetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DistributionHistoryRecord[];
    },
    enabled: true,
  });

  const addHistoryRecord = useMutation({
    mutationFn: async (record: {
      routing_sheet_id: string;
      strategy: string;
      components_distributed: number;
      operations_affected: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("distribution_history")
        .insert({
          ...record,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution-history"] });
    },
  });

  return {
    history,
    isLoading,
    addHistoryRecord,
  };
}

export const STRATEGY_LABELS: Record<string, string> = {
  smart: "По типу продукта",
  all_operations: "На все операции",
  even: "Равномерное распределение",
  manual: "Ручное распределение",
  bulk: "Массовое распределение",
};
