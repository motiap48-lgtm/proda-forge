import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoutingOperationMaterial {
  id: string;
  routing_operation_id: string;
  product_id: string;
  quantity_per_operation: number | null;
  created_at: string;
  products?: {
    id: string;
    name: string;
    code: string;
    unit: string;
    product_type: string;
  };
}

export const useRoutingOperationMaterials = (routingSheetId?: string) => {
  return useQuery({
    queryKey: ["routing-operation-materials", routingSheetId],
    queryFn: async () => {
      if (!routingSheetId) return [];

      // First get all operations for this routing sheet
      const { data: operations, error: opsError } = await supabase
        .from("routing_operations")
        .select("id")
        .eq("routing_sheet_id", routingSheetId);

      if (opsError) throw opsError;
      if (!operations || operations.length === 0) return [];

      const operationIds = operations.map(op => op.id);

      // Then get all materials for these operations
      const { data, error } = await supabase
        .from("routing_operation_materials")
        .select(`
          *,
          products:product_id(id, name, code, unit, product_type)
        `)
        .in("routing_operation_id", operationIds);

      if (error) throw error;
      return data as RoutingOperationMaterial[];
    },
    enabled: !!routingSheetId,
  });
};

export const useSaveRoutingOperationMaterials = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routingSheetId,
      operationMaterials,
    }: {
      routingSheetId: string;
      operationMaterials: Array<{
        routing_operation_id: string;
        product_id: string;
        quantity_per_operation?: number | null;
      }>;
    }) => {
      // Get all operations for this routing sheet
      const { data: operations, error: opsError } = await supabase
        .from("routing_operations")
        .select("id")
        .eq("routing_sheet_id", routingSheetId);

      if (opsError) throw opsError;
      if (!operations || operations.length === 0) return;

      const operationIds = operations.map(op => op.id);

      // Delete existing materials for all operations
      const { error: deleteError } = await supabase
        .from("routing_operation_materials")
        .delete()
        .in("routing_operation_id", operationIds);

      if (deleteError) throw deleteError;

      // Insert new materials
      if (operationMaterials.length > 0) {
        const { error: insertError } = await supabase
          .from("routing_operation_materials")
          .insert(operationMaterials);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["routing-operation-materials", variables.routingSheetId] 
      });
      queryClient.invalidateQueries({ queryKey: ["routing-sheets"] });
    },
    onError: (error: any) => {
      toast.error("Ошибка сохранения привязок: " + error.message);
    },
  });
};
