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
       
       // Update operator
       const { error: updateError } = await supabase
         .from("operators")
         .update({
           is_active: false,
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
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["operators"] });
       queryClient.invalidateQueries({ queryKey: ["employment-history"] });
       toast.success("Сотрудник уволен и перемещён в архив");
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
       
       // Update operator
       const { error: updateError } = await supabase
         .from("operators")
         .update({
           is_active: true,
           termination_date: null,
           termination_reason: null,
           hire_date: reinstateDate,
         })
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
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["operators"] });
       queryClient.invalidateQueries({ queryKey: ["employment-history"] });
       toast.success("Сотрудник восстановлен");
     },
     onError: (error: any) => {
       toast.error("Ошибка: " + error.message);
     },
   });
 };