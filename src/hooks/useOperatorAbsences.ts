import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInCalendarDays, addDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type EmploymentPeriodsMap, isDateOutsideEmployment, isDateBeforeFirstEmployment } from "./useEmploymentHistory";

export interface OperatorAbsence {
  id: string;
  operator_id: string;
  absence_type: 'annual_leave' | 'sick_leave' | 'administrative_leave_with_compensation' | 'administrative_leave_without_compensation' | 'maternity_leave' | 'unpaid_leave' | 'business_trip' | 'unauthorized_absence' | 'other';
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
  administrative_leave_with_compensation: { label: "Административный (с отработкой)", color: "bg-orange-600", icon: "📋" },
  administrative_leave_without_compensation: { label: "Административный (без отработки)", color: "bg-orange-400", icon: "📋" },
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
  'unauthorized_absence',  // Прогул - требует отработки
  'administrative_leave_with_compensation',  // Административный с отработкой
];

// Types of absences that REDUCE the base plan (scheduled capacity):
// - annual_leave (отпуск) - operator is not available, reduces planned capacity
// - maternity_leave (декрет) - long-term, reduces planned capacity
// - other (другое) - generic absence reducing plan (e.g., transferred vacation days)
// 
// Types that do NOT reduce plan (but count as undertime/недоработка):
// - sick_leave (больничный) - plan stays full, absence is undertime
// - business_trip (командировка) - counts as work, doesn't reduce plan
// - unpaid_leave (без сохранения ЗП) - plan stays full, counts as undertime
// - administrative_leave_without_compensation - plan stays full, counts as undertime
// - unauthorized_absence (прогул) - must be compensated, doesn't reduce plan
// - administrative_leave_with_compensation - must be compensated
export const ABSENCES_REDUCING_PLAN: OperatorAbsence["absence_type"][] = [
  'annual_leave',
  'maternity_leave',
  'other',
];

// Helper function to check if absence type requires compensation
export const isCompensableAbsenceType = (type: OperatorAbsence["absence_type"]): boolean => {
  return COMPENSABLE_ABSENCE_TYPES.includes(type);
};

// Helper function to check if absence type reduces the base plan
// These absences mean the operator is genuinely not available and reduces capacity
export const isAbsenceReducingPlan = (type: OperatorAbsence["absence_type"]): boolean => {
  return ABSENCES_REDUCING_PLAN.includes(type);
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
    staleTime: 0, // Always fetch fresh data for absences
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

// Check if any timesheet records exist for the date range (indicating partial work)
export const checkTimesheetConflict = async (
  operatorId: string, 
  startDate: string, 
  endDate: string
): Promise<{ hasConflict: boolean; conflictDates: string[] }> => {
  const { data: timesheets } = await supabase
    .from("operator_timesheets")
    .select("work_date, actual_minutes, planned_minutes")
    .eq("operator_id", operatorId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .gt("actual_minutes", 0); // Only consider dates with actual work recorded

  const conflictDates = timesheets?.map(t => t.work_date) || [];
  return {
    hasConflict: conflictDates.length > 0,
    conflictDates,
  };
};

export const useCreateOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAbsenceParams) => {
      const { requiresCompensation, ...absence } = params;
      
      // Check for timesheet conflicts before creating absence
      const { hasConflict, conflictDates } = await checkTimesheetConflict(
        absence.operator_id,
        absence.start_date,
        absence.end_date
      );
      
      if (hasConflict) {
        const formattedDates = conflictDates.map(d => format(new Date(d), "dd.MM.yyyy")).join(", ");
        throw new Error(`TIMESHEET_CONFLICT:На выбранные даты уже есть записи табеля с отработанными часами (${formattedDates}). Нельзя назначить отсутствие на день с частичной отработкой.`);
      }
      
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
    onError: (error: any) => {
      console.error("Error creating absence:", error);
      // Check if it's an overlap error from the database trigger
      if (error?.code === 'P0001' && error?.message?.includes('Overlapping absence')) {
        toast.error("Указанный период пересекается с существующим отсутствием. Измените даты.");
      } else if (error?.message?.startsWith('TIMESHEET_CONFLICT:')) {
        toast.error(error.message.replace('TIMESHEET_CONFLICT:', ''));
      } else {
        toast.error("Ошибка при добавлении отсутствия");
      }
    },
  });
};

