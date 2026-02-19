import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmploymentHistoryRecord {
  id: string;
  operator_id: string;
  event_type: string;
  event_date: string;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EmploymentPeriodSimple {
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = currently employed
}

// Map of operator_id -> array of employment periods
export type EmploymentPeriodsMap = Map<string, EmploymentPeriodSimple[]>;

/**
 * Build employment periods from history records.
 * Chains: hired→terminated→reinstated→terminated...
 */
export function buildEmploymentPeriodsMap(records: EmploymentHistoryRecord[]): EmploymentPeriodsMap {
  const map: EmploymentPeriodsMap = new Map();
  
  // Group by operator_id
  const byOperator = new Map<string, EmploymentHistoryRecord[]>();
  records.forEach(r => {
    if (!byOperator.has(r.operator_id)) byOperator.set(r.operator_id, []);
    byOperator.get(r.operator_id)!.push(r);
  });
  
  byOperator.forEach((events, operatorId) => {
    // Sort by event_date ascending
    const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
    const periods: EmploymentPeriodSimple[] = [];
    let currentStart: string | null = null;
    
    for (const event of sorted) {
      if (event.event_type === "hired" || event.event_type === "reinstated") {
        currentStart = event.event_date;
      } else if (event.event_type === "terminated" && currentStart) {
        periods.push({ startDate: currentStart, endDate: event.event_date });
        currentStart = null;
      }
    }
    
    // Open period (currently employed)
    if (currentStart) {
      periods.push({ startDate: currentStart, endDate: null });
    }
    
    map.set(operatorId, periods);
  });
  
  return map;
}

/**
 * Check if a date falls OUTSIDE all employment periods for an operator.
 * Returns true if the date is NOT within any active employment period.
 */
export function isDateOutsideEmployment(
  operatorId: string,
  dateStr: string,
  periodsMap: EmploymentPeriodsMap
): boolean {
  const periods = periodsMap.get(operatorId);
  if (!periods || periods.length === 0) return false; // No history = don't restrict
  
  for (const period of periods) {
    if (dateStr < period.startDate) continue;
    if (period.endDate === null || dateStr <= period.endDate) {
      return false; // Date is within this period
    }
  }
  
  return true; // Date is outside all periods
}

/**
 * Check if a date is BEFORE the first employment period for an operator.
 * Returns true only if the date is before the very first hire date.
 */
export function isDateBeforeFirstEmployment(
  operatorId: string,
  dateStr: string,
  periodsMap: EmploymentPeriodsMap
): boolean {
  const periods = periodsMap.get(operatorId);
  if (!periods || periods.length === 0) return false;
  
  // Periods are sorted chronologically, so first period has earliest start
  return dateStr < periods[0].startDate;
}

/**
 * Fetch all employment history records for all operators
 */
export const useAllEmploymentHistory = () => {
  return useQuery({
    queryKey: ["employment-history", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employment_history")
        .select("*")
        .order("event_date", { ascending: true });
      
      if (error) throw error;
      return data as EmploymentHistoryRecord[];
    },
  });
};

// Helper to sync hire date with employment history
export const syncHireDateWithHistory = async (
  operatorId: string,
  hireDate: string | null,
  userId?: string | null
) => {
  if (!hireDate) return;

  // Check if there's already a "hired" record for this operator
  const { data: existingHired, error: fetchError } = await supabase
    .from("employment_history")
    .select("id, event_date")
    .eq("operator_id", operatorId)
    .eq("event_type", "hired")
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingHired) {
    // Update existing hired record if date changed
    if (existingHired.event_date !== hireDate) {
      const { error: updateError } = await supabase
        .from("employment_history")
        .update({ event_date: hireDate })
        .eq("id", existingHired.id);

      if (updateError) throw updateError;
    }
  } else {
    // Create new hired record
    const { error: insertError } = await supabase
      .from("employment_history")
      .insert({
        operator_id: operatorId,
        event_type: "hired",
        event_date: hireDate,
        reason: "Приём на работу",
        created_by: userId,
      });

    if (insertError) throw insertError;
  }
};

 // Get archived (terminated) operators
 export const useArchivedOperators = () => {
   return useQuery({
     queryKey: ["operators", "archived"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("operators")
         .select(`
           *,
           work_centers:default_work_center_id (id, name, code)
         `)
         .eq("is_active", false)
         .not("termination_date", "is", null)
         .order("termination_date", { ascending: false });
 
       if (error) throw error;
       return data;
     },
   });
 };
 
 // Get employment history for an operator
 export const useEmploymentHistory = (operatorId: string | null) => {
   return useQuery({
     queryKey: ["employment-history", operatorId],
     queryFn: async () => {
       if (!operatorId) return [];
       
       const { data, error } = await supabase
         .from("employment_history")
         .select("*")
         .eq("operator_id", operatorId)
         .order("event_date", { ascending: false });
 
       if (error) throw error;
       return data;
     },
     enabled: !!operatorId,
   });
 };
 
  // Terminate operator
  export const useTerminateOperator = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({
        operatorId,
        terminationDate,
        reason,
        notes,
      }: {
        operatorId: string;
        terminationDate: string;
        reason: string;
        notes?: string;
      }) => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if the current employment period has started yet
        // (e.g. reinstated with a future date — cannot terminate before it starts)
        const { data: lastHireEvent } = await supabase
          .from("employment_history")
          .select("event_date")
          .eq("operator_id", operatorId)
          .in("event_type", ["hired", "reinstated"])
          .order("event_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastHireEvent) {
          const today = new Date().toISOString().split("T")[0];
          if (lastHireEvent.event_date > today) {
            throw new Error("Невозможно уволить сотрудника: дата приёма/восстановления ещё не наступила (" + lastHireEvent.event_date + ")");
          }
        }

        // Check if termination date is in the future
        const today = new Date().toISOString().split("T")[0];
        const isFutureTermination = terminationDate > today;
        
        // Update operator - keep active if future date
        const { error: updateError } = await supabase
          .from("operators")
          .update({
            is_active: isFutureTermination ? true : false,
            termination_date: terminationDate,
            termination_reason: reason,
          })
          .eq("id", operatorId);
  
        if (updateError) throw updateError;
  
        // Add history record
        const { error: historyError } = await supabase
          .from("employment_history")
          .insert({
            operator_id: operatorId,
            event_type: "terminated",
            event_date: terminationDate,
            reason,
            notes,
            created_by: user?.id,
          });
  
        if (historyError) throw historyError;
      },
      onSuccess: (_, variables) => {
        const today = new Date().toISOString().split("T")[0];
        const isFuture = variables.terminationDate > today;
        queryClient.invalidateQueries({ queryKey: ["operators"] });
        queryClient.invalidateQueries({ queryKey: ["employment-history"] });
        if (isFuture) {
          toast.success(`Увольнение запланировано на ${variables.terminationDate}`);
        } else {
          toast.success("Сотрудник уволен и перемещён в архив");
        }
      },
      onError: (error: any) => {
        toast.error("Ошибка: " + error.message);
      },
    });
  };

  // Auto-deactivate operators with past termination dates
  export const useAutoDeactivateOperators = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const today = new Date().toISOString().split("T")[0];
        
        // Find active operators with termination_date <= today
        const { data: pendingTerminations, error: fetchError } = await supabase
          .from("operators")
          .select("id, full_name")
          .eq("is_active", true)
          .not("termination_date", "is", null)
          .lte("termination_date", today);

        if (fetchError) throw fetchError;
        if (!pendingTerminations || pendingTerminations.length === 0) return [];

        // Deactivate them
        const ids = pendingTerminations.map(op => op.id);
        const { error: updateError } = await supabase
          .from("operators")
          .update({ is_active: false })
          .in("id", ids);

        if (updateError) throw updateError;
        return pendingTerminations;
      },
      onSuccess: (deactivated) => {
        if (deactivated && deactivated.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["operators"] });
          queryClient.invalidateQueries({ queryKey: ["operators", "archived"] });
          toast.info(`Автоматически уволено: ${deactivated.map(o => o.full_name).join(", ")}`);
        }
      },
    });
  };

  // Update a scheduled termination (change date/reason)
  export const useUpdateTermination = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        operatorId,
        terminationDate,
        reason,
        notes,
      }: {
        operatorId: string;
        terminationDate: string;
        reason: string;
        notes?: string;
      }) => {
        const today = new Date().toISOString().split("T")[0];
        const isFuture = terminationDate > today;

        // Update operator record
        const { error: updateError } = await supabase
          .from("operators")
          .update({
            is_active: isFuture ? true : false,
            termination_date: terminationDate,
            termination_reason: reason,
          })
          .eq("id", operatorId);

        if (updateError) throw updateError;

        // Update the latest terminated history record
        const { data: historyRecord } = await supabase
          .from("employment_history")
          .select("id")
          .eq("operator_id", operatorId)
          .eq("event_type", "terminated")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historyRecord) {
          const { error: historyError } = await supabase
            .from("employment_history")
            .update({
              event_date: terminationDate,
              reason,
              notes,
            })
            .eq("id", historyRecord.id);

          if (historyError) throw historyError;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["operators"] });
        queryClient.invalidateQueries({ queryKey: ["operators", "archived"] });
        queryClient.invalidateQueries({ queryKey: ["employment-history"] });
        toast.success("Данные увольнения обновлены");
      },
      onError: (error: any) => {
        toast.error("Ошибка: " + error.message);
      },
    });
  };

  // Cancel a scheduled termination
  export const useCancelTermination = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (operatorId: string) => {
        // Clear termination from operator
        const { error: updateError } = await supabase
          .from("operators")
          .update({
            is_active: true,
            termination_date: null,
            termination_reason: null,
          })
          .eq("id", operatorId);

        if (updateError) throw updateError;

        // Delete the latest terminated history record
        const { data: historyRecord } = await supabase
          .from("employment_history")
          .select("id")
          .eq("operator_id", operatorId)
          .eq("event_type", "terminated")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historyRecord) {
          const { error: deleteError } = await supabase
            .from("employment_history")
            .delete()
            .eq("id", historyRecord.id);

          if (deleteError) throw deleteError;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["operators"] });
        queryClient.invalidateQueries({ queryKey: ["operators", "archived"] });
        queryClient.invalidateQueries({ queryKey: ["employment-history"] });
        toast.success("Увольнение отменено");
      },
      onError: (error: any) => {
        toast.error("Ошибка: " + error.message);
      },
    });
  };
 
