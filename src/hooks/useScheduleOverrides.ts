import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

export interface ScheduleOverride {
  id: string;
  operator_id: string;
  override_date: string;
  is_working_day: boolean;
  shift_number: number | null;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const OVERRIDE_REASON_LABELS: Record<string, { label: string; icon: string }> = {
  production_need: { label: "Производственная необходимость", icon: "🏭" },
  schedule_change: { label: "Изменение графика", icon: "📅" },
  shift_swap: { label: "Замена смены", icon: "🔄" },
  extra_day: { label: "Дополнительный выход", icon: "➕" },
  day_off: { label: "Отгул", icon: "🏠" },
  other: { label: "Другое", icon: "📝" },
};

export const useScheduleOverrides = (operatorIds?: string[], dateRange?: { start: Date; end: Date }) => {
  return useQuery({
    queryKey: ["schedule-overrides", operatorIds, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("operator_schedule_overrides")
        .select("*")
        .order("override_date", { ascending: true });

      if (operatorIds && operatorIds.length > 0) {
        query = query.in("operator_id", operatorIds);
      }

      if (dateRange) {
        query = query
          .gte("override_date", format(dateRange.start, "yyyy-MM-dd"))
          .lte("override_date", format(dateRange.end, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduleOverride[];
    },
    enabled: operatorIds === undefined || operatorIds.length > 0,
  });
};

export const useCreateScheduleOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (override: {
      operator_id: string;
      override_date: string;
      is_working_day: boolean;
      shift_number?: number | null;
      reason?: string | null;
      notes?: string | null;
      shift_cycle_start_date?: string | null; // New: if provided, update operator's cycle start date
    }) => {
      const { shift_cycle_start_date, ...overrideData } = override;
      const { data: session } = await supabase.auth.getSession();
      
      // Create the override
      const { data, error } = await supabase
        .from("operator_schedule_overrides")
        .upsert({
          ...overrideData,
          created_by: session?.session?.user?.id || null,
        }, {
          onConflict: "operator_id,override_date",
        })
        .select()
        .single();

      if (error) throw error;

      // If shift_cycle_start_date is provided, update the operator's cycle start date
      if (shift_cycle_start_date) {
        const { error: operatorError } = await supabase
          .from("operators")
          .update({
            shift_rotation_start_date: shift_cycle_start_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", override.operator_id);

        if (operatorError) {
          console.error("Error updating operator cycle start date:", operatorError);
          // Don't fail the whole operation, just log the error
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      queryClient.invalidateQueries({ queryKey: ["resourcePlanning"] });
      toast.success("Изменение графика сохранено");
    },
    onError: (error: Error) => {
      toast.error("Ошибка сохранения: " + error.message);
    },
  });
};

export const useUpdateScheduleOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduleOverride> & { id: string }) => {
      const { data, error } = await supabase
        .from("operator_schedule_overrides")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-overrides"] });
      toast.success("Изменение обновлено");
    },
    onError: (error: Error) => {
      toast.error("Ошибка обновления: " + error.message);
    },
  });
};

export const useDeleteScheduleOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operator_schedule_overrides")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-overrides"] });
      toast.success("Изменение графика удалено");
    },
    onError: (error: Error) => {
      toast.error("Ошибка удаления: " + error.message);
    },
  });
};

export const useBulkCreateScheduleOverrides = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrides: {
      operator_id: string;
      override_date: string;
      is_working_day: boolean;
      shift_number?: number | null;
      reason?: string | null;
      notes?: string | null;
    }[]) => {
      const { data: session } = await supabase.auth.getSession();
      
      const overridesWithCreator = overrides.map(o => ({
        ...o,
        created_by: session?.session?.user?.id || null,
      }));

      const { data, error } = await supabase
        .from("operator_schedule_overrides")
        .upsert(overridesWithCreator, {
          onConflict: "operator_id,override_date",
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-overrides"] });
      toast.success(`Сохранено ${data.length} изменений графика`);
    },
    onError: (error: Error) => {
      toast.error("Ошибка сохранения: " + error.message);
    },
  });
};

// Helper function to check if a date has an override
export const getScheduleOverride = (
  overrides: ScheduleOverride[] | undefined,
  operatorId: string,
  date: Date
): ScheduleOverride | undefined => {
  if (!overrides) return undefined;
  const dateStr = format(date, "yyyy-MM-dd");
  return overrides.find(
    (o) => o.operator_id === operatorId && o.override_date === dateStr
  );
};

// Helper to determine if a day is working considering overrides
export const isWorkingDayWithOverride = (
  originalIsWorkingDay: boolean,
  override: ScheduleOverride | undefined
): boolean => {
  if (override) {
    return override.is_working_day;
  }
  return originalIsWorkingDay;
};
