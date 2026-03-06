import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QualityInspection {
  id: string;
  inspection_number: string;
  production_order_id: string;
  production_order_operation_id: string | null;
  inspector_id: string | null;
  inspection_date: string;
  status: string;
  result: string;
  inspected_quantity: number;
  passed_quantity: number;
  rejected_quantity: number;
  rework_quantity: number;
  defect_type_id: string | null;
  defect_description: string | null;
  corrective_action: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  production_order?: { order_number: string; quantity: number; product_id: string; products?: { name: string; code: string } };
  defect_type?: { name: string; code: string; severity: string } | null;
  inspector?: { full_name: string | null } | null;
}

export interface DefectType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  severity: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useQualityInspections = () => {
  const queryClient = useQueryClient();

  const inspectionsQuery = useQuery({
    queryKey: ["quality-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_inspections")
        .select(`
          *,
          production_order:production_orders!production_order_id(order_number, quantity, product_id, products:products!product_id(name, code)),
          defect_type:defect_types!defect_type_id(name, code, severity),
          inspector:profiles!inspector_id(full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as QualityInspection[];
    },
  });

  const defectTypesQuery = useQuery({
    queryKey: ["defect-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defect_types")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as DefectType[];
    },
  });

  const createInspection = useMutation({
    mutationFn: async (inspection: Partial<QualityInspection>) => {
      const { data, error } = await supabase
        .from("quality_inspections")
        .insert(inspection as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      toast.success("Акт контроля качества создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка создания акта: " + error.message);
    },
  });

  const updateInspection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualityInspection> & { id: string }) => {
      const { data, error } = await supabase
        .from("quality_inspections")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      toast.success("Акт обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка обновления: " + error.message);
    },
  });

  const deleteInspection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_inspections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      toast.success("Акт удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка удаления: " + error.message);
    },
  });

  // Defect types CRUD
  const createDefectType = useMutation({
    mutationFn: async (dt: Partial<DefectType>) => {
      const { data, error } = await supabase.from("defect_types").insert(dt as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
      toast.success("Тип дефекта создан");
    },
    onError: (error: any) => toast.error("Ошибка: " + error.message),
  });

  const updateDefectType = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DefectType> & { id: string }) => {
      const { data, error } = await supabase.from("defect_types").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
      toast.success("Тип дефекта обновлён");
    },
    onError: (error: any) => toast.error("Ошибка: " + error.message),
  });

  const deleteDefectType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("defect_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
      toast.success("Тип дефекта удалён");
    },
    onError: (error: any) => toast.error("Ошибка: " + error.message),
  });

  return {
    inspections: inspectionsQuery.data || [],
    isLoadingInspections: inspectionsQuery.isLoading,
    defectTypes: defectTypesQuery.data || [],
    isLoadingDefectTypes: defectTypesQuery.isLoading,
    createInspection,
    updateInspection,
    deleteInspection,
    createDefectType,
    updateDefectType,
    deleteDefectType,
  };
};
