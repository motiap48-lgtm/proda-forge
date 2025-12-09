import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StandardOperation {
  id: string;
  code: string;
  name: string;
  operation_type: string;
  description: string | null;
  default_setup_time_minutes: number;
  default_cycle_time_minutes: number;
  default_work_center_id: string | null;
  default_work_center?: {
    id: string;
    code: string;
    name: string;
  } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStandardOperations() {
  return useQuery({
    queryKey: ['standard-operations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standard_operations')
        .select(`
          *,
          default_work_center:work_centers(id, code, name)
        `)
        .order('code');

      if (error) throw error;
      return data as StandardOperation[];
    },
  });
}

export function useActiveStandardOperations() {
  return useQuery({
    queryKey: ['standard-operations', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standard_operations')
        .select(`
          *,
          default_work_center:work_centers(id, code, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as StandardOperation[];
    },
  });
}

export function useCreateStandardOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<StandardOperation, 'id' | 'code' | 'created_at' | 'updated_at' | 'default_work_center'>) => {
      const { data: result, error } = await supabase
        .from('standard_operations')
        .insert({
          code: '', // Will be auto-generated
          name: data.name,
          operation_type: data.operation_type,
          description: data.description,
          default_setup_time_minutes: data.default_setup_time_minutes,
          default_cycle_time_minutes: data.default_cycle_time_minutes,
          default_work_center_id: data.default_work_center_id,
          is_active: data.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-operations'] });
      toast.success('Типовая операция создана');
    },
    onError: (error) => {
      console.error('Error creating standard operation:', error);
      toast.error('Ошибка при создании типовой операции');
    },
  });
}

export function useUpdateStandardOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StandardOperation> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('standard_operations')
        .update({
          name: data.name,
          operation_type: data.operation_type,
          description: data.description,
          default_setup_time_minutes: data.default_setup_time_minutes,
          default_cycle_time_minutes: data.default_cycle_time_minutes,
          default_work_center_id: data.default_work_center_id,
          is_active: data.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-operations'] });
      toast.success('Типовая операция обновлена');
    },
    onError: (error) => {
      console.error('Error updating standard operation:', error);
      toast.error('Ошибка при обновлении типовой операции');
    },
  });
}

export function useDeleteStandardOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('standard_operations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standard-operations'] });
      toast.success('Типовая операция удалена');
    },
    onError: (error) => {
      console.error('Error deleting standard operation:', error);
      toast.error('Ошибка при удалении типовой операции');
    },
  });
}
