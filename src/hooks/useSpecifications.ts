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
          products:product_id(name, code, product_type, unit),
          specification_materials(
            id,
            material_id,
            quantity,
            waste_rate,
            products:material_id(name, code, unit, product_type)
          ),
          specification_history!specification_history_specification_id_fkey(
            id,
            change_type,
            description,
            created_at,
            profiles:user_id(full_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Sort history by created_at descending for each specification
      const dataWithSortedHistory = data?.map(spec => ({
        ...spec,
        specification_history: spec.specification_history?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) || []
      }));
      
      return dataWithSortedHistory;
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

      // Record creation in history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("specification_history").insert({
          specification_id: spec.id,
          user_id: user.id,
          change_type: "created",
          description: `Спецификация ${spec.code} создана`,
        });
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
      // Get old values for history
      const { data: oldSpec } = await supabase
        .from("specifications")
        .select("*")
        .eq("id", id)
        .single();

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

      // Record update in history
      const { data: { user } } = await supabase.auth.getUser();
      if (user && oldSpec) {
        let description = `Спецификация ${updated.code} обновлена`;
        
        if (oldSpec.is_active !== is_active) {
          description = is_active 
            ? `Спецификация ${updated.code} активирована`
            : `Спецификация ${updated.code} деактивирована`;
        }

        await supabase.from("specification_history").insert({
          specification_id: id,
          user_id: user.id,
          change_type: oldSpec.is_active !== is_active 
            ? (is_active ? "activated" : "deactivated")
            : "updated",
          description,
          old_value: JSON.stringify(oldSpec),
          new_value: JSON.stringify(updated),
        });
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
