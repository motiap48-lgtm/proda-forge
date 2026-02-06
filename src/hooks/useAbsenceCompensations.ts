import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cancelCompensableAbsenceDay, restoreCompensableAbsenceDay } from "@/hooks/absenceCompensationAbsenceSync";

export interface AbsenceCompensation {
  id: string;
  operator_id: string;
  absence_date: string;
  absence_hours: number;
  reason: string | null;
  status: "pending" | "partial" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  created_by: string | null;
  compensation_records?: CompensationRecord[];
}

export interface CompensationRecord {
  id: string;
  absence_compensation_id: string;
  operator_id: string;
  compensation_date: string;
  hours_worked: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  status: "pending" | "confirmed";
}

export interface OperatorCompensationBalance {
  operatorId: string;
  totalAbsenceHours: number;
  totalCompensatedHours: number;
  pendingHours: number;
  pendingCompensations: AbsenceCompensation[];
  // Timesheet deficit: when actual < planned (e.g. left early)
  timesheetDeficitHours: number;
  // Combined total: absence pending + timesheet deficit
  totalPendingHours: number;
}

export interface OperatorCompensationBalanceByPeriod {
  operatorId: string;
  // Previous months of current year
  previousMonthsHours: number;
  previousMonthsAbsences: AbsenceCompensation[];
  // Current month
  currentMonthHours: number;
  currentMonthAbsences: AbsenceCompensation[];
  // Total
  totalPendingHours: number;
  // Year info
  year: number;
  currentMonth: number;
}

