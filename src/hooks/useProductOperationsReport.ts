import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductOperationInfo {
  operation_id: string;
  sequence: number;
  operation_name: string;
  operation_type: string;
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  setup_time: number;
  cycle_time: number;
  is_external: boolean;
  contractor_name?: string;
}

export interface ProductReportItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_type: string;
  routing_sheet_id: string | null;
  routing_sheet_code: string;
  routing_sheet_name: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
  operations: ProductOperationInfo[];
  departments: string[];
  work_centers: string[];
}

export const useProductOperationsReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["product-operations-report", startDate, endDate],
    queryFn: async () => {
      // 1. Получаем производственные заказы
      let ordersQuery = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          status,
          product_id,
          products:product_id(id, name, code, product_type, unit)
        `)
        .in("status", ["planned", "released", "in_progress"])
        .order("planned_start_date", { ascending: false });

      if (startDate) {
        ordersQuery = ordersQuery.gte("planned_start_date", startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("planned_end_date", endDate);
      }

      // 2. Загружаем спецификации
      const specsQuery = supabase
        .from("specifications")
        .select(`
          id,
          product_id,
          specification_materials(
            quantity,
            waste_rate,
            products:material_id(id, code, name, unit, product_type)
          )
        `)
        .eq("is_active", true);

      // 3. Загружаем техмаршруты с полными операциями
      const routingQuery = supabase
        .from("routing_sheets")
        .select(`
          id,
          code,
          name,
          product_id,
          routing_operations(
            id,
            sequence,
            name,
            operation_type,
            setup_time_minutes,
            cycle_time_minutes,
            is_external,
            external_contractor,
            work_center_id,
            work_centers:work_center_id(id, code, name, department),
            contractors:contractor_id(name)
          )
        `)
        .eq("is_active", true);

      const [ordersResult, specsResult, routingResult] = await Promise.all([
        ordersQuery,
        specsQuery,
        routingQuery,
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (specsResult.error) throw specsResult.error;
      if (routingResult.error) throw routingResult.error;

      // Кэш спецификаций
      const specCache: { [productId: string]: any } = {};
      specsResult.data?.forEach(spec => {
        specCache[spec.product_id] = {
          materials: spec.specification_materials?.map((m: any) => ({
            product_id: m.products?.id,
            product_code: m.products?.code || '',
            product_name: m.products?.name || '',
            product_type: m.products?.product_type || 'material',
            quantity: m.quantity,
            waste_rate: m.waste_rate || 0,
          })).filter((m: any) => m.product_id) || [],
        };
      });

      // Кэш техмаршрутов с операциями
      const routingCache: { [productId: string]: {
        id: string;
        code: string;
        name: string;
        operations: ProductOperationInfo[];
      } } = {};

      routingResult.data?.forEach(sheet => {
        const operations: ProductOperationInfo[] = (sheet.routing_operations || [])
          .sort((a: any, b: any) => a.sequence - b.sequence)
          .map((op: any) => ({
            operation_id: op.id,
            sequence: op.sequence,
            operation_name: op.name,
            operation_type: op.operation_type,
            work_center_id: op.work_centers?.id || '',
            work_center_code: op.work_centers?.code || '',
            work_center_name: op.work_centers?.name || (op.is_external ? 'Внешняя операция' : 'Не указан'),
            department: op.work_centers?.department || null,
            setup_time: op.setup_time_minutes || 0,
            cycle_time: op.cycle_time_minutes || 0,
            is_external: op.is_external || false,
            contractor_name: op.contractors?.name || op.external_contractor || undefined,
          }));

        routingCache[sheet.product_id] = {
          id: sheet.id,
          code: sheet.code,
          name: sheet.name,
          operations,
        };
      });

      // Аккумулятор требований по продуктам
      const productRequirements = new Map<string, {
        product_id: string;
        product_code: string;
        product_name: string;
        product_type: string;
        planned_quantity: number;
        completed_quantity: number;
      }>();

      // Рекурсивная разузловка
      const explodeBOM = (
        productId: string,
        productCode: string,
        productName: string,
        productType: string,
        requiredQty: number,
        completedQty: number,
        ancestorPath: Set<string> = new Set()
      ) => {
        if (ancestorPath.has(productId)) return;

        // Только производимые изделия
        if (['semi-finished', 'assembly', 'finished'].includes(productType)) {
          const existing = productRequirements.get(productId);
          if (existing) {
            existing.planned_quantity += requiredQty;
            existing.completed_quantity += completedQty;
          } else {
            productRequirements.set(productId, {
              product_id: productId,
              product_code: productCode,
              product_name: productName,
              product_type: productType,
              planned_quantity: requiredQty,
              completed_quantity: completedQty,
            });
          }
        }

        const spec = specCache[productId];
        if (spec && spec.materials.length > 0) {
          const newAncestorPath = new Set(ancestorPath);
          newAncestorPath.add(productId);

          spec.materials.forEach((material: any) => {
            if (material.product_type === 'material') return;

            const materialQty = material.quantity * (1 + material.waste_rate / 100) * requiredQty;
            explodeBOM(
              material.product_id,
              material.product_code,
              material.product_name,
              material.product_type,
              materialQty,
              0,
              newAncestorPath
            );
          });
        }
      };

      // Обрабатываем заказы
      ordersResult.data?.forEach(order => {
        const product = order.products as any;
        if (!product) return;

        explodeBOM(
          product.id,
          product.code,
          product.name,
          product.product_type,
          Number(order.quantity),
          Number(order.completed_quantity),
          new Set()
        );
      });

      // Формируем отчёт по изделиям
      const result: ProductReportItem[] = [];

      productRequirements.forEach((req) => {
        const routing = routingCache[req.product_id];
        const operations = routing?.operations || [];
        
        // Собираем уникальные цехи и участки
        const departments = new Set<string>();
        const workCenters = new Set<string>();
        
        operations.forEach(op => {
          if (op.department) departments.add(op.department);
          if (op.work_center_name && op.work_center_name !== 'Не указан') {
            workCenters.add(op.work_center_name);
          }
        });

        const deviation = req.completed_quantity - req.planned_quantity;
        const deviationPercent = req.planned_quantity > 0 
          ? (deviation / req.planned_quantity) * 100 
          : 0;

        result.push({
          product_id: req.product_id,
          product_code: req.product_code,
          product_name: req.product_name,
          product_type: req.product_type,
          routing_sheet_id: routing?.id || null,
          routing_sheet_code: routing?.code || '',
          routing_sheet_name: routing?.name || '',
          planned_quantity: req.planned_quantity,
          completed_quantity: req.completed_quantity,
          deviation,
          deviation_percent: deviationPercent,
          operations,
          departments: Array.from(departments),
          work_centers: Array.from(workCenters),
        });
      });

      // Сортируем по типу и имени
      result.sort((a, b) => {
        const typeOrder = { finished: 0, assembly: 1, 'semi-finished': 2 };
        const typeCompare = (typeOrder[a.product_type as keyof typeof typeOrder] || 3) - 
                           (typeOrder[b.product_type as keyof typeof typeOrder] || 3);
        if (typeCompare !== 0) return typeCompare;
        return a.product_name.localeCompare(b.product_name, 'ru');
      });

      return result;
    },
  });
};
