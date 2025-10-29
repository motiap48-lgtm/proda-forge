import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRoutingSheets = () => {
  return useQuery({
    queryKey: ["routing-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routing_sheets")
        .select(`
          *,
          products:product_id(name, code),
          routing_operations(
            id,
            sequence,
            name,
            setup_time_minutes,
            cycle_time_minutes,
            work_centers:work_center_id(name, code)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveRoutingSheets = () => {
  return useQuery({
    queryKey: ["routing-sheets", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routing_sheets")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};
