import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSpecifications = () => {
  return useQuery({
    queryKey: ["specifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specifications")
        .select(`
          *,
          products:product_id(name, code),
          specification_materials(
            id,
            quantity,
            waste_rate,
            products:material_id(name, code, unit)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveSpecifications = () => {
  return useQuery({
    queryKey: ["specifications", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specifications")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      return data;
    },
  });
};
