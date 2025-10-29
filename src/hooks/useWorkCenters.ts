import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useWorkCenters = () => {
  return useQuery({
    queryKey: ["work-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_centers")
        .select("*")
        .order("code");

      if (error) throw error;
      return data;
    },
  });
};

export const useActiveWorkCenters = () => {
  return useQuery({
    queryKey: ["work-centers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_centers")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};