export const COMPENSATION_STATUS_LABELS = {
  pending: { label: "Ожидание отработки", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  partial: { label: "Частично отработано", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  completed: { label: "Отработано", color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  cancelled: { label: "Отменено", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" },
};

// Helper function to calculate status based on CONFIRMED records only
// Hours should only be subtracted after confirmation, not after assignment
export const calculateCompensationStatus = (
  absenceHours: number,
  compensationRecords: CompensationRecord[] | undefined
): "pending" | "partial" | "completed" => {
  if (!compensationRecords || compensationRecords.length === 0) {
    return "pending";
  }

  // Only count confirmed records for status calculation
  const totalConfirmedHours = compensationRecords.reduce(
    (sum, r) => r.status === "confirmed" ? sum + Number(r.hours_worked) : sum,
    0
  );

  // If all absence hours are confirmed -> completed
  if (totalConfirmedHours >= absenceHours) {
    return "completed";
  }

  // Status is "partial" ONLY if there are confirmed hours (not just pending records)
  if (totalConfirmedHours > 0) {
    return "partial";
  }

  // No confirmed records yet -> pending (regardless of pending records existing)
  return "pending";
};

// Fetch absence compensations for operators
export const useAbsenceCompensations = (operatorIds?: string[], dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ["absence-compensations", operatorIds, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("absence_compensations")
        .select(`
          *,
          compensation_records (*)
        `)
        .order("absence_date", { ascending: false });

      if (operatorIds && operatorIds.length > 0) {
        query = query.in("operator_id", operatorIds);
      }

      if (dateRange?.from) {
        query = query.gte("absence_date", dateRange.from.toISOString().split("T")[0]);
      }
      if (dateRange?.to) {
        query = query.lte("absence_date", dateRange.to.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AbsenceCompensation[];
    },
    enabled: true,
    staleTime: 0, // Always refetch on invalidation
  });
};

// Calculate compensation balance for an operator (current year only by default)
// Includes both absence_compensations (pending hours) and timesheet deficit (actual < planned)
export const useOperatorCompensationBalance = (operatorId: string, year?: number) => {
  const currentYear = year ?? new Date().getFullYear();
  
  return useQuery({
    queryKey: ["operator-compensation-balance", operatorId, currentYear],
    queryFn: async () => {
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      
      // 1. Fetch absence compensations
      const { data: compensations, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("operator_id", operatorId)
        .neq("status", "cancelled")
        .gte("absence_date", startOfYear)
        .lte("absence_date", endOfYear);

      if (compError) throw compError;

      // 2. Fetch timesheets for the year to calculate deficit
      const { data: timesheets, error: tsError } = await supabase
        .from("operator_timesheets")
        .select("work_date, planned_minutes, actual_minutes")
        .eq("operator_id", operatorId)
        .gte("work_date", startOfYear)
        .lte("work_date", endOfYear);

      if (tsError) throw tsError;

      const absenceCompensations = compensations as AbsenceCompensation[];
      
      let totalAbsenceHours = 0;
      let totalCompensatedHours = 0;
      const pendingCompensations: AbsenceCompensation[] = [];

      absenceCompensations.forEach((comp) => {
        totalAbsenceHours += Number(comp.absence_hours);
        
        // Only count confirmed compensation records
        const compensatedHours = comp.compensation_records?.reduce(
          (sum, record) => {
            // Only count confirmed records in the balance
            if (record.status === "confirmed") {
              return sum + Number(record.hours_worked);
            }
            return sum;
          },
          0
        ) || 0;
        
        totalCompensatedHours += compensatedHours;
        
        if (comp.status === "pending" || comp.status === "partial") {
          pendingCompensations.push(comp);
        }
      });

      // 3. Calculate timesheet deficit: sum of (planned - actual) where actual < planned
      // Exclude dates that already have absence_compensations (to avoid double counting)
      const compensationDates = new Set(absenceCompensations.map(c => c.absence_date));
      
      let timesheetDeficitMinutes = 0;
      (timesheets || []).forEach((ts: { work_date: string; planned_minutes: number; actual_minutes: number }) => {
        // Skip if this date already has an absence compensation
        if (compensationDates.has(ts.work_date)) return;
        
        const planned = Number(ts.planned_minutes) || 0;
        const actual = Number(ts.actual_minutes) || 0;
        
        if (actual < planned) {
          timesheetDeficitMinutes += (planned - actual);
        }
      });

      const timesheetDeficitHours = Math.round((timesheetDeficitMinutes / 60) * 100) / 100;
      const pendingHours = totalAbsenceHours - totalCompensatedHours;
      const totalPendingHours = pendingHours + timesheetDeficitHours;

      return {
        operatorId,
        totalAbsenceHours,
        totalCompensatedHours,
        pendingHours,
        pendingCompensations,
        timesheetDeficitHours,
        totalPendingHours,
        year: currentYear,
      } as OperatorCompensationBalance & { year: number };
    },
    enabled: !!operatorId,
    staleTime: 0, // Always refetch on invalidation
  });
};

// Calculate compensation balance with breakdown by period (previous months vs current month)
export const useOperatorCompensationBalanceByPeriod = (operatorId: string, viewDate?: Date) => {
  const date = viewDate ?? new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // 1-12
  
  return useQuery({
    queryKey: ["operator-compensation-balance-by-period", operatorId, currentYear, currentMonth],
    queryFn: async () => {
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;
      const startOfCurrentMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfCurrentMonth = currentMonth === 12 
        ? `${currentYear}-12-31`
        : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      
      // Fetch all absence compensations for the year
      const { data: compensations, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("operator_id", operatorId)
        .neq("status", "cancelled")
        .gte("absence_date", startOfYear)
        .lte("absence_date", endOfYear);

      if (compError) throw compError;

      const absenceCompensations = compensations as AbsenceCompensation[];
      
      let previousMonthsHours = 0;
      let currentMonthHours = 0;
      const previousMonthsAbsences: AbsenceCompensation[] = [];
      const currentMonthAbsences: AbsenceCompensation[] = [];

      absenceCompensations.forEach((comp) => {
        const absenceMonth = new Date(comp.absence_date).getMonth() + 1;
        const absenceHours = Number(comp.absence_hours);
        
        // Calculate confirmed hours for this absence
        const confirmedHours = comp.compensation_records?.reduce(
          (sum, record) => {
            if (record.status === "confirmed") {
              return sum + Number(record.hours_worked);
            }
            return sum;
          },
          0
        ) || 0;
        
        const remainingHours = Math.max(0, absenceHours - confirmedHours);
        
        if (remainingHours > 0) {
          if (absenceMonth < currentMonth) {
            previousMonthsHours += remainingHours;
            previousMonthsAbsences.push(comp);
          } else if (absenceMonth === currentMonth) {
            currentMonthHours += remainingHours;
            currentMonthAbsences.push(comp);
          }
        }
      });

      return {
        operatorId,
        previousMonthsHours: Math.round(previousMonthsHours * 100) / 100,
        previousMonthsAbsences,
        currentMonthHours: Math.round(currentMonthHours * 100) / 100,
        currentMonthAbsences,
        totalPendingHours: Math.round((previousMonthsHours + currentMonthHours) * 100) / 100,
        year: currentYear,
        currentMonth,
      } as OperatorCompensationBalanceByPeriod;
    },
    enabled: !!operatorId,
    staleTime: 0,
  });
};

// Create absence compensation
export const useCreateAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      operator_id: string;
      absence_date: string;
      absence_hours: number;
      reason?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("absence_compensations")
        .insert({
          operator_id: data.operator_id,
          absence_date: data.absence_date,
          absence_hours: data.absence_hours,
          reason: data.reason || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success("Отсутствие добавлено для отработки");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Add compensation record
export const useAddCompensationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      absence_compensation_id: string;
      operator_id: string;
      compensation_date: string;
      hours_worked: number;
      notes?: string;
    }) => {
      // Add compensation record with pending status
      const { data: record, error: recordError } = await supabase
        .from("compensation_records")
        .insert({
          absence_compensation_id: data.absence_compensation_id,
          operator_id: data.operator_id,
          compensation_date: data.compensation_date,
          hours_worked: data.hours_worked,
          notes: data.notes || null,
          status: "pending", // New records start as pending
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Get the compensation and check if fully compensated
      const { data: compensation, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", data.absence_compensation_id)
        .single();

      if (compError) throw compError;

      const absComp = compensation as AbsenceCompensation;
      
      // Calculate status based on new logic:
      // - pending: records exist but dates haven't passed
      // - partial: at least one date has passed (awaiting confirmation) or has confirmed hours
      // - completed: all hours confirmed
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      const { error: updateError } = await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);

      if (updateError) throw updateError;

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success("Отработка добавлена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Update absence compensation status
export const useUpdateAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      updates: Partial<Pick<AbsenceCompensation, "status" | "absence_hours" | "reason">>;
    }) => {
      const { data: result, error } = await supabase
        .from("absence_compensations")
        .update(data.updates)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success("Запись обновлена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Delete absence compensation completely (when no compensation records exist)
export const useDeleteAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if there are any compensation records
      const { data: compensation, error: checkError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (id)`)
        .eq("id", id)
        .single();

      if (checkError) throw checkError;

      // If there are compensation records, just cancel instead of delete
      if (compensation.compensation_records && compensation.compensation_records.length > 0) {
        const { error: updateError } = await supabase
          .from("absence_compensations")
          .update({ status: "cancelled" })
          .eq("id", id);
        
        if (updateError) throw updateError;
        return { action: "cancelled", compensation };
      }

      // If no compensation records, delete completely
      const { error } = await supabase
        .from("absence_compensations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Also delete corresponding operator_absences record for this date
      // Find and delete operator absence that covers this exact date
      const absenceDate = compensation.absence_date;
      const operatorId = compensation.operator_id;

      // Delete operator_absences where the absence is for this single day
      const { data: matchingAbsences } = await supabase
        .from("operator_absences")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("start_date", absenceDate)
        .eq("end_date", absenceDate);

      if (matchingAbsences && matchingAbsences.length > 0) {
        await supabase
          .from("operator_absences")
          .delete()
          .eq("operator_id", operatorId)
          .eq("start_date", absenceDate)
          .eq("end_date", absenceDate);
      }

      return { action: "deleted", compensation };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success(result.action === "deleted" ? "Запись удалена" : "Запись отменена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Update compensation record
export const useUpdateCompensationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      absence_compensation_id: string;
      compensation_date: string;
      hours_worked: number;
      notes?: string;
    }) => {
      const { error: updateError } = await supabase
        .from("compensation_records")
        .update({
          compensation_date: data.compensation_date,
          hours_worked: data.hours_worked,
          notes: data.notes || null,
        })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // Recalculate status
      const { data: compensation, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", data.absence_compensation_id)
        .single();

      if (compError) throw compError;

      const absComp = compensation as AbsenceCompensation;
      
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Отработка обновлена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Delete compensation record
export const useDeleteCompensationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; absence_compensation_id: string }) => {
      const { error } = await supabase
        .from("compensation_records")
        .delete()
        .eq("id", data.id);

      if (error) throw error;

      // Recalculate status
      const { data: compensation, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", data.absence_compensation_id)
        .single();

      if (compError) throw compError;

      const absComp = compensation as AbsenceCompensation;
      
      // Calculate status based on new logic
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Запись отработки удалена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Confirm compensation record (can only confirm if date has passed)
export const useConfirmCompensationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; absence_compensation_id: string }) => {
      // First get the record to check the date
      const { data: record, error: fetchError } = await supabase
        .from("compensation_records")
        .select("*")
        .eq("id", data.id)
        .single();

      if (fetchError) throw fetchError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const compensationDate = new Date(record.compensation_date);
      compensationDate.setHours(0, 0, 0, 0);

      if (compensationDate > today) {
        throw new Error("Нельзя подтвердить отработку до наступления даты");
      }

      // Update status to confirmed
      const { error: updateError } = await supabase
        .from("compensation_records")
        .update({ status: "confirmed" })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // Recalculate absence compensation status based on confirmed records only
      const { data: compensation, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", data.absence_compensation_id)
        .single();

      if (compError) throw compError;

      const absComp = compensation as AbsenceCompensation;
      
      // Calculate status based on new logic
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);

      return { success: true };
    },
    onSuccess: () => {
      // Use refetchQueries for immediate UI update
      queryClient.refetchQueries({ queryKey: ["absence-compensations"], type: "all" });
      queryClient.refetchQueries({ queryKey: ["operator-compensation-balance"], type: "all" });
      queryClient.refetchQueries({ queryKey: ["operator-compensation-balance-by-period"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Отработка подтверждена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Unconfirm (revert) compensation record
export const useUnconfirmCompensationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; absence_compensation_id: string }) => {
      // Update status back to pending
      const { error: updateError } = await supabase
        .from("compensation_records")
        .update({ status: "pending" })
        .eq("id", data.id);

      if (updateError) throw updateError;

      // Recalculate absence compensation status
      const { data: compensation, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", data.absence_compensation_id)
        .single();

      if (compError) throw compError;

      const absComp = compensation as AbsenceCompensation;
      
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);

      return { success: true };
    },
    onSuccess: () => {
      // Use refetchQueries for immediate UI update
      queryClient.refetchQueries({ queryKey: ["absence-compensations"], type: "all" });
      queryClient.refetchQueries({ queryKey: ["operator-compensation-balance"], type: "all" });
      queryClient.refetchQueries({ queryKey: ["operator-compensation-balance-by-period"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Подтверждение отработки отменено");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Cancel absence compensation (set status to cancelled)
// Also cancels the corresponding operator_absences record for calendar display
export const useCancelAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the compensation to find the related absence
      const { data: compensation, error: fetchError } = await supabase
        .from("absence_compensations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Update the absence_compensations status to cancelled
      const { data: updated, error } = await supabase
        .from("absence_compensations")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Also cancel the corresponding operator_absences record for this date.
      // IMPORTANT: absences can be ranges -> we split to cancel only this day.
      const absenceDate = compensation.absence_date;
      const operatorId = compensation.operator_id;

      await cancelCompensableAbsenceDay({ operatorId, absenceDate });

      return { success: true, compensation: updated };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      await queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      await queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      await queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      await queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Запись об отработке и отсутствие отменены");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Restore cancelled absence compensation
// Also restores the corresponding operator_absences record
export const useRestoreAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the compensation to recalculate status
      const { data: compensation, error: fetchError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const absComp = compensation as AbsenceCompensation;
      
      // Calculate correct status based on records
      const newStatus = calculateCompensationStatus(
        Number(absComp.absence_hours),
        absComp.compensation_records
      );

      const { error } = await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      // Also restore the corresponding operator_absences record for this date
      // This restores the absence indicator on the calendar
      const absenceDate = compensation.absence_date;
      const operatorId = compensation.operator_id;

      await restoreCompensableAbsenceDay({ operatorId, absenceDate });

      return { success: true, compensation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Запись отработки и отсутствие восстановлены");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Force delete absence compensation (including all records)
export const useForceDeleteAbsenceCompensation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the compensation details
      const { data: compensation, error: fetchError } = await supabase
        .from("absence_compensations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Delete all compensation records first
      const { error: recordsError } = await supabase
        .from("compensation_records")
        .delete()
        .eq("absence_compensation_id", id);

      if (recordsError) throw recordsError;

      // Delete the absence compensation
      const { error } = await supabase
        .from("absence_compensations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Also delete corresponding operator_absences record for this date
      const absenceDate = compensation.absence_date;
      const operatorId = compensation.operator_id;

      await supabase
        .from("operator_absences")
        .delete()
        .eq("operator_id", operatorId)
        .eq("start_date", absenceDate)
        .eq("end_date", absenceDate);

      return { success: true, compensation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["operator-timesheets"] });
      toast.success("Запись полностью удалена");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};

// Delete all absence compensations for an operator
export const useDeleteAllOperatorCompensations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operatorId: string) => {
      // First delete all compensation records for this operator
      const { error: recordsError } = await supabase
        .from("compensation_records")
        .delete()
        .eq("operator_id", operatorId);

      if (recordsError) throw recordsError;

      // Then delete all absence compensations
      const { error: compensationsError } = await supabase
        .from("absence_compensations")
        .delete()
        .eq("operator_id", operatorId);

      if (compensationsError) throw compensationsError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["operator-absences"] });
      queryClient.invalidateQueries({ queryKey: ["all-operator-absences"] });
      toast.success("Все записи отработки удалены");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};
