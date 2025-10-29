import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};

export const useProductsByType = (productType: string) => {
  return useQuery({
    queryKey: ["products", productType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_type", productType)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};
