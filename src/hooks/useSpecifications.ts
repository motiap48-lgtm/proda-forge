import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSpecifications = () => {
  return useQuery({
    queryKey: ["specifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specifications")
        .select(`
          *,
          products:product_id(name, code),
          specification_materials(
            id,
            material_id,
            quantity,
            waste_rate,
            products:material_id(name, code, unit)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveSpecifications = () => {
  return useQuery({
    queryKey: ["specifications", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specifications")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (specification: {
      code: string;
      product_id: string;
      version: string;
      is_active: boolean;
      materials: Array<{
        material_id: string;
        quantity: number;
        waste_rate: number;
      }>;
    }) => {
      const { materials, ...specData } = specification;
      
      const { data: spec, error: specError } = await supabase
        .from("specifications")
        .insert(specData)
        .select()
        .single();

      if (specError) throw specError;

      if (materials.length > 0) {
        const materialsWithSpecId = materials.map(m => ({
          ...m,
          specification_id: spec.id,
        }));

        const { error: materialsError } = await supabase
          .from("specification_materials")
          .insert(materialsWithSpecId);

        if (materialsError) throw materialsError;
      }

      return spec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast.success("Спецификация создана");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при создании: " + error.message);
    },
  });
};

export const useUpdateSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      code,
      product_id,
      version,
      is_active,
      materials,
    }: {
      id: string;
      code?: string;
      product_id?: string;
      version?: string;
      is_active?: boolean;
      materials?: Array<{
        material_id: string;
        quantity: number;
        waste_rate: number;
      }>;
    }) => {
      const { data: updated, error } = await supabase
        .from("specifications")
        .update({
          code,
          product_id,
          version,
          is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Если переданы материалы, обновляем их
      if (materials !== undefined) {
        // Удаляем старые материалы
        const { error: deleteError } = await supabase
          .from("specification_materials")
          .delete()
          .eq("specification_id", id);

        if (deleteError) throw deleteError;

        // Вставляем новые материалы
        if (materials.length > 0) {
          const materialsWithSpecId = materials.map(m => ({
            ...m,
            specification_id: id,
          }));

          const { error: materialsError } = await supabase
            .from("specification_materials")
            .insert(materialsWithSpecId);

          if (materialsError) throw materialsError;
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast.success("Спецификация обновлена");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при обновлении: " + error.message);
    },
  });
};

export const useDeleteSpecification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast.success("Спецификация удалена");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при удалении: " + error.message);
    },
  });
};
