import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRoutingSheets = () => {
  return useQuery({
    queryKey: ["routing-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routing_sheets")
        .select(`
          *,
          products:product_id(id, name, code, product_type),
          routing_operations(
            id,
            sequence,
            name,
            setup_time_minutes,
            cycle_time_minutes,
            work_center_id,
            operation_type,
            work_centers:work_center_id(id, name, code)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveRoutingSheets = () => {
  return useQuery({
    queryKey: ["routing-sheets", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routing_sheets")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

interface Operation {
  id?: string;
  sequence: number;
  name: string;
  work_center_id: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: string;
}

interface RoutingSheetData {
  code: string;
  name: string;
  product_id: string;
  is_active: boolean;
  operations: Operation[];
}

export const useCreateRoutingSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RoutingSheetData) => {
      // Create the routing sheet
      const { data: sheet, error: sheetError } = await supabase
        .from("routing_sheets")
        .insert({
          code: data.code || "",
          name: data.name,
          product_id: data.product_id,
          is_active: data.is_active,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      // Create operations
      if (data.operations.length > 0) {
        const operationsToInsert = data.operations.map((op) => ({
          routing_sheet_id: sheet.id,
          sequence: op.sequence,
          name: op.name,
          work_center_id: op.work_center_id,
          setup_time_minutes: op.setup_time_minutes,
          cycle_time_minutes: op.cycle_time_minutes,
          operation_type: op.operation_type || "production",
        }));

        const { error: opsError } = await supabase
          .from("routing_operations")
          .insert(operationsToInsert);

        if (opsError) throw opsError;
      }

      return sheet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-sheets"] });
      toast.success("Техмаршрут создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateRoutingSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: RoutingSheetData & { id: string }) => {
      // Update the routing sheet
      const { error: sheetError } = await supabase
        .from("routing_sheets")
        .update({
          name: data.name,
          product_id: data.product_id,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (sheetError) throw sheetError;

      // Delete existing operations
      const { error: deleteError } = await supabase
        .from("routing_operations")
        .delete()
        .eq("routing_sheet_id", id);

      if (deleteError) throw deleteError;

      // Insert new operations
      if (data.operations.length > 0) {
        const operationsToInsert = data.operations.map((op) => ({
          routing_sheet_id: id,
          sequence: op.sequence,
          name: op.name,
          work_center_id: op.work_center_id,
          setup_time_minutes: op.setup_time_minutes,
          cycle_time_minutes: op.cycle_time_minutes,
          operation_type: op.operation_type || "production",
        }));

        const { error: opsError } = await supabase
          .from("routing_operations")
          .insert(operationsToInsert);

        if (opsError) throw opsError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-sheets"] });
      toast.success("Техмаршрут обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteRoutingSheet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete operations first
      const { error: opsError } = await supabase
        .from("routing_operations")
        .delete()
        .eq("routing_sheet_id", id);

      if (opsError) throw opsError;

      // Delete the routing sheet
      const { error } = await supabase
        .from("routing_sheets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-sheets"] });
      toast.success("Техмаршрут удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};
