import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChildOrderData {
  product_id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  quantity: number;
  specification_id: string | null;
  routing_sheet_id: string | null;
}

// Fetch child orders for a parent order
export const useChildProductionOrders = (parentOrderId: string) => {
  return useQuery({
    queryKey: ["child-production-orders", parentOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(name, code, product_type, unit),
          specifications:specification_id(code, version),
          work_centers:work_center_id(name, code)
        `)
        .eq("parent_order_id", parentOrderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!parentOrderId,
  });
};

// Fetch parent order for a child order
export const useParentProductionOrder = (orderId: string) => {
  return useQuery({
    queryKey: ["parent-production-order", orderId],
    queryFn: async () => {
      // First get the order to find its parent_order_id
      const { data: order, error: orderError } = await supabase
        .from("production_orders")
        .select("parent_order_id")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order?.parent_order_id) return null;

      // Then fetch the parent order
      const { data: parentOrder, error: parentError } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(name, code, product_type, unit)
        `)
        .eq("id", order.parent_order_id)
        .maybeSingle();

      if (parentError) throw parentError;
      return parentOrder;
    },
    enabled: !!orderId,
  });
};

// Helper to recursively collect component requirements from BOM
async function collectComponentRequirements(
  specificationId: string,
  quantity: number,
  ancestorIds: Set<string> = new Set()
): Promise<ChildOrderData[]> {
  const requirements: ChildOrderData[] = [];

  // Get specification materials
  const { data: materials, error } = await supabase
    .from("specification_materials")
    .select(`
      material_id,
      quantity,
      waste_rate,
      products:material_id(id, name, code, product_type, unit)
    `)
    .eq("specification_id", specificationId);

  if (error || !materials) return requirements;

  for (const material of materials) {
    const product = material.products as any;
    if (!product) continue;

    // Skip materials - they don't need production orders
    if (product.product_type === 'material') continue;

    // Skip if already in ancestor path (circular reference)
    if (ancestorIds.has(product.id)) continue;

    // Calculate required quantity with waste rate
    const wasteMultiplier = 1 + (material.waste_rate || 0) / 100;
    const requiredQty = material.quantity * quantity * wasteMultiplier;

  // Find specification and routing sheet for this product
    const { data: spec } = await supabase
      .from("specifications")
      .select("id")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const { data: routing } = await supabase
      .from("routing_sheets")
      .select("id")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    requirements.push({
      product_id: product.id,
      product_name: product.name,
      product_code: product.code,
      product_type: product.product_type,
      quantity: requiredQty,
      specification_id: spec?.id || null,
      routing_sheet_id: routing?.id || null,
    });

    // Recursively get requirements for this component if it has a specification
    if (spec?.id) {
      const newAncestorIds = new Set(ancestorIds);
      newAncestorIds.add(product.id);
      const childReqs = await collectComponentRequirements(spec.id, requiredQty, newAncestorIds);
      requirements.push(...childReqs);
    }
  }

  return requirements;
}

// Create child orders for components
export const useCreateChildOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentOrderId,
      parentOrderNumber,
      specificationId,
      quantity,
      plannedStartDate,
      plannedEndDate,
    }: {
      parentOrderId: string;
      parentOrderNumber: string;
      specificationId: string;
      quantity: number;
      plannedStartDate: string;
      plannedEndDate: string;
    }) => {
      // Collect all component requirements
      const requirements = await collectComponentRequirements(specificationId, quantity);

      if (requirements.length === 0) {
        return { created: 0, orders: [] };
      }

      // Aggregate requirements by product (same product might appear multiple times in BOM)
      const aggregated = new Map<string, ChildOrderData>();
      requirements.forEach(req => {
        if (aggregated.has(req.product_id)) {
          const existing = aggregated.get(req.product_id)!;
          existing.quantity += req.quantity;
        } else {
          aggregated.set(req.product_id, { ...req });
        }
      });

      const createdOrders: any[] = [];
      let orderIndex = 1;

      for (const req of aggregated.values()) {
        const orderNumber = `${parentOrderNumber}-${String(orderIndex).padStart(2, '0')}`;

        // Create the child order
        const { data: order, error: orderError } = await supabase
          .from("production_orders")
          .insert({
            order_number: orderNumber,
            product_id: req.product_id,
            specification_id: req.specification_id,
            routing_sheet_id: req.routing_sheet_id,
            quantity: Math.ceil(req.quantity),
            original_quantity: Math.ceil(req.quantity),
            completed_quantity: 0,
            status: "planned",
            priority: "normal",
            planned_start_date: plannedStartDate,
            planned_end_date: plannedEndDate,
            parent_order_id: parentOrderId,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating child order:", orderError);
          continue;
        }

        // Create operations if routing sheet exists
        if (req.routing_sheet_id && order) {
          const { data: operations } = await supabase
            .from("routing_operations")
            .select("*")
            .eq("routing_sheet_id", req.routing_sheet_id)
            .order("sequence");

          if (operations && operations.length > 0) {
            const orderOperations = operations.map(op => ({
              production_order_id: order.id,
              routing_operation_id: op.id,
              sequence: op.sequence,
              status: "pending",
              planned_start_date: plannedStartDate,
              planned_end_date: plannedEndDate,
            }));

            await supabase
              .from("production_order_operations")
              .insert(orderOperations);
          }
        }

        createdOrders.push(order);
        orderIndex++;
      }

      return { created: createdOrders.length, orders: createdOrders };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["child-production-orders"] });
      if (result.created > 0) {
        toast.success(`Создано ${result.created} дочерних заказов на ПФ/СБ`);
      }
    },
    onError: (error: Error) => {
      toast.error("Ошибка при создании дочерних заказов: " + error.message);
    },
  });
};

// Preview what child orders would be created
export const usePreviewChildOrders = () => {
  return useMutation({
    mutationFn: async ({
      specificationId,
      quantity,
    }: {
      specificationId: string;
      quantity: number;
    }) => {
      const requirements = await collectComponentRequirements(specificationId, quantity);

      // Aggregate
      const aggregated = new Map<string, ChildOrderData>();
      requirements.forEach(req => {
        if (aggregated.has(req.product_id)) {
          const existing = aggregated.get(req.product_id)!;
          existing.quantity += req.quantity;
        } else {
          aggregated.set(req.product_id, { ...req });
        }
      });

      return Array.from(aggregated.values());
    },
  });
};
