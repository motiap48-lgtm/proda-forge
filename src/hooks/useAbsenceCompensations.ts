import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export const COMPENSATION_STATUS_LABELS = {
  pending: { label: "Ожидает отработки", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  partial: { label: "Частично отработано", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  completed: { label: "Отработано", color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  cancelled: { label: "Отменено", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" },
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
  });
};

// Calculate compensation balance for an operator
export const useOperatorCompensationBalance = (operatorId: string) => {
  return useQuery({
    queryKey: ["operator-compensation-balance", operatorId],
    queryFn: async () => {
      const { data: compensations, error: compError } = await supabase
        .from("absence_compensations")
        .select(`*, compensation_records (*)`)
        .eq("operator_id", operatorId)
        .neq("status", "cancelled");

      if (compError) throw compError;

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

      return {
        operatorId,
        totalAbsenceHours,
        totalCompensatedHours,
        pendingHours: totalAbsenceHours - totalCompensatedHours,
        pendingCompensations,
      } as OperatorCompensationBalance;
    },
    enabled: !!operatorId,
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
      const totalCompensated = absComp.compensation_records?.reduce(
        (sum, r) => sum + Number(r.hours_worked),
        0
      ) || 0;

      // Update status based on compensation
      let newStatus: string = "partial";
      if (totalCompensated >= Number(absComp.absence_hours)) {
        newStatus = "completed";
      }

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
        return { action: "cancelled" };
      }

      // If no compensation records, delete completely
      const { error } = await supabase
        .from("absence_compensations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { action: "deleted" };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success(result.action === "deleted" ? "Запись удалена" : "Запись отменена");
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
      const totalCompensated = absComp.compensation_records?.reduce(
        (sum, r) => sum + Number(r.hours_worked),
        0
      ) || 0;

      let newStatus: string = "pending";
      if (totalCompensated > 0 && totalCompensated < Number(absComp.absence_hours)) {
        newStatus = "partial";
      } else if (totalCompensated >= Number(absComp.absence_hours)) {
        newStatus = "completed";
      }

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
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
      const totalConfirmedHours = absComp.compensation_records?.reduce(
        (sum, r) => r.status === "confirmed" ? sum + Number(r.hours_worked) : sum,
        0
      ) || 0;

      let newStatus: string = "pending";
      if (totalConfirmedHours > 0 && totalConfirmedHours < Number(absComp.absence_hours)) {
        newStatus = "partial";
      } else if (totalConfirmedHours >= Number(absComp.absence_hours)) {
        newStatus = "completed";
      }

      await supabase
        .from("absence_compensations")
        .update({ status: newStatus })
        .eq("id", data.absence_compensation_id);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-compensations"] });
      queryClient.invalidateQueries({ queryKey: ["operator-compensation-balance"] });
      toast.success("Отработка подтверждена");
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
      toast.success("Все записи отработки удалены");
    },
    onError: (error: any) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
};
