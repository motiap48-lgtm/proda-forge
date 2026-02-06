import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncHireDateWithHistory } from "./useEmploymentHistory";

// Brigade Member History
export const useBrigadeMemberHistory = (brigadeId: string | null) => {
  return useQuery({
    queryKey: ["brigade-member-history", brigadeId],
    queryFn: async () => {
      if (!brigadeId) return [];
      
      const { data, error } = await supabase
        .from("brigade_member_history")
        .select(`
          *,
          operators:operator_id (
            id,
            full_name,
            code
          ),
          brigades:brigade_id (
            id,
            name,
            code
          )
        `)
        .eq("brigade_id", brigadeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!brigadeId,
  });
};

export const useClearBrigadeMemberHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brigadeId: string) => {
      const { error } = await supabase
        .from("brigade_member_history")
        .delete()
        .eq("brigade_id", brigadeId);

      if (error) throw error;
    },
    onSuccess: (_, brigadeId) => {
      queryClient.invalidateQueries({ queryKey: ["brigade-member-history", brigadeId] });
      toast.success("История изменений очищена");
    },
    onError: (error: any) => {
      toast.error("Ошибка при очистке истории: " + error.message);
    },
  });
};

// Work Schedules
export const useWorkSchedules = () => {
  return useQuery({
    queryKey: ["work-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select(`
          *,
          work_schedule_shifts (
            *,
            work_schedule_breaks (*)
          )
        `)
        .order("code");

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveWorkSchedules = () => {
  return useQuery({
    queryKey: ["work-schedules", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: any) => {
      const { data, error } = await supabase
        .from("work_schedules")
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("График работы создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("work_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("График работы обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("График работы удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Operators
export const useOperators = () => {
  return useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select(`
          *,
          work_centers:default_work_center_id (id, name, code),
          work_schedules:work_schedule_id (
            id,
            name,
            code,
            schedule_type,
            cycle_days_on,
            cycle_days_off,
            cycle_start_date,
            reduction_hours,
            work_schedule_shifts (
              id, shift_number, shift_name, start_time, end_time, net_work_minutes, gross_work_minutes, break_minutes
            )
          ),
          operator_skills (
            *,
            work_centers:work_center_id (id, name, code),
            standard_operations:standard_operation_id (id, name, code)
          )
        `)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveOperators = () => {
  return useQuery({
    queryKey: ["operators", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select(`
          *,
          work_centers:default_work_center_id (id, name, code)
        `)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateOperator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operator: any) => {
      // Get current user for history record
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("operators")
        .insert(operator)
        .select()
        .single();

      if (error) throw error;

      // Sync hire_date with employment_history
      if (data.hire_date) {
        await syncHireDateWithHistory(data.id, data.hire_date, user?.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      queryClient.invalidateQueries({ queryKey: ["employment-history"] });
      toast.success("Оператор создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateOperator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      // Get current user for history record
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("operators")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Sync hire_date with employment_history if it was updated
      if (updates.hire_date !== undefined) {
        await syncHireDateWithHistory(id, updates.hire_date, user?.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      queryClient.invalidateQueries({ queryKey: ["employment-history"] });
      toast.success("Оператор обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteOperator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operators")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Оператор удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Fix invalid rotation settings for all operators
export const useFixInvalidRotations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all operators with rotation enabled
      const { data: operators, error: fetchError } = await supabase
        .from("operators")
        .select(`
          id,
          shift_rotation_enabled,
          work_schedule_id,
          work_schedules:work_schedule_id (
            id,
            schedule_type,
            work_schedule_shifts (id)
          )
        `)
        .eq("shift_rotation_enabled", true);

      if (fetchError) throw fetchError;

      // Filter operators with invalid rotation settings
      const invalidOperators = operators?.filter((op: any) => {
        const schedule = op.work_schedules;
        if (!schedule) return true; // No schedule - rotation shouldn't be enabled
        const shiftsCount = schedule.work_schedule_shifts?.length || 0;
        const isCyclic = schedule.schedule_type === 'cyclic';
        // Invalid if cyclic schedule OR only 1 shift
        return isCyclic || shiftsCount <= 1;
      }) || [];

      if (invalidOperators.length === 0) {
        return { fixed: 0 };
      }

      // Update all invalid operators
      const ids = invalidOperators.map((op: any) => op.id);
      const { error: updateError } = await supabase
        .from("operators")
        .update({ shift_rotation_enabled: false })
        .in("id", ids);

      if (updateError) throw updateError;

      return { fixed: invalidOperators.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      if (data.fixed > 0) {
        toast.success(`Исправлено ${data.fixed} операторов с некорректными настройками ротации`);
      } else {
        toast.info("Все настройки ротации корректны");
      }
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Brigades
export const useBrigades = () => {
  return useQuery({
    queryKey: ["brigades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brigades")
        .select(`
          *,
          work_centers:default_work_center_id (id, name, code),
          work_schedules:work_schedule_id (
            id,
            name,
            code,
            schedule_type,
            cycle_days_on,
            cycle_days_off,
            cycle_start_date,
            reduction_hours,
            work_schedule_shifts (
              id, shift_number, shift_name, start_time, end_time, net_work_minutes, gross_work_minutes, break_minutes
            )
          ),
          brigade_members (
            *,
            operators (id, full_name, code, position)
          )
        `)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveBrigades = () => {
  return useQuery({
    queryKey: ["brigades", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brigades")
        .select(`
          *,
          work_centers:default_work_center_id (id, name, code),
          brigade_members (
            *,
            operators (id, full_name, code)
          )
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateBrigade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brigade: any) => {
      const { data, error } = await supabase
        .from("brigades")
        .insert(brigade)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      toast.success("Бригада создана");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateBrigade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("brigades")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      toast.success("Бригада обновлена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteBrigade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brigades")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      toast.success("Бригада удалена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Brigade Members
export const useAddBrigadeMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: { brigade_id: string; operator_id: string; role?: string }) => {
      // Check if operator is already in another active brigade
      const { data: existingMembership, error: checkError } = await supabase
        .from("brigade_members")
        .select("id, brigades:brigade_id(name)")
        .eq("operator_id", member.operator_id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingMembership) {
        const brigadeName = (existingMembership.brigades as any)?.name || "другой бригаде";
        throw new Error(`Оператор уже состоит в ${brigadeName}`);
      }
      
      const { data, error } = await supabase
        .from("brigade_members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      toast.success("Участник добавлен в бригаду");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useRemoveBrigadeMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brigade_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      toast.success("Участник удалён из бригады");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateBrigadeMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { data, error } = await supabase
        .from("brigade_members")
        .update({ role })
        .eq("id", memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["brigades"] });
      if (variables.role === "leader") {
        toast.success("Участник назначен бригадиром");
      } else {
        toast.success("Роль участника изменена");
      }
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Operator Skills
export const useAddOperatorSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: any) => {
      const { data, error } = await supabase
        .from("operator_skills")
        .insert(skill)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Навык добавлен");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useRemoveOperatorSkill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operator_skills")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Навык удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Work Schedule Shifts
export const useCreateWorkScheduleShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: any) => {
      const { data, error } = await supabase
        .from("work_schedule_shifts")
        .insert(shift)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Смена добавлена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateWorkScheduleShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("work_schedule_shifts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteWorkScheduleShift = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_schedule_shifts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Смена удалена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Work Schedule Breaks
export const useCreateWorkScheduleBreak = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (breakItem: any) => {
      const { data, error } = await supabase
        .from("work_schedule_breaks")
        .insert(breakItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Перерыв добавлен");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateWorkScheduleBreak = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("work_schedule_breaks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteWorkScheduleBreak = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("work_schedule_breaks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Перерыв удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Calendar Exceptions
export const useCalendarExceptions = () => {
  return useQuery({
    queryKey: ["calendar-exceptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_exceptions")
        .select("*")
        .order("exception_date");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCalendarException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exception: any) => {
      const { data, error } = await supabase
        .from("calendar_exceptions")
        .insert(exception)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-exceptions"] });
      toast.success("Исключение добавлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateCalendarException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("calendar_exceptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-exceptions"] });
      toast.success("Исключение обновлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteCalendarException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_exceptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-exceptions"] });
      toast.success("Исключение удалено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Bulk create calendar exceptions
export const useBulkCreateCalendarExceptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exceptions: any[]) => {
      const { data, error } = await supabase
        .from("calendar_exceptions")
        .insert(exceptions)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-exceptions"] });
      toast.success(`Добавлено ${data?.length || 0} исключений`);
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};
