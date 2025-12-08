import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWorkCenters = () => {
  return useQuery({
    queryKey: ["work-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_centers")
        .select("*")
        .order("code");

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveWorkCenters = () => {
  return useQuery({
    queryKey: ["work-centers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_centers")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateWorkCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workCenter: any) => {
      const { data, error } = await supabase
        .from("work_centers")
        .insert(workCenter)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-centers"] });
      toast.success("Производственный участок создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateWorkCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("work_centers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-centers"] });
      toast.success("Производственный участок обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteWorkCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_centers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-centers"] });
      toast.success("Производственный участок удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};
