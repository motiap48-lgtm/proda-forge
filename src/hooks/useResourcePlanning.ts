import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
            id, name, code,
            work_schedule_shifts (
              id, shift_name, net_work_minutes, gross_work_minutes, break_minutes
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
      const { data, error } = await supabase
        .from("operators")
        .insert(operator)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
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
      const { data, error } = await supabase
        .from("operators")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
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
          work_schedules:work_schedule_id (id, name, code),
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
