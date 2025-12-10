import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Contractor {
  id: string;
  code: string;
  name: string;
  inn: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useContractors = () => {
  return useQuery({
    queryKey: ["contractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Contractor[];
    },
  });
};

export const useActiveContractors = () => {
  return useQuery({
    queryKey: ["contractors", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Contractor[];
    },
  });
};

interface ContractorData {
  code?: string;
  name: string;
  inn?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export const useCreateContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContractorData) => {
      const { data: contractor, error } = await supabase
        .from("contractors")
        .insert({
          code: data.code || "",
          name: data.name,
          inn: data.inn,
          contact_person: data.contact_person,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Контрагент создан");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useUpdateContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: ContractorData & { id: string }) => {
      const { error } = await supabase
        .from("contractors")
        .update({
          name: data.name,
          inn: data.inn,
          contact_person: data.contact_person,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Контрагент обновлён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};

export const useDeleteContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contractors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Контрагент удалён");
    },
    onError: (error: any) => {
      toast.error("Ошибка: " + error.message);
    },
  });
};
