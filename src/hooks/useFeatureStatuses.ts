import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FeatureStatus = "done" | "in-progress" | "planned";

export interface FeatureStatusRecord {
  id: string;
  status: FeatureStatus;
  updated_at: string;
  updated_by: string | null;
}

export const useFeatureStatuses = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: statuses = {}, isLoading } = useQuery({
    queryKey: ["feature-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_statuses")
        .select("*");

      if (error) {
        console.error("Error fetching feature statuses:", error);
        return {};
      }

      const statusMap: Record<string, FeatureStatus> = {};
      data?.forEach(record => {
        statusMap[record.id] = record.status as FeatureStatus;
      });

      return statusMap;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ featureId, status }: { featureId: string; status: FeatureStatus }) => {
      const { error } = await supabase
        .from("feature_statuses")
        .upsert({
          id: featureId,
          status,
          updated_by: user?.id
        }, { onConflict: "id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-statuses"] });
      toast.success("Статус обновлён");
    },
    onError: (error) => {
      console.error("Error updating feature status:", error);
      toast.error("Ошибка при обновлении статуса");
    }
  });

  const getStatus = (featureId: string, defaultStatus: FeatureStatus): FeatureStatus => {
    return statuses[featureId] || defaultStatus;
  };

  return {
    statuses,
    isLoading,
    updateStatus,
    getStatus
  };
};
