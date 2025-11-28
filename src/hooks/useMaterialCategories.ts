import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaterialCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMaterialCategories = () => {
  return useQuery({
    queryKey: ["material_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as MaterialCategory[];
    },
  });
};

export const useCreateMaterialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: category, error } = await supabase
        .from("material_categories")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_categories"] });
      toast.success("Категория успешно создана");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Категория с таким названием уже существует");
      } else {
        toast.error("Ошибка при создании категории");
      }
    },
  });
};

export const useUpdateMaterialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; description?: string };
    }) => {
      const { data: category, error } = await supabase
        .from("material_categories")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_categories"] });
      toast.success("Категория успешно обновлена");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Категория с таким названием уже существует");
      } else {
        toast.error("Ошибка при обновлении категории");
      }
    },
  });
};

export const useDeleteMaterialCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("material_categories")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_categories"] });
      toast.success("Категория успешно удалена");
    },
    onError: () => {
      toast.error("Ошибка при удалении категории");
    },
  });
};
