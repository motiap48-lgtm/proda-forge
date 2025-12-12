import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ProductType = 'material' | 'semi-finished' | 'assembly' | 'finished';

export interface WorkCenterReportItem {
  order_number: string;
  product_name: string;
  product_code: string;
  product_type: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
  status: string;
}

export interface WorkCenterProductItem {
  product_id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  routing_sheet_name: string;
  routing_sheet_code: string;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  deviation_percent: number;
}

export interface WorkCenterReportData {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department: string | null;
  items: WorkCenterReportItem[];
  products: WorkCenterProductItem[];
  total_planned: number;
  total_completed: number;
  total_deviation: number;
  completion_percent: number;
}

// Кэш спецификаций
interface SpecificationCache {
  [productId: string]: {
    id: string;
    materials: {
      product_id: string;
      product_code: string;
      product_name: string;
      product_type: ProductType;
      unit: string;
      quantity: number;
      waste_rate: number;
    }[];
  } | null;
}

// Кэш техмаршрутов
interface RoutingCache {
  [productId: string]: {
    work_center_id: string;
    work_center_code: string;
    work_center_name: string;
    department?: string;
  } | null;
}

export const useWorkCenterReports = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["work-center-reports-v2", startDate, endDate],
    queryFn: async () => {
      // 1. Получаем все производственные заказы
      let ordersQuery = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          status,
          work_center_id,
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

      // 2. Загружаем ВСЕ активные спецификации
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

      // 3. Загружаем все активные техмаршруты
      const routingQuery = supabase
        .from("routing_sheets")
        .select(`
          id,
          code,
          name,
          product_id,
          is_active,
          routing_operations(
            sequence,
            operation_type,
            work_center_id,
            work_centers:work_center_id(id, code, name, department)
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

      const ordersData = ordersResult.data;
      const specsData = specsResult.data;
      const routingData = routingResult.data;

      // Создаем кэш спецификаций по product_id
      const specCache: SpecificationCache = {};
      specsData?.forEach(spec => {
        specCache[spec.product_id] = {
          id: spec.id,
          materials: spec.specification_materials?.map((m: any) => ({
            product_id: m.products?.id,
            product_code: m.products?.code || '',
            product_name: m.products?.name || '',
            product_type: m.products?.product_type || 'material',
            unit: m.products?.unit || 'шт',
            quantity: m.quantity,
            waste_rate: m.waste_rate || 0,
          })).filter((m: any) => m.product_id) || [],
        };
      });

      // Создаем кэш техмаршрутов - ПОСЛЕДНЯЯ операция (где продукт "выходит")
      const routingCache: RoutingCache = {};
      const productRoutingInfo: { [productId: string]: { code: string; name: string } } = {};
      
      routingData?.forEach(sheet => {
        productRoutingInfo[sheet.product_id] = { code: sheet.code, name: sheet.name };
        
        const productionOps = sheet.routing_operations
          ?.filter((op: any) => op.operation_type === 'production' && op.work_center_id)
          ?.sort((a: any, b: any) => b.sequence - a.sequence);
        const lastOp = productionOps?.[0];
        if (lastOp?.work_centers) {
          routingCache[sheet.product_id] = {
            work_center_id: lastOp.work_centers.id,
            work_center_code: lastOp.work_centers.code,
            work_center_name: lastOp.work_centers.name,
            department: lastOp.work_centers.department,
          };
        }
      });

      // Аккумулятор потребностей: product_id -> { planned, completed }
      const productRequirements = new Map<string, {
        product_id: string;
        product_code: string;
        product_name: string;
        product_type: ProductType;
        planned_quantity: number;
        completed_quantity: number;
      }>();

      // Рекурсивная функция разузловки
      const explodeBOM = (
        productId: string,
        productCode: string,
        productName: string,
        productType: ProductType,
        requiredQty: number,
        completedQty: number,
        ancestorPath: Set<string> = new Set()
      ) => {
        // Защита от циклических ссылок
        if (ancestorPath.has(productId)) return;

        const spec = specCache[productId];

        // Только производимые изделия (ПФ, СБ, ГП)
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

        // Рекурсивно разузловываем компоненты
        if (spec && spec.materials.length > 0) {
          const newAncestorPath = new Set(ancestorPath);
          newAncestorPath.add(productId);

          spec.materials.forEach(material => {
            // Материалы не нужны в отчете по участкам
            if (material.product_type === 'material') return;

            const materialQty = material.quantity * (1 + material.waste_rate / 100) * requiredQty;
            // Для компонентов completed = 0, т.к. это расчетная потребность
            explodeBOM(
              material.product_id,
              material.product_code,
              material.product_name,
              material.product_type,
              materialQty,
              0, // completed для компонентов не отслеживается напрямую
              newAncestorPath
            );
          });
        }
      };

      // Обрабатываем каждый производственный заказ - запускаем разузловку
      ordersData?.forEach(order => {
        const product = order.products as any;
        if (!product) return;

        const remainingQty = Number(order.quantity);
        const completedQty = Number(order.completed_quantity);

        explodeBOM(
          product.id,
          product.code,
          product.name,
          product.product_type,
          remainingQty,
          completedQty,
          new Set()
        );
      });

      // Группируем по участкам
      const workCenterMap = new Map<string, WorkCenterReportData>();

      productRequirements.forEach((req) => {
        const routing = routingCache[req.product_id];
        const routingInfo = productRoutingInfo[req.product_id];
        
        const wcId = routing?.work_center_id || 'unassigned';
        const wcCode = routing?.work_center_code || '-';
        const wcName = routing?.work_center_name || 'Без участка';
        const department = routing?.department || 'Без цеха';

        if (!workCenterMap.has(wcId)) {
          workCenterMap.set(wcId, {
            work_center_id: wcId,
            work_center_code: wcCode,
            work_center_name: wcName,
            department: department,
            items: [],
            products: [],
            total_planned: 0,
            total_completed: 0,
            total_deviation: 0,
            completion_percent: 0,
          });
        }

        const wcData = workCenterMap.get(wcId)!;
        
        const deviation = req.completed_quantity - req.planned_quantity;
        const deviationPercent = req.planned_quantity > 0 
          ? (deviation / req.planned_quantity) * 100 
          : 0;

        wcData.products.push({
          product_id: req.product_id,
          product_name: req.product_name,
          product_code: req.product_code,
          product_type: req.product_type,
          routing_sheet_name: routingInfo?.name || '',
          routing_sheet_code: routingInfo?.code || '',
          planned_quantity: req.planned_quantity,
          completed_quantity: req.completed_quantity,
          deviation,
          deviation_percent: deviationPercent,
        });

        wcData.total_planned += req.planned_quantity;
        wcData.total_completed += req.completed_quantity;
      });

      // Вычисляем итоговые показатели
      const result: WorkCenterReportData[] = [];
      workCenterMap.forEach((wc) => {
        wc.total_deviation = wc.total_completed - wc.total_planned;
        wc.completion_percent = wc.total_planned > 0 
          ? (wc.total_completed / wc.total_planned) * 100 
          : 0;
        
        // Сортируем продукты по типу и имени
        wc.products.sort((a, b) => {
          const typeOrder = { finished: 0, assembly: 1, "semi-finished": 2 };
          const typeCompare = (typeOrder[a.product_type as keyof typeof typeOrder] || 3) - 
                             (typeOrder[b.product_type as keyof typeof typeOrder] || 3);
          if (typeCompare !== 0) return typeCompare;
          return a.product_name.localeCompare(b.product_name, "ru");
        });
        
        result.push(wc);
      });

      // Сортируем по цехам, потом по участкам
      result.sort((a, b) => {
        const deptCompare = (a.department || "").localeCompare(b.department || "", "ru");
        if (deptCompare !== 0) return deptCompare;
        return (a.work_center_name || "").localeCompare(b.work_center_name || "", "ru");
      });

      return result;
    },
  });
};
