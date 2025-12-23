import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OperatorAbsence {
  id: string;
  operator_id: string;
  absence_type: 'annual_leave' | 'sick_leave' | 'administrative_leave' | 'maternity_leave' | 'unpaid_leave' | 'business_trip' | 'unauthorized_absence' | 'other';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const ABSENCE_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  annual_leave: { label: "Ежегодный отпуск", color: "bg-blue-500", icon: "🏖️" },
  sick_leave: { label: "Больничный", color: "bg-red-500", icon: "🏥" },
  administrative_leave: { label: "Административный", color: "bg-orange-500", icon: "📋" },
  maternity_leave: { label: "Декретный отпуск", color: "bg-pink-500", icon: "👶" },
  unpaid_leave: { label: "Без сохранения ЗП", color: "bg-gray-500", icon: "💰" },
  business_trip: { label: "Командировка", color: "bg-purple-500", icon: "✈️" },
  unauthorized_absence: { label: "Прогул", color: "bg-rose-600", icon: "🚫" },
  other: { label: "Другое", color: "bg-slate-500", icon: "📝" },
};

export const ABSENCE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-yellow-500" },
  approved: { label: "Одобрено", color: "bg-green-500" },
  rejected: { label: "Отклонено", color: "bg-red-500" },
  cancelled: { label: "Отменено", color: "bg-gray-500" },
};

// Types of absences that require compensation (make-up work)
export const COMPENSABLE_ABSENCE_TYPES: OperatorAbsence["absence_type"][] = [
  'unauthorized_absence',  // Прогул - только прогулы требуют отработки
];

// Helper function to check if absence type requires compensation
export const isCompensableAbsenceType = (type: OperatorAbsence["absence_type"]): boolean => {
  return COMPENSABLE_ABSENCE_TYPES.includes(type);
};

export const useOperatorAbsences = (operatorId?: string) => {
  return useQuery({
    queryKey: ["operator-absences", operatorId],
    queryFn: async () => {
      let query = supabase
        .from("operator_absences")
        .select("*")
        .order("start_date", { ascending: false });

      if (operatorId) {
        query = query.eq("operator_id", operatorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OperatorAbsence[];
    },
  });
};

export const useAllOperatorAbsences = () => {
  return useQuery({
    queryKey: ["all-operator-absences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_absences")
        .select("*")
        .eq("status", "approved")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as OperatorAbsence[];
    },
  });
};

// Helper to get hours from operator's schedule
const getOperatorScheduleHours = async (operatorId: string): Promise<number> => {
  const { data } = await supabase
    .from("operators")
    .select(`
      work_schedule_id,
      work_schedules (
        work_schedule_shifts (
          net_work_minutes,
          gross_work_minutes,
          break_minutes
        )
      )
    `)
    .eq("id", operatorId)
    .single();

  const shifts = data?.work_schedules?.work_schedule_shifts || [];
  if (shifts.length > 0) {
    const netMinutes = shifts[0].net_work_minutes || (shifts[0].gross_work_minutes - shifts[0].break_minutes);
    return netMinutes / 60;
  }
  return 8; // Default fallback
};

// Extended absence type with optional requiresCompensation flag
export interface CreateAbsenceParams extends Omit<OperatorAbsence, "id" | "created_at" | "updated_at"> {
  requiresCompensation?: boolean;
}

export const useCreateOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAbsenceParams) => {
      const { requiresCompensation, ...absence } = params;
      
      // Create the absence record
      const { data, error } = await supabase
        .from("operator_absences")
        .insert(absence)
        .select()
        .single();

      if (error) throw error;

      // Determine if compensation is needed:
      // - Either the type is in COMPENSABLE_ABSENCE_TYPES (e.g. unauthorized_absence)
      // - Or the user manually checked requiresCompensation
      const needsCompensation = (isCompensableAbsenceType(absence.absence_type) || requiresCompensation) && absence.status === 'approved';

      if (needsCompensation) {
        const scheduleHours = await getOperatorScheduleHours(absence.operator_id);
        
        // Calculate number of days
        const startDate = new Date(absence.start_date);
        const endDate = new Date(absence.end_date);
        const days = differenceInCalendarDays(endDate, startDate) + 1;
        
        // Create compensation record for each day
        const compensationRecords = [];
        for (let i = 0; i < days; i++) {
          const absenceDate = format(addDays(startDate, i), "yyyy-MM-dd");
          compensationRecords.push({
            operator_id: absence.operator_id,
            absence_date: absenceDate,
            absence_hours: scheduleHours,
            reason: `${ABSENCE_TYPE_LABELS[absence.absence_type]?.label || absence.absence_type}${absence.notes ? `: ${absence.notes}` : ''}`,
            status: "pending",
          });
        }
        
        if (compensationRecords.length > 0) {
          await supabase.from("absence_compensations").insert(compensationRecords);
        }
      }

      return { data, requiresCompensation: needsCompensation };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      
      toast.success(result.requiresCompensation 
        ? "Отсутствие добавлено (с требованием отработки)" 
        : "Отсутствие добавлено"
      );
    },
    onError: (error) => {
      console.error("Error creating absence:", error);
      toast.error("Ошибка при добавлении отсутствия");
    },
  });
};

export const useUpdateOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OperatorAbsence> & { id: string }) => {
      const { data, error } = await supabase
        .from("operator_absences")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      toast.success("Отсутствие обновлено");
    },
    onError: (error) => {
      console.error("Error updating absence:", error);
      toast.error("Ошибка при обновлении отсутствия");
    },
  });
};

export const useDeleteOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operator_absences")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      toast.success("Отсутствие удалено");
    },
    onError: (error) => {
      console.error("Error deleting absence:", error);
      toast.error("Ошибка при удалении отсутствия");
    },
  });
};

// Hook to merge duplicate absences for an operator
export const useMergeOperatorAbsences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ operatorId, startDate, endDate }: { 
      operatorId: string; 
      startDate?: string; 
      endDate?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('merge_operator_absences', {
          p_operator_id: operatorId,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });

      if (error) throw error;
      return data as { merged_count: number; remaining_count: number }[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      const result = data?.[0];
      if (result && result.merged_count > 0) {
        toast.success(`Объединено записей: ${result.merged_count}. Осталось: ${result.remaining_count}`);
      } else {
        toast.info("Дубликатов не найдено");
      }
    },
    onError: (error) => {
      console.error("Error merging absences:", error);
      toast.error("Ошибка при объединении отсутствий");
    },
  });
};
export const isDateInAbsence = (
  date: Date,
  absences: OperatorAbsence[],
  operatorId: string
): OperatorAbsence | null => {
  const dateStr = format(date, "yyyy-MM-dd");

  for (const absence of absences) {
    if (
      absence.operator_id === operatorId &&
      absence.status === "approved" &&
      dateStr >= absence.start_date &&
      dateStr <= absence.end_date
    ) {
      return absence;
    }
  }
  
  return null;
};

// Helper to check if operator is terminated
export const isOperatorTerminated = (operator: any, date: Date): boolean => {
  if (!operator.termination_date) return false;
  const terminationDate = new Date(operator.termination_date);
  return date > terminationDate;
};

// Helper to check if date is before hire date
export const isBeforeHireDate = (operator: any, date: Date): boolean => {
  if (!operator.hire_date) return false;
  const hireDate = new Date(operator.hire_date);
  return date < hireDate;
};
