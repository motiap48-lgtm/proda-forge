import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductionOrderWithCustomer {
  id: string;
  order_number: string;
  product_id: string;
  customer_id: string | null;
  specification_id: string | null;
  routing_sheet_id: string | null;
  work_center_id: string | null;
  parent_order_id: string | null;
  quantity: number;
  original_quantity: number;
  completed_quantity: number;
  status: string;
  priority: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
  products?: { name: string; code: string; unit?: string };
  customers?: { id: string; name: string; code: string } | null;
  specifications?: { code: string; version?: string };
  work_centers?: { name: string; code?: string };
  routing_sheets?: { name: string };
}

export const useProductionOrdersWithCustomers = () => {
  return useQuery({
    queryKey: ["production-orders-with-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(name, code, unit),
          customers:customer_id(id, name, code),
          specifications:specification_id(code, version),
          work_centers:work_center_id(name, code),
          routing_sheets:routing_sheet_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProductionOrderWithCustomer[];
    },
  });
};
