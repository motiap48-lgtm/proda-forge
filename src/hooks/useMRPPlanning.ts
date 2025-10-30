import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MRPRequirement {
  product_id: string;
  product_code: string;
  product_name: string;
  unit: string;
  gross_requirement: number;
  on_hand: number;
  reserved: number;
  available: number;
  net_requirement: number;
  status: 'shortage' | 'warning' | 'ok';
}

export const useMRPCalculation = (horizonDays: number = 30) => {
  return useQuery({
    queryKey: ["mrp-calculation", horizonDays],
    queryFn: async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + horizonDays);

      // Получаем производственные заказы в горизонте планирования
      const { data: orders, error: ordersError } = await supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(id, code, name, unit)
        `)
        .lte("planned_start_date", endDate.toISOString())
        .in("status", ["planned", "released"]);

      if (ordersError) throw ordersError;
      
      // Получаем спецификации для заказов
      const specIds = orders?.map(o => o.specification_id).filter(Boolean) || [];
      const { data: specifications, error: specError } = await supabase
        .from("specifications")
        .select(`
          id,
          specification_materials(
            quantity,
            waste_rate,
            products:material_id(id, code, name, unit)
          )
        `)
        .in("id", specIds);
      
      if (specError) throw specError;
      
      const specsMap = new Map(specifications?.map(s => [s.id, s]));


      // Получаем текущие остатки
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select(`
          *,
          products:product_id(id, code, name, unit)
        `);

      if (invError) throw invError;

      // Рассчитываем потребности
      const requirements: Map<string, MRPRequirement> = new Map();

      orders?.forEach((order) => {
        const spec = order.specification_id ? specsMap.get(order.specification_id) : null;
        const materials = spec?.specification_materials || [];
        
        materials.forEach((material: any) => {
          const productId = material.products?.id;
          if (!productId) return;

          const requiredQty = material.quantity * (1 + material.waste_rate / 100) * order.quantity;
          
          if (!requirements.has(productId)) {
            requirements.set(productId, {
              product_id: productId,
              product_code: material.products.code,
              product_name: material.products.name,
              unit: material.products.unit,
              gross_requirement: 0,
              on_hand: 0,
              reserved: 0,
              available: 0,
              net_requirement: 0,
              status: 'ok',
            });
          }

          const req = requirements.get(productId)!;
          req.gross_requirement += requiredQty;
        });
      });

      // Добавляем данные по остаткам
      inventory?.forEach((inv) => {
        const productId = inv.product_id;
        if (requirements.has(productId)) {
          const req = requirements.get(productId)!;
          req.on_hand = Number(inv.quantity);
          req.reserved = Number(inv.reserved_quantity);
          req.available = Number(inv.available_quantity || 0);
        }
      });

      // Рассчитываем чистую потребность и статус
      requirements.forEach((req) => {
        req.net_requirement = Math.max(0, req.gross_requirement - req.available);
        
        if (req.net_requirement > 0) {
          req.status = 'shortage';
        } else if (req.available < req.gross_requirement * 1.2) {
          req.status = 'warning';
        } else {
          req.status = 'ok';
        }
      });

      return Array.from(requirements.values());
    },
  });
};

export const usePurchaseRequisitions = () => {
  return useQuery({
    queryKey: ["purchase-requisitions"],
    queryFn: async () => {
      // Это заглушка - в будущем здесь будет реальная таблица закупок
      return [];
    },
  });
};