// Extended update params with optional requiresCompensation flag
export interface UpdateAbsenceParams extends Partial<OperatorAbsence> {
  id: string;
  requiresCompensation?: boolean;
}

export const useUpdateOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateAbsenceParams) => {
      const { id, requiresCompensation, ...updates } = params;
      
      const { data, error } = await supabase
        .from("operator_absences")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Determine if compensation is needed:
      // - Either the type is in COMPENSABLE_ABSENCE_TYPES (e.g. unauthorized_absence)
      // - Or the user manually checked requiresCompensation
      const needsCompensation = updates.status === 'approved' && data && 
        (isCompensableAbsenceType(data.absence_type as OperatorAbsence["absence_type"]) || requiresCompensation);

      // If compensation is needed, create compensation records
      if (needsCompensation) {
        const scheduleHours = await getOperatorScheduleHours(data.operator_id);
        
        // Calculate number of days
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        const days = differenceInCalendarDays(endDate, startDate) + 1;
        
        // Check which dates already have compensations
        const { data: existingCompensations } = await supabase
          .from("absence_compensations")
          .select("absence_date")
          .eq("operator_id", data.operator_id)
          .gte("absence_date", data.start_date)
          .lte("absence_date", data.end_date);
        
        const existingDates = new Set(existingCompensations?.map(c => c.absence_date) || []);
        
        // Create compensation records only for missing dates
        const compensationRecords = [];
        for (let i = 0; i < days; i++) {
          const absenceDate = format(addDays(startDate, i), "yyyy-MM-dd");
          if (!existingDates.has(absenceDate)) {
            compensationRecords.push({
              operator_id: data.operator_id,
              absence_date: absenceDate,
              absence_hours: scheduleHours,
              reason: `${ABSENCE_TYPE_LABELS[data.absence_type]?.label || data.absence_type}${data.notes ? `: ${data.notes}` : ''}`,
              status: "pending",
            });
          }
        }
        
        if (compensationRecords.length > 0) {
          await supabase.from("absence_compensations").insert(compensationRecords);
        }
      }

      return { data, requiresCompensation };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success(result.requiresCompensation 
        ? "Отсутствие обновлено (добавлены записи для отработки)" 
        : "Отсутствие обновлено"
      );
    },
    onError: (error: any) => {
      console.error("Error updating absence:", error);
      // Check if it's an overlap error from the database trigger
      if (error?.code === 'P0001' && error?.message?.includes('Overlapping absence')) {
        toast.error("Указанный период пересекается с существующим отсутствием. Измените даты или удалите конфликтующую запись.");
      } else {
        toast.error("Ошибка при обновлении отсутствия");
      }
    },
  });
};

export const useDeleteOperatorAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the absence to know operator_id and dates
      const { data: absence, error: fetchError } = await supabase
        .from("operator_absences")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Delete related absence_compensations for this absence period
      // BUT preserve timesheet deficit compensations (they should not be touched by absence deletion)
      if (absence) {
        // First delete compensation_records linked to absence_compensations for this operator and date range
        // Exclude timesheet deficit records (reason = 'Недоработка по табелю')
        const { data: compensations } = await supabase
          .from("absence_compensations")
          .select("id")
          .eq("operator_id", absence.operator_id)
          .gte("absence_date", absence.start_date)
          .lte("absence_date", absence.end_date)
          .neq("reason", "Недоработка по табелю"); // Preserve timesheet deficits

        if (compensations && compensations.length > 0) {
          const compensationIds = compensations.map(c => c.id);
          
          // Delete compensation records first (due to foreign key)
          await supabase
            .from("compensation_records")
            .delete()
            .in("absence_compensation_id", compensationIds);

          // Then delete absence compensations
          await supabase
            .from("absence_compensations")
            .delete()
            .in("id", compensationIds);
        }
      }

      // Finally delete the absence itself
      const { error } = await supabase
        .from("operator_absences")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success("Отсутствие удалено");
    },
    onError: (error) => {
      console.error("Error deleting absence:", error);
      toast.error("Ошибка при удалении отсутствия");
    },
  });
};

