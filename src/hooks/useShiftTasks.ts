import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

// Operator Assignments
export const useOperatorAssignments = (date: Date) => {
  const dateStr = format(date, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["operator-assignments", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_assignments")
        .select(`
          *,
          operators (id, full_name, code),
          production_order_operations (
            id,
            sequence,
            routing_operations (id, name),
            production_orders (id, order_number)
          )
        `)
        .eq("assignment_date", dateStr)
        .order("shift_number");

      if (error) throw error;
      return data;
    },
  });
};

export const useOperatorAssignmentsRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["operator-assignments", "range", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_assignments")
        .select(`
          *,
          operators (id, full_name, code),
          production_order_operations (
            id,
            sequence,
            routing_operations (id, name),
            production_orders (id, order_number)
          )
        `)
        .gte("assignment_date", start)
        .lte("assignment_date", end)
        .order("assignment_date")
        .order("shift_number");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateOperatorAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: any) => {
      const { data, error } = await supabase
        .from("operator_assignments")
        .insert(assignment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-assignments"] });
      toast.success("Назначение оператора создано");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateOperatorAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("operator_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-assignments"] });
      toast.success("Назначение обновлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteOperatorAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operator_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-assignments"] });
      toast.success("Назначение удалено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Brigade Assignments
export const useBrigadeAssignments = (date: Date) => {
  const dateStr = format(date, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["brigade-assignments", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brigade_assignments")
        .select(`
          *,
          brigades (id, name, code),
          production_order_operations (
            id,
            sequence,
            routing_operations (id, name),
            production_orders (id, order_number)
          )
        `)
        .eq("assignment_date", dateStr)
        .order("shift_number");

      if (error) throw error;
      return data;
    },
  });
};

export const useBrigadeAssignmentsRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["brigade-assignments", "range", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brigade_assignments")
        .select(`
          *,
          brigades (id, name, code),
          production_order_operations (
            id,
            sequence,
            routing_operations (id, name),
            production_orders (id, order_number)
          )
        `)
        .gte("assignment_date", start)
        .lte("assignment_date", end)
        .order("assignment_date")
        .order("shift_number");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateBrigadeAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: any) => {
      const { data, error } = await supabase
        .from("brigade_assignments")
        .insert(assignment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigade-assignments"] });
      toast.success("Назначение бригады создано");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateBrigadeAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("brigade_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigade-assignments"] });
      toast.success("Назначение обновлено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteBrigadeAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brigade_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brigade-assignments"] });
      toast.success("Назначение удалено");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

// Production Order Operations for assignment
export const useProductionOrderOperations = () => {
  return useQuery({
    queryKey: ["production-order-operations-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_operations")
        .select(`
          id,
          sequence,
          status,
          routing_operations (id, name, work_center_id),
          production_orders (id, order_number, status, products (id, name, code))
        `)
        .in("status", ["pending", "in_progress"])
        .order("sequence");

      if (error) throw error;
      return data;
    },
  });
};
