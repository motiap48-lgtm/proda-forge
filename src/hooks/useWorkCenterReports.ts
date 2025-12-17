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

// Информация о рабочих центрах для продукта
interface ProductWorkCenterInfo {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department?: string;
}

export const useWorkCenterReports = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["work-center-reports-v3", startDate, endDate],
    queryFn: async () => {
      // 1. Получаем ВСЕ производственные заказы
      let allOrdersQuery = supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          status,
          work_center_id,
          product_id,
          parent_order_id,
          products:product_id(id, name, code, product_type, unit)
        `)
        .in("status", ["planned", "released", "in_progress", "on_hold", "completed"]);

      if (startDate) {
        allOrdersQuery = allOrdersQuery.gte("planned_start_date", startDate);
      }
      if (endDate) {
        allOrdersQuery = allOrdersQuery.lte("planned_end_date", endDate);
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

      const [allOrdersResult, specsResult, routingResult] = await Promise.all([
        allOrdersQuery,
        specsQuery,
        routingQuery,
      ]);

      if (allOrdersResult.error) throw allOrdersResult.error;
      if (specsResult.error) throw specsResult.error;
      if (routingResult.error) throw routingResult.error;

      const allOrdersData = allOrdersResult.data;
      const specsData = specsResult.data;
      const routingData = routingResult.data;

      // Разделяем на родительские и дочерние
      const parentOrders = allOrdersData?.filter(o => !o.parent_order_id) || [];
      const allOrders = allOrdersData || [];

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

      // Создаем кэш техмаршрутов - ВСЕ производственные операции для каждого продукта
      // Продукт может проходить через несколько участков
      const productWorkCentersCache = new Map<string, ProductWorkCenterInfo[]>();
      const productRoutingInfo: { [productId: string]: { code: string; name: string } } = {};
      
      routingData?.forEach(sheet => {
        productRoutingInfo[sheet.product_id] = { code: sheet.code, name: sheet.name };
        
        // Получаем ВСЕ производственные операции с рабочими центрами
        const productionOps = sheet.routing_operations
          ?.filter((op: any) => op.operation_type === 'production' && op.work_center_id && op.work_centers)
          ?.sort((a: any, b: any) => a.sequence - b.sequence);
        
        if (productionOps && productionOps.length > 0) {
          // Собираем уникальные рабочие центры для продукта
          const workCenters: ProductWorkCenterInfo[] = [];
          const seenWcIds = new Set<string>();
          
          productionOps.forEach((op: any) => {
            if (!seenWcIds.has(op.work_centers.id)) {
              seenWcIds.add(op.work_centers.id);
              workCenters.push({
                work_center_id: op.work_centers.id,
                work_center_code: op.work_centers.code,
                work_center_name: op.work_centers.name,
                department: op.work_centers.department,
              });
            }
          });
          
          productWorkCentersCache.set(sheet.product_id, workCenters);
        }
      });

      // Агрегируем ФАКТ выполнения по всем заказам (включая дочерние)
      const completedByProduct = new Map<string, number>();
      allOrders.forEach(order => {
        const productId = order.product_id;
        const current = completedByProduct.get(productId) || 0;
        completedByProduct.set(productId, current + Number(order.completed_quantity));
      });

      // Аккумулятор потребностей: product_id -> { planned } (без факта - берём из completedByProduct)
      const productRequirements = new Map<string, {
        product_id: string;
        product_code: string;
        product_name: string;
        product_type: ProductType;
        planned_quantity: number;
      }>();

      // Рекурсивная функция разузловки (только ПЛАН)
      const explodeBOM = (
        productId: string,
        productCode: string,
        productName: string,
        productType: ProductType,
        requiredQty: number,
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
          } else {
            productRequirements.set(productId, {
              product_id: productId,
              product_code: productCode,
              product_name: productName,
              product_type: productType,
              planned_quantity: requiredQty,
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
            explodeBOM(
              material.product_id,
              material.product_code,
              material.product_name,
              material.product_type,
              materialQty,
              newAncestorPath
            );
          });
        }
      };

      // Обрабатываем только РОДИТЕЛЬСКИЕ заказы для плана - запускаем разузловку
      parentOrders.forEach(order => {
        const product = order.products as any;
        if (!product) return;

        const remainingQty = Number(order.quantity);

        explodeBOM(
          product.id,
          product.code,
          product.name,
          product.product_type,
          remainingQty,
          new Set()
        );
      });

      // Группируем по участкам - каждый продукт добавляем на ВСЕ его участки
      const workCenterMap = new Map<string, WorkCenterReportData>();

      productRequirements.forEach((req) => {
        const workCenters = productWorkCentersCache.get(req.product_id);
        const routingInfo = productRoutingInfo[req.product_id];
        
        // Берём факт из агрегированных данных
        const completedQty = completedByProduct.get(req.product_id) || 0;
        
        // Если у продукта нет маршрута, добавляем в "Без участка"
        const targetWorkCenters = workCenters && workCenters.length > 0 
          ? workCenters 
          : [{ work_center_id: 'unassigned', work_center_code: '-', work_center_name: 'Без участка', department: 'Без цеха' }];
        
        // Добавляем продукт на КАЖДЫЙ участок, где он производится
        targetWorkCenters.forEach(wc => {
          if (!workCenterMap.has(wc.work_center_id)) {
            workCenterMap.set(wc.work_center_id, {
              work_center_id: wc.work_center_id,
              work_center_code: wc.work_center_code,
              work_center_name: wc.work_center_name,
              department: wc.department || 'Без цеха',
              items: [],
              products: [],
              total_planned: 0,
              total_completed: 0,
              total_deviation: 0,
              completion_percent: 0,
            });
          }

          const wcData = workCenterMap.get(wc.work_center_id)!;
          
          const deviation = completedQty - req.planned_quantity;
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
            completed_quantity: completedQty,
            deviation,
            deviation_percent: deviationPercent,
          });

          wcData.total_planned += req.planned_quantity;
          wcData.total_completed += completedQty;
        });
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