// Bulk delete absences - optimized for speed (no individual toasts, parallel processing)
export const useBulkDeleteOperatorAbsences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absenceIds: string[]) => {
      if (absenceIds.length === 0) return { deleted: 0 };

      // Get all absences to know operator_ids and dates for compensation cleanup
      const { data: absences, error: fetchError } = await supabase
        .from("operator_absences")
        .select("*")
        .in("id", absenceIds);

      if (fetchError) throw fetchError;

      // Collect all compensation IDs that need to be deleted
      // Exclude timesheet deficit records (reason = 'Недоработка по табелю')
      const compensationQueries = absences?.map(async (absence) => {
        const { data } = await supabase
          .from("absence_compensations")
          .select("id")
          .eq("operator_id", absence.operator_id)
          .gte("absence_date", absence.start_date)
          .lte("absence_date", absence.end_date)
          .neq("reason", "Недоработка по табелю"); // Preserve timesheet deficits
        return data || [];
      }) || [];

      const compensationResults = await Promise.all(compensationQueries);
      const allCompensationIds = compensationResults.flat().map(c => c.id);

      // Delete compensation records in batches (due to foreign key)
      if (allCompensationIds.length > 0) {
        // Delete in batches of 100 to avoid query limits
        const batchSize = 100;
        for (let i = 0; i < allCompensationIds.length; i += batchSize) {
          const batch = allCompensationIds.slice(i, i + batchSize);
          await supabase
            .from("compensation_records")
            .delete()
            .in("absence_compensation_id", batch);
        }

        // Delete absence compensations in batches
        for (let i = 0; i < allCompensationIds.length; i += batchSize) {
          const batch = allCompensationIds.slice(i, i + batchSize);
          await supabase
            .from("absence_compensations")
            .delete()
            .in("id", batch);
        }
      }

      // Delete absences in batches
      const batchSize = 100;
      for (let i = 0; i < absenceIds.length; i += batchSize) {
        const batch = absenceIds.slice(i, i + batchSize);
        const { error } = await supabase
          .from("operator_absences")
          .delete()
          .in("id", batch);

        if (error) throw error;
      }

      return { deleted: absenceIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success(`Удалено ${result.deleted} отсутствий`);
    },
    onError: (error) => {
      console.error("Error bulk deleting absences:", error);
      toast.error("Ошибка при массовом удалении отсутствий");
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
// If employmentPeriodsMap is provided, uses employment history periods (supports multiple cycles)
// Otherwise falls back to single termination_date check
// NOTE: With periods map, this returns true for gaps BETWEEN periods and AFTER last terminated period,
// but NOT for dates before the first hire — use isBeforeHireDate for that.
export const isOperatorTerminated = (operator: any, date: Date, employmentPeriodsMap?: EmploymentPeriodsMap): boolean => {
  if (employmentPeriodsMap && employmentPeriodsMap.size > 0) {
    const dateStr = format(date, "yyyy-MM-dd");
    // If before first employment, that's "before hire", not "terminated"
    if (isDateBeforeFirstEmployment(operator.id, dateStr, employmentPeriodsMap)) {
      return false;
    }
    return isDateOutsideEmployment(operator.id, dateStr, employmentPeriodsMap);
  }
  // Fallback: single termination_date
  if (!operator.termination_date) return false;
  const terminationDate = startOfDay(parseISO(operator.termination_date));
  return startOfDay(date) > terminationDate;
};

// Helper to check if date is before hire date
// If employmentPeriodsMap is provided, uses employment history periods (supports multiple cycles)
// Otherwise falls back to single hire_date check
export const isBeforeHireDate = (operator: any, date: Date, employmentPeriodsMap?: EmploymentPeriodsMap): boolean => {
  if (employmentPeriodsMap && employmentPeriodsMap.size > 0) {
    const dateStr = format(date, "yyyy-MM-dd");
    return isDateBeforeFirstEmployment(operator.id, dateStr, employmentPeriodsMap);
  }
  // Fallback: single hire_date
  if (!operator.hire_date) return false;
  const hireDate = startOfDay(parseISO(operator.hire_date));
  return startOfDay(date) < hireDate;
};
