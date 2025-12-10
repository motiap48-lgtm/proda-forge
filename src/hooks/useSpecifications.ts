import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSpecifications = () => {
  return useQuery({
    queryKey: ["specifications"],
    queryFn: async () => {
      // Fetch specifications with basic data
      const { data: specs, error: specsError } = await supabase
        .from("specifications")
        .select(`
          *,
          products:product_id(name, code, product_type, unit),
          specification_history!specification_history_specification_id_fkey(
            id,
            change_type,
            description,
            created_at,
            profiles:user_id(full_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (specsError) throw specsError;

      // Fetch ALL specification materials separately to avoid nested limit issues
      const { data: allMaterials, error: materialsError } = await supabase
        .from("specification_materials")
        .select(`
          id,
          specification_id,
          material_id,
          quantity,
          waste_rate,
          products:material_id(name, code, unit, product_type)
        `)
        .order("created_at", { ascending: true });

      if (materialsError) throw materialsError;

      // Group materials by specification_id
      const materialsBySpecId = new Map<string, any[]>();
      allMaterials?.forEach(material => {
        const specId = material.specification_id;
        if (!materialsBySpecId.has(specId)) {
          materialsBySpecId.set(specId, []);
        }
        materialsBySpecId.get(specId)!.push(material);
      });

      // Combine specifications with their materials
      const dataWithMaterials = specs?.map(spec => ({
        ...spec,
        specification_materials: materialsBySpecId.get(spec.id) || [],
        specification_history: spec.specification_history?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) || []
      }));
      
      return dataWithMaterials;
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
      has_no_specification?: boolean;
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
      has_no_specification,
      materials,
    }: {
      id: string;
      code?: string;
      product_id?: string;
      version?: string;
      is_active?: boolean;
      has_no_specification?: boolean;
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
          has_no_specification,
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
        let changeType = "updated";
        
        if (oldSpec.is_active !== is_active) {
          description = is_active 
            ? `Спецификация ${updated.code} активирована`
            : `Спецификация ${updated.code} деактивирована`;
          changeType = is_active ? "activated" : "deactivated";
        } else if (oldSpec.has_no_specification !== has_no_specification) {
          description = has_no_specification
            ? `Спецификация ${updated.code} помечена как "нет спецификации"`
            : `Спецификация ${updated.code} добавлены компоненты`;
        }

        await supabase.from("specification_history").insert({
          specification_id: id,
          user_id: user.id,
          change_type: changeType,
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
