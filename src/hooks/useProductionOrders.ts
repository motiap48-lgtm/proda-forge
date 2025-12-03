import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductionOrder {
  id: string;
  order_number: string;
  product_id: string;
  specification_id: string | null;
  routing_sheet_id: string | null;
  work_center_id: string | null;
  quantity: number;
  completed_quantity: number;
  status: string;
  priority: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
  products?: { name: string; code: string };
  specifications?: { code: string };
  work_centers?: { name: string };
}

export const useProductionOrders = () => {
  return useQuery({
    queryKey: ["production-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(name, code),
          specifications:specification_id(code),
          work_centers:work_center_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProductionOrder[];
    },
  });
};

export const useProductionOrder = (id: string) => {
  return useQuery({
    queryKey: ["production-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(name, code, unit),
          specifications:specification_id(code, version),
          routing_sheets:routing_sheet_id(name),
          work_centers:work_center_id(name, code)
        `)
        .eq("order_number", id)
        .single();

      if (error) throw error;
      return data as ProductionOrder;
    },
    enabled: !!id,
  });
};

export const useCreateProductionOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Omit<ProductionOrder, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("production_orders")
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success("Производственный заказ создан");
    },
    onError: (error) => {
      toast.error("Ошибка при создании заказа: " + error.message);
    },
  });
};

export const useUpdateProductionOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from("production_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success("Заказ обновлен");
    },
    onError: (error) => {
      toast.error("Ошибка при обновлении: " + error.message);
    },
  });
};

export const useDeleteProductionOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related operations first
      await supabase
        .from("production_order_operations")
        .delete()
        .eq("production_order_id", id);

      // Delete related history
      await supabase
        .from("production_order_history")
        .delete()
        .eq("production_order_id", id);

      // Delete related material reservations
      await supabase
        .from("material_reservations")
        .delete()
        .eq("production_order_id", id);

      // Delete related material issues
      await supabase
        .from("material_issues")
        .delete()
        .eq("production_order_id", id);

      // Finally delete the order
      const { error } = await supabase
        .from("production_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success("Производственный заказ удален");
    },
    onError: (error) => {
      toast.error("Ошибка при удалении: " + error.message);
    },
  });
};
