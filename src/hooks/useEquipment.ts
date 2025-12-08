import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useEquipment = (workCenterId?: string) => {
  return useQuery({
    queryKey: ["equipment", workCenterId],
    queryFn: async () => {
      let query = supabase
        .from("equipment")
        .select(`
          *,
          work_centers:work_center_id(code, name, department)
        `)
        .order("code");

      if (workCenterId) {
        query = query.eq("work_center_id", workCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !workCenterId || !!workCenterId,
  });
};

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: any) => {
      const { data, error } = await supabase
        .from("equipment")
        .insert(equipment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Оборудование добавлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Оборудование обновлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Оборудование удалено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};
