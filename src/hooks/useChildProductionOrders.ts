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

export interface AnalysisProgress {
  currentLevel: number;
  totalLevels: number;
  processedProducts: number;
  status: 'analyzing' | 'complete';
}

// Cache for specification analysis results (key: specificationId, value: {data, timestamp})
const specAnalysisCache = new Map<string, { 
  data: ChildOrderData[]; 
  timestamp: number;
  baseQuantity: number;
}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

function getCacheKey(specificationId: string): string {
  return specificationId;
}

function getCachedResult(specificationId: string, quantity: number): ChildOrderData[] | null {
  const key = getCacheKey(specificationId);
  const cached = specAnalysisCache.get(key);
  
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    specAnalysisCache.delete(key);
    return null;
  }
  
  // Scale quantities based on requested quantity vs cached base quantity
  const ratio = quantity / cached.baseQuantity;
  return cached.data.map(item => ({
    ...item,
    quantity: item.quantity * ratio
  }));
}

function setCachedResult(specificationId: string, data: ChildOrderData[], baseQuantity: number): void {
  const key = getCacheKey(specificationId);
  specAnalysisCache.set(key, {
    data: data.map(item => ({ ...item })), // Clone data
    timestamp: Date.now(),
    baseQuantity
  });
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

// Helper to collect component requirements from BOM using BFS (optimized)
async function collectComponentRequirements(
  specificationId: string,
  quantity: number,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<ChildOrderData[]> {
  const requirements: ChildOrderData[] = [];
  const processedProducts = new Set<string>();
  
  // Queue: [specificationId, quantity, ancestorProductIds]
  const queue: Array<{ specId: string; qty: number; ancestors: Set<string> }> = [
    { specId: specificationId, qty: quantity, ancestors: new Set() }
  ];

  let currentLevel = 0;

  while (queue.length > 0) {
    currentLevel++;
    
    // Report progress
    onProgress?.({
      currentLevel,
      totalLevels: currentLevel, // We don't know total in advance
      processedProducts: processedProducts.size,
      status: 'analyzing'
    });
    
    // Process all items at current level in parallel
    const currentBatch = queue.splice(0, queue.length);
    
    // Fetch all specification materials for this batch in parallel
    const materialsPromises = currentBatch.map(item =>
      supabase
        .from("specification_materials")
        .select("material_id, quantity, waste_rate")
        .eq("specification_id", item.specId)
        .then(res => ({ ...item, materials: res.data || [] }))
    );
    
    const batchResults = await Promise.all(materialsPromises);
    
    // Collect all unique product IDs from this batch
    const allProductIds = new Set<string>();
    batchResults.forEach(result => {
      result.materials.forEach(m => allProductIds.add(m.material_id));
    });
    
    if (allProductIds.size === 0) continue;
    
    // Fetch all products in one query
    const { data: products } = await supabase
      .from("products")
      .select("id, name, code, product_type, unit")
      .in("id", Array.from(allProductIds));
    
    const productsMap = new Map(products?.map(p => [p.id, p]) || []);
    
    // Get non-material product IDs for spec/routing lookup
    const nonMaterialProductIds = Array.from(allProductIds).filter(id => {
      const product = productsMap.get(id);
      return product && product.product_type !== 'material';
    });
    
    // Fetch all specifications and routing sheets in parallel
    const [specsResult, routingsResult] = await Promise.all([
      nonMaterialProductIds.length > 0
        ? supabase
            .from("specifications")
            .select("id, product_id")
            .in("product_id", nonMaterialProductIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
      nonMaterialProductIds.length > 0
        ? supabase
            .from("routing_sheets")
            .select("id, product_id")
            .in("product_id", nonMaterialProductIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);
    
    const specsMap = new Map<string, string>();
    specsResult.data?.forEach(s => {
      if (!specsMap.has(s.product_id)) specsMap.set(s.product_id, s.id);
    });
    
    const routingsMap = new Map<string, string>();
    routingsResult.data?.forEach(r => {
      if (!routingsMap.has(r.product_id)) routingsMap.set(r.product_id, r.id);
    });
    
    // Process each batch item
    for (const result of batchResults) {
      for (const material of result.materials) {
        const product = productsMap.get(material.material_id);
        if (!product) continue;
        
        // Skip materials - they don't need production orders
        if (product.product_type === 'material') continue;
        
        // Skip if already in ancestor path (circular reference)
        if (result.ancestors.has(product.id)) continue;
        
        // Calculate required quantity with waste rate
        const wasteMultiplier = 1 + (Number(material.waste_rate) || 0) / 100;
        const requiredQty = Number(material.quantity) * result.qty * wasteMultiplier;
        
        const specId = specsMap.get(product.id) || null;
        const routingId = routingsMap.get(product.id) || null;
        
        // Add to requirements if not already processed
        if (!processedProducts.has(product.id)) {
          requirements.push({
            product_id: product.id,
            product_name: product.name,
            product_code: product.code,
            product_type: product.product_type,
            quantity: requiredQty,
            specification_id: specId,
            routing_sheet_id: routingId,
          });
        }
        
        // Queue for next level if has specification
        if (specId && !processedProducts.has(product.id)) {
          const newAncestors = new Set(result.ancestors);
          newAncestors.add(product.id);
          queue.push({ specId, qty: requiredQty, ancestors: newAncestors });
        }
        
        processedProducts.add(product.id);
      }
    }
  }

  // Final progress update
  onProgress?.({
    currentLevel,
    totalLevels: currentLevel,
    processedProducts: processedProducts.size,
    status: 'complete'
  });

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

        // Determine work_center_id from routing sheet (last production operation)
        let workCenterId: string | null = null;
        let routingOperations: any[] = [];
        
        if (req.routing_sheet_id) {
          const { data: operations } = await supabase
            .from("routing_operations")
            .select("*")
            .eq("routing_sheet_id", req.routing_sheet_id)
            .order("sequence");

          routingOperations = operations || [];
          
          // Find last production operation with a work center
          const productionOps = routingOperations.filter(
            op => op.operation_type === 'production' && op.work_center_id
          );
          if (productionOps.length > 0) {
            workCenterId = productionOps[productionOps.length - 1].work_center_id;
          }
        }

        // Create the child order with work center
        const { data: order, error: orderError } = await supabase
          .from("production_orders")
          .insert({
            order_number: orderNumber,
            product_id: req.product_id,
            specification_id: req.specification_id,
            routing_sheet_id: req.routing_sheet_id,
            work_center_id: workCenterId,
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
        if (routingOperations.length > 0 && order) {
          const orderOperations = routingOperations.map(op => ({
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

// Update existing child orders when parent quantity increases
export const useUpdateChildOrdersQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentOrderId,
      specificationId,
      oldQuantity,
      newQuantity,
    }: {
      parentOrderId: string;
      specificationId: string;
      oldQuantity: number;
      newQuantity: number;
    }) => {
      if (newQuantity <= oldQuantity) {
        return { updated: 0 };
      }

      // Get existing child orders
      const { data: existingChildOrders } = await supabase
        .from("production_orders")
        .select("id, product_id, quantity")
        .eq("parent_order_id", parentOrderId);

      if (!existingChildOrders || existingChildOrders.length === 0) {
        return { updated: 0, noChildren: true };
      }

      // Calculate the multiplier for quantity increase
      const multiplier = newQuantity / oldQuantity;

      let updatedCount = 0;

      for (const childOrder of existingChildOrders) {
        const newChildQuantity = Math.ceil(Number(childOrder.quantity) * multiplier);
        
        const { error } = await supabase
          .from("production_orders")
          .update({ quantity: newChildQuantity })
          .eq("id", childOrder.id);

        if (!error) {
          updatedCount++;
        }
      }

      return { updated: updatedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["child-production-orders"] });
      if (result.updated > 0) {
        toast.success(`Обновлено количество в ${result.updated} дочерних заказах`);
      }
    },
    onError: (error: Error) => {
      toast.error("Ошибка при обновлении дочерних заказов: " + error.message);
    },
  });
};

// Preview what child orders would be created (with caching and progress)
export const usePreviewChildOrders = () => {
  return useMutation({
    mutationFn: async ({
      specificationId,
      quantity,
      onProgress,
    }: {
      specificationId: string;
      quantity: number;
      onProgress?: (progress: AnalysisProgress) => void;
    }) => {
      // Check cache first
      const cached = getCachedResult(specificationId, quantity);
      if (cached) {
        onProgress?.({
          currentLevel: 0,
          totalLevels: 0,
          processedProducts: cached.length,
          status: 'complete'
        });
        
        // Aggregate cached results
        const aggregated = new Map<string, ChildOrderData>();
        cached.forEach(req => {
          if (aggregated.has(req.product_id)) {
            const existing = aggregated.get(req.product_id)!;
            existing.quantity += req.quantity;
          } else {
            aggregated.set(req.product_id, { ...req });
          }
        });
        return Array.from(aggregated.values());
      }
      
      // Use base quantity of 1 for caching, then scale
      const baseQuantity = 1;
      const requirements = await collectComponentRequirements(specificationId, baseQuantity, onProgress);
      
      // Cache the base result
      setCachedResult(specificationId, requirements, baseQuantity);
      
      // Scale quantities
      const scaledRequirements = requirements.map(req => ({
        ...req,
        quantity: req.quantity * quantity
      }));

      // Aggregate
      const aggregated = new Map<string, ChildOrderData>();
      scaledRequirements.forEach(req => {
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

// Clear cache for a specific specification (call when spec is modified)
export const clearSpecAnalysisCache = (specificationId?: string) => {
  if (specificationId) {
    specAnalysisCache.delete(getCacheKey(specificationId));
  } else {
    specAnalysisCache.clear();
  }
};
