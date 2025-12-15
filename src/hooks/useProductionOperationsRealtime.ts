import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProductionOperationsRealtime = (orderId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    console.log("Setting up realtime subscription for order:", orderId);

    const channel = supabase
      .channel(`production-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_order_operations",
          filter: `production_order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Realtime operation update:", payload);
          queryClient.invalidateQueries({ queryKey: ["production-order-operations", orderId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Realtime order update:", payload);
          queryClient.invalidateQueries({ queryKey: ["production-order", orderId] });
          queryClient.invalidateQueries({ queryKey: ["production-orders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "production_order_history",
          filter: `production_order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Realtime history update:", payload);
          queryClient.invalidateQueries({ queryKey: ["production-order-history", orderId] });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Removing realtime subscription for order:", orderId);
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);
};