// Update employment history record
export const useUpdateEmploymentHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      event_type,
      event_date,
      reason,
      notes,
    }: {
      id: string;
      event_type: string;
      event_date: string;
      reason?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("employment_history")
        .update({
          event_type,
          event_date,
          reason,
          notes,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-history"] });
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Запись истории обновлена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Delete single employment history record
export const useDeleteEmploymentHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employment_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-history"] });
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Запись удалена");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Bulk delete employment history records
export const useBulkDeleteEmploymentHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Process in batches of 100
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        batches.push(ids.slice(i, i + batchSize));
      }

      await Promise.all(
        batches.map(async (batch) => {
          const { error } = await supabase
            .from("employment_history")
            .delete()
            .in("id", batch);

          if (error) throw error;
        })
      );
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["employment-history"] });
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success(`Удалено записей: ${ids.length}`);
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

  // Reinstate operator
  export const useReinstateOperator = () => {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({
        operatorId,
        hireDate,
        notes,
      }: {
        operatorId: string;
        hireDate?: string;
        notes?: string;
      }) => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        const reinstateDate = hireDate || new Date().toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];
        const isFutureReinstatement = reinstateDate > today;
        
         // Update operator - preserve original hire_date
         // If reinstatement is in the future, keep is_active=false and preserve termination fields
         // so the operator stays visible in archive until reinstatement date
         const updateData = isFutureReinstatement
           ? { is_active: false as const }
           : { is_active: true as const, termination_date: null, termination_reason: null };
         
         const { error: updateError } = await supabase
           .from("operators")
           .update(updateData)
           .eq("id", operatorId);
  
        if (updateError) throw updateError;
  
        // Add history record
        const { error: historyError } = await supabase
          .from("employment_history")
          .insert({
            operator_id: operatorId,
            event_type: "reinstated",
            event_date: reinstateDate,
            reason: "Восстановление на работу",
            notes,
            created_by: user?.id,
          });
  
        if (historyError) throw historyError;
      },
      onSuccess: (_, variables) => {
        const today = new Date().toISOString().split("T")[0];
        const reinstateDate = variables.hireDate || today;
        queryClient.invalidateQueries({ queryKey: ["operators"] });
        queryClient.invalidateQueries({ queryKey: ["operators", "archived"] });
        queryClient.invalidateQueries({ queryKey: ["employment-history"] });
        if (reinstateDate > today) {
          toast.success(`Восстановление запланировано на ${reinstateDate}`);
        } else {
          toast.success("Сотрудник восстановлен");
        }
      },
      onError: (error: any) => {
        toast.error("Ошибка: " + error.message);
      },
    });
  };

  // Auto-reinstate operators with past reinstatement dates
  export const useAutoReinstateOperators = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const today = new Date().toISOString().split("T")[0];
        
        // Find inactive operators with a future "reinstated" event that has now arrived
        const { data: pendingReinstatements, error: fetchError } = await supabase
          .from("employment_history")
          .select("operator_id, event_date")
          .eq("event_type", "reinstated")
          .lte("event_date", today)
          .order("event_date", { ascending: false });

        if (fetchError) throw fetchError;
        if (!pendingReinstatements || pendingReinstatements.length === 0) return [];

        // Get unique operator IDs
        const operatorIds = [...new Set(pendingReinstatements.map(r => r.operator_id))];

        // Check which of these operators are still inactive
        const { data: inactiveOps, error: opsError } = await supabase
          .from("operators")
          .select("id, full_name")
          .eq("is_active", false)
          .in("id", operatorIds);

        if (opsError) throw opsError;
        if (!inactiveOps || inactiveOps.length === 0) return [];

        // Activate them and clear termination fields
        const ids = inactiveOps.map(op => op.id);
        const { error: updateError } = await supabase
          .from("operators")
          .update({ is_active: true, termination_date: null, termination_reason: null })
          .in("id", ids);

        if (updateError) throw updateError;
        return inactiveOps;
      },
      onSuccess: (reinstated) => {
        if (reinstated && reinstated.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["operators"] });
          queryClient.invalidateQueries({ queryKey: ["operators", "archived"] });
          toast.info(`Автоматически восстановлено: ${reinstated.map(o => o.full_name).join(", ")}`);
        }
      },
    });
  };

  // Get pending reinstatement date for an operator from employment history
  export const usePendingReinstatement = (operatorId: string | null) => {
    return useQuery({
      queryKey: ["pending-reinstatement", operatorId],
      queryFn: async () => {
        if (!operatorId) return null;
        const today = new Date().toISOString().split("T")[0];
        
        const { data, error } = await supabase
          .from("employment_history")
          .select("event_date")
          .eq("operator_id", operatorId)
          .eq("event_type", "reinstated")
          .gt("event_date", today)
          .order("event_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data?.event_date || null;
      },
      enabled: !!operatorId,
    });
  };