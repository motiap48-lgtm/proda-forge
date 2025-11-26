import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      code: string;
      name: string;
      product_type: string;
      unit: string;
      description?: string;
    }) => {
      // Если код AUTO или пустой, база данных сгенерирует его автоматически
      const productData = {
        ...product,
        code: (!product.code || product.code === "AUTO") ? "" : product.code,
      };

      // Проверка на дублирование по коду только если код задан вручную
      if (productData.code && productData.code !== "") {
        const { data: existing } = await supabase
          .from("products")
          .select("code")
          .eq("code", productData.code)
          .eq("is_active", true)
          .maybeSingle();

        if (existing) {
          throw new Error(`Продукт с кодом "${productData.code}" уже существует`);
        }
      }

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Продукт создан");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при создании: " + error.message);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        code?: string;
        name?: string;
        product_type?: string;
        unit?: string;
        description?: string;
      };
    }) => {
      const { data: updated, error } = await supabase
        .from("products")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Продукт обновлен");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при обновлении: " + error.message);
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Продукт деактивирован");
    },
    onError: (error: Error) => {
      toast.error("Ошибка при деактивации: " + error.message);
    },
  });
};

export const useBulkDeleteProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productType: string) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("product_type", productType)
        .eq("is_active", true);

      if (error) throw error;
    },
    onSuccess: (_, productType) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const typeNames: Record<string, string> = {
        material: "материалов",
        "semi-finished": "полуфабрикатов",
        assembly: "сборочных узлов",
        finished: "готовой продукции",
      };
      toast.success(`Все ${typeNames[productType]} деактивированы`);
    },
    onError: (error: Error) => {
      toast.error("Ошибка при массовой деактивации: " + error.message);
    },
  });
};
