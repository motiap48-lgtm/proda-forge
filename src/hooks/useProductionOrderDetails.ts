import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProductionOrderOperations = (orderId: string) => {
  return useQuery({
    queryKey: ["production-order-operations", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_operations")
        .select(`
          *,
          routing_operations:routing_operation_id(
            name,
            setup_time_minutes,
            cycle_time_minutes,
            work_centers:work_center_id(name, code)
          ),
          profiles:operator_id(full_name)
        `)
        .eq("production_order_id", orderId)
        .order("sequence");

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

export const useProductionOrderHistory = (orderId: string) => {
  return useQuery({
    queryKey: ["production-order-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_history")
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .eq("production_order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

export const useUpdateOperationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      completedQuantity 
    }: { 
      id: string; 
      status: string; 
      completedQuantity?: number 
    }) => {
      const updates: any = { status };
      
      if (status === 'in_progress' && !updates.actual_start_date) {
        updates.actual_start_date = new Date().toISOString();
      }
      
      if (status === 'completed') {
        updates.actual_end_date = new Date().toISOString();
        if (completedQuantity !== undefined) {
          updates.completed_quantity = completedQuantity;
        }
      }

      const { data, error } = await supabase
        .from("production_order_operations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-order-operations"] });
      toast.success("Статус операции обновлен");
    },
    onError: (error) => {
      toast.error("Ошибка при обновлении: " + error.message);
    },
  });
};

export const useAddOrderHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (history: {
      production_order_id: string;
      user_id: string;
      change_type: string;
      old_value?: string;
      new_value?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("production_order_history")
        .insert(history)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-order-history"] });
    },
  });
};
