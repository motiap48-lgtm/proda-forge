import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Типы продукции
type ProductType = 'material' | 'semi-finished' | 'assembly' | 'finished';

// Базовый интерфейс потребности
interface BaseRequirement {
  product_id: string;
  product_code: string;
  product_name: string;
  unit: string;
  product_type: ProductType;
  gross_requirement: number;
  // Потребность от изменений плана (увеличение плана)
  plan_increase_requirement: number;
  // Уменьшение потребности (уменьшение плана)
  plan_decrease_amount: number;
  on_hand: number;
  reserved: number;
  available: number;
  net_requirement: number;
  status: 'shortage' | 'warning' | 'ok';
}

// Потребность к закупке (только материалы)
export interface PurchaseRequirement extends BaseRequirement {
  product_type: 'material';
}

// Потребность к производству (ПФ, СБ, ГП)
export interface ProductionRequirement extends BaseRequirement {
  product_type: 'semi-finished' | 'assembly' | 'finished';
  work_center_id?: string;
  work_center_name?: string;
  work_center_code?: string;
  source_orders: string[]; // Номера заказов, из которых возникла потребность
}

// Элемент рапорта по участку
export interface WorkCenterReportItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_type: ProductType;
  quantity: number;
  unit: string;
}

// Рапорт по участку (рабочему центру)
export interface WorkCenterReport {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  department?: string;
  items: WorkCenterReportItem[];
  total_items: number;
  total_quantity: number;
}

// Рапорт по подразделению (группировка участков)
export interface DepartmentReport {
  department: string;
  work_centers: WorkCenterReport[];
  total_items: number;
  total_quantity: number;
}

// Заказ без спецификации
export interface OrderWithoutSpec {
  order_number: string;
  product_name: string;
  product_code: string;
}

// Полный результат MRP расчета
export interface MRPCalculationResult {
  purchaseRequirements: PurchaseRequirement[];
  productionRequirements: ProductionRequirement[];
  workCenterReports: WorkCenterReport[];
  ordersWithoutSpec: OrderWithoutSpec[];
  summary: {
    totalPurchaseItems: number;
    totalProductionItems: number;
    totalShortages: number;
    totalWorkCenters: number;
    totalPlanIncrease: number;
    totalPlanDecrease: number;
  };
}

// Для обратной совместимости
export interface MRPRequirement extends BaseRequirement {}

// Кэш спецификаций для рекурсии
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

// Кэш техмаршрутов для определения рабочих центров
interface RoutingCache {
  [productId: string]: {
    work_center_id: string;
    work_center_code: string;
    work_center_name: string;
    department?: string;
  } | null;
}

// Хук для получения списка производственных заказов для выбора
export const useMRPProductionOrders = (horizonDays: number = 30) => {
  return useQuery({
    queryKey: ["mrp-production-orders", horizonDays],
    queryFn: async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + horizonDays);

      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          id,
          order_number,
          quantity,
          completed_quantity,
          planned_start_date,
          status,
          products:product_id(id, code, name, unit, product_type)
        `)
        .lte("planned_start_date", endDate.toISOString())
        .in("status", ["planned", "released"])
        .order("planned_start_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useMRPCalculation = (horizonDays: number = 30, selectedOrderIds?: string[]) => {
  return useQuery({
    queryKey: ["mrp-calculation", horizonDays, selectedOrderIds],
    queryFn: async (): Promise<MRPCalculationResult> => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + horizonDays);

      // 1. Получаем производственные заказы в горизонте планирования
      let ordersQuery = supabase
        .from("production_orders")
        .select(`
          *,
          products:product_id(id, code, name, unit, product_type)
        `)
        .in("status", ["planned", "released"]);
      
      // Если выбраны конкретные заказы, фильтруем по ним
      if (selectedOrderIds && selectedOrderIds.length > 0) {
        ordersQuery = ordersQuery.in("id", selectedOrderIds);
      } else {
        ordersQuery = ordersQuery.lte("planned_start_date", endDate.toISOString());
      }
      
      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Если нет заказов - возвращаем пустой результат
      if (!orders || orders.length === 0) {
        return {
          purchaseRequirements: [],
          productionRequirements: [],
          workCenterReports: [],
          ordersWithoutSpec: [],
          summary: {
            totalPurchaseItems: 0,
            totalProductionItems: 0,
            totalShortages: 0,
            totalWorkCenters: 0,
            totalPlanIncrease: 0,
            totalPlanDecrease: 0,
          },
        };
      }

      // 2. Загружаем ВСЕ активные спецификации с материалами
      const { data: allSpecifications, error: specError } = await supabase
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

      if (specError) throw specError;

      // 3. Загружаем ВСЕ активные техмаршруты с первой операцией (для определения рабочего центра)
      const { data: routingSheets, error: routingError } = await supabase
        .from("routing_sheets")
        .select(`
          id,
          product_id,
          routing_operations(
            sequence,
            work_center_id,
            work_centers:work_center_id(id, code, name, department)
          )
        `)
        .eq("is_active", true);

      if (routingError) throw routingError;

      // 4. Загружаем текущие остатки
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select(`
          product_id,
          quantity,
          reserved_quantity,
          available_quantity
        `);

      if (invError) throw invError;

      // Создаем кэш спецификаций по product_id
      const specCache: SpecificationCache = {};
      allSpecifications?.forEach(spec => {
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

      // Создаем кэш техмаршрутов по product_id (берем ПОСЛЕДНЮЮ операцию - где продукт "выходит")
      // В 1С ERP последняя операция маршрута определяет участок, где производится готовый ПФ/СБ/ГП
      const routingCache: RoutingCache = {};
      routingSheets?.forEach(sheet => {
        const sortedOps = sheet.routing_operations
          ?.sort((a: any, b: any) => b.sequence - a.sequence); // Сортировка по убыванию
        const lastOp = sortedOps?.[0]; // Берем последнюю операцию
        if (lastOp?.work_centers) {
          routingCache[sheet.product_id] = {
            work_center_id: lastOp.work_centers.id,
            work_center_code: lastOp.work_centers.code,
            work_center_name: lastOp.work_centers.name,
            department: lastOp.work_centers.department,
          };
        }
      });

      // Создаем карту остатков
      const inventoryMap = new Map<string, { on_hand: number; reserved: number; available: number }>();
      inventory?.forEach(inv => {
        inventoryMap.set(inv.product_id, {
          on_hand: Number(inv.quantity) || 0,
          reserved: Number(inv.reserved_quantity) || 0,
          available: Number(inv.available_quantity) || 0,
        });
      });

      // Аккумуляторы для результатов
      const purchaseReqs = new Map<string, PurchaseRequirement>();
      const productionReqs = new Map<string, ProductionRequirement>();
      const ordersWithoutSpec: OrderWithoutSpec[] = [];
      
      // Отслеживание изменений плана (для каждого заказа отдельно)
      const planChanges = new Map<string, { orderNumber: string; planDelta: number; productId: string }>();
      
      orders?.forEach(order => {
        const originalQty = order.original_quantity ?? order.quantity;
        const currentQty = order.quantity;
        const planDelta = currentQty - originalQty;
        if (planDelta !== 0) {
          planChanges.set(order.id, {
            orderNumber: order.order_number,
            planDelta,
            productId: order.product_id
          });
        }
      });

      // Рекурсивная функция разузловки
      const explodeBOM = (
        productId: string,
        productCode: string,
        productName: string,
        productType: ProductType,
        unit: string,
        requiredQty: number,
        sourceOrder: string,
        ancestorPath: Set<string> = new Set(), // Путь от корня для предотвращения циклов
        isPlanChange: 'increase' | 'decrease' | null = null // Флаг изменения плана
      ) => {
        // Защита от циклических ссылок (A -> B -> A)
        if (ancestorPath.has(productId)) {
          console.warn(`Circular reference detected for product ${productCode}`);
          return;
        }

        const spec = specCache[productId];

        // Если это материал (покупное) - добавляем в потребность к закупке
        if (productType === 'material') {
          if (!purchaseReqs.has(productId)) {
            const inv = inventoryMap.get(productId);
            purchaseReqs.set(productId, {
              product_id: productId,
              product_code: productCode,
              product_name: productName,
              unit: unit,
              product_type: 'material',
              gross_requirement: 0,
              plan_increase_requirement: 0,
              plan_decrease_amount: 0,
              on_hand: inv?.on_hand || 0,
              reserved: inv?.reserved || 0,
              available: inv?.available || 0,
              net_requirement: 0,
              status: 'ok',
            });
          }
          const req = purchaseReqs.get(productId)!;
          
          // Учитываем изменения плана
          if (isPlanChange === 'increase') {
            req.plan_increase_requirement += requiredQty;
          } else if (isPlanChange === 'decrease') {
            req.plan_decrease_amount += requiredQty;
          }
          req.gross_requirement += requiredQty;
          return;
        }

        // Если это производимое изделие (ПФ, СБ, ГП)
        if (!productionReqs.has(productId)) {
          const inv = inventoryMap.get(productId);
          const routing = routingCache[productId];
          productionReqs.set(productId, {
            product_id: productId,
            product_code: productCode,
            product_name: productName,
            unit: unit,
            product_type: productType as 'semi-finished' | 'assembly' | 'finished',
            gross_requirement: 0,
            plan_increase_requirement: 0,
            plan_decrease_amount: 0,
            on_hand: inv?.on_hand || 0,
            reserved: inv?.reserved || 0,
            available: inv?.available || 0,
            net_requirement: 0,
            status: 'ok',
            work_center_id: routing?.work_center_id,
            work_center_code: routing?.work_center_code,
            work_center_name: routing?.work_center_name,
            source_orders: [],
          });
        }
        const prodReq = productionReqs.get(productId)!;
        
        // Учитываем изменения плана
        if (isPlanChange === 'increase') {
          prodReq.plan_increase_requirement += requiredQty;
        } else if (isPlanChange === 'decrease') {
          prodReq.plan_decrease_amount += requiredQty;
        }
        prodReq.gross_requirement += requiredQty;
        if (!prodReq.source_orders.includes(sourceOrder)) {
          prodReq.source_orders.push(sourceOrder);
        }

        // Рекурсивно разузловываем компоненты
        if (spec && spec.materials.length > 0) {
          // Создаём новый Set для текущей ветви с добавлением текущего продукта
          const newAncestorPath = new Set(ancestorPath);
          newAncestorPath.add(productId);
          
          spec.materials.forEach(material => {
            const materialQty = material.quantity * (1 + material.waste_rate / 100) * requiredQty;
            explodeBOM(
              material.product_id,
              material.product_code,
              material.product_name,
              material.product_type,
              material.unit,
              materialQty,
              sourceOrder,
              newAncestorPath,
              isPlanChange // Передаём флаг изменения плана дальше по иерархии
            );
          });
        }
      };

      // Обрабатываем каждый производственный заказ
      orders?.forEach(order => {
        const product = order.products as any;
        if (!product) return;

        const spec = specCache[order.product_id];
        
        // Отслеживаем заказы без спецификации
        if (!spec || spec.materials.length === 0) {
          ordersWithoutSpec.push({
            order_number: order.order_number,
            product_name: product.name || 'Неизвестно',
            product_code: product.code || '',
          });
        }

        // Рассчитываем изменение плана
        const originalQty = order.original_quantity ?? order.quantity;
        const currentQty = order.quantity;
        const planDelta = currentQty - originalQty;
        
        // Оставшееся количество к производству
        const remainingQty = currentQty - order.completed_quantity;
        
        if (remainingQty > 0) {
          // Если план увеличился, разузловываем отдельно для изменений
          if (planDelta > 0) {
            // Базовая потребность (по оригинальному плану минус выполнено)
            const baseRemaining = Math.max(0, originalQty - order.completed_quantity);
            // Дополнительная потребность от увеличения плана
            const additionalRemaining = Math.min(planDelta, remainingQty);
            
            if (baseRemaining > 0) {
              explodeBOM(
                order.product_id,
                product.code,
                product.name,
                product.product_type,
                product.unit,
                baseRemaining,
                order.order_number,
                new Set(),
                null // Базовая потребность
              );
            }
            
            if (additionalRemaining > 0) {
              explodeBOM(
                order.product_id,
                product.code,
                product.name,
                product.product_type,
                product.unit,
                additionalRemaining,
                order.order_number,
                new Set(),
                'increase' // Потребность от увеличения плана
              );
            }
          } else if (planDelta < 0) {
            // Если план уменьшился - просто разузловываем оставшееся
            // но помечаем уменьшение для информирования
            explodeBOM(
              order.product_id,
              product.code,
              product.name,
              product.product_type,
              product.unit,
              remainingQty,
              order.order_number,
              new Set(),
              null
            );
            
            // Регистрируем уменьшение потребности (количество которое убрали)
            // Это информационное значение - сколько бы потребовалось, если бы план не уменьшили
            const decreaseAmount = Math.abs(planDelta);
            if (decreaseAmount > 0 && spec && spec.materials.length > 0) {
              spec.materials.forEach(material => {
                const materialQty = material.quantity * (1 + material.waste_rate / 100) * decreaseAmount;
                // Рекурсивно помечаем уменьшение
                explodeBOM(
                  material.product_id,
                  material.product_code,
                  material.product_name,
                  material.product_type,
                  material.unit,
                  materialQty,
                  order.order_number,
                  new Set([order.product_id]),
                  'decrease'
                );
              });
            }
          } else {
            // План не менялся - стандартная разузловка
            explodeBOM(
              order.product_id,
              product.code,
              product.name,
              product.product_type,
              product.unit,
              remainingQty,
              order.order_number,
              new Set(),
              null
            );
          }
        }
      });
      
      // Корректируем gross_requirement: вычитаем plan_decrease_amount (уменьшение уже учтено выше)
      // plan_decrease_amount - это информационное поле о том, сколько убрали из потребности
      purchaseReqs.forEach(req => {
        // gross_requirement уже корректный (содержит только фактическую потребность)
        // plan_decrease_amount показывает сколько сэкономили благодаря уменьшению плана
      });
      
      productionReqs.forEach(req => {
        // gross_requirement уже корректный (содержит только фактическую потребность)
        // plan_decrease_amount показывает сколько сэкономили благодаря уменьшению плана
      });

      // Рассчитываем чистую потребность и статусы для закупок
      purchaseReqs.forEach(req => {
        req.net_requirement = Math.max(0, req.gross_requirement - req.available);
        if (req.net_requirement > 0) {
          req.status = 'shortage';
        } else if (req.available < req.gross_requirement * 1.2) {
          req.status = 'warning';
        } else {
          req.status = 'ok';
        }
      });

      // Рассчитываем чистую потребность и статусы для производства
      productionReqs.forEach(req => {
        req.net_requirement = Math.max(0, req.gross_requirement - req.available);
        if (req.net_requirement > 0) {
          req.status = 'shortage';
        } else if (req.available < req.gross_requirement * 1.2) {
          req.status = 'warning';
        } else {
          req.status = 'ok';
        }
      });

      // Группируем производственные потребности по рабочим центрам
      // Получаем department из routingCache для каждого продукта
      const workCenterMap = new Map<string, WorkCenterReport>();
      productionReqs.forEach(req => {
        if (req.work_center_id && req.net_requirement > 0) {
          // Получаем department из routingCache
          const routingInfo = Object.values(routingCache).find(
            r => r?.work_center_id === req.work_center_id
          );
          
          if (!workCenterMap.has(req.work_center_id)) {
            workCenterMap.set(req.work_center_id, {
              work_center_id: req.work_center_id,
              work_center_code: req.work_center_code || '',
              work_center_name: req.work_center_name || 'Без участка',
              department: routingInfo?.department || undefined,
              items: [],
              total_items: 0,
              total_quantity: 0,
            });
          }
          const wcReport = workCenterMap.get(req.work_center_id)!;
          wcReport.items.push({
            product_id: req.product_id,
            product_code: req.product_code,
            product_name: req.product_name,
            product_type: req.product_type,
            quantity: req.net_requirement,
            unit: req.unit,
          });
          wcReport.total_items++;
          wcReport.total_quantity += req.net_requirement;
        }
      });

      // Добавляем позиции без рабочего центра
      const itemsWithoutWC: WorkCenterReportItem[] = [];
      productionReqs.forEach(req => {
        if (!req.work_center_id && req.net_requirement > 0) {
          itemsWithoutWC.push({
            product_id: req.product_id,
            product_code: req.product_code,
            product_name: req.product_name,
            product_type: req.product_type,
            quantity: req.net_requirement,
            unit: req.unit,
          });
        }
      });

      if (itemsWithoutWC.length > 0) {
        workCenterMap.set('unassigned', {
          work_center_id: 'unassigned',
          work_center_code: '-',
          work_center_name: 'Без назначенного участка',
          items: itemsWithoutWC,
          total_items: itemsWithoutWC.length,
          total_quantity: itemsWithoutWC.reduce((sum, i) => sum + i.quantity, 0),
        });
      }

      const purchaseRequirements = Array.from(purchaseReqs.values())
        .sort((a, b) => b.net_requirement - a.net_requirement);
      const productionRequirements = Array.from(productionReqs.values())
        .filter(r => r.product_type !== 'finished') // Исключаем ГП из потребности к производству
        .sort((a, b) => b.net_requirement - a.net_requirement);
      const workCenterReports = Array.from(workCenterMap.values())
        .sort((a, b) => a.work_center_name.localeCompare(b.work_center_name));

      return {
        purchaseRequirements,
        productionRequirements,
        workCenterReports,
        ordersWithoutSpec,
        summary: {
          totalPurchaseItems: purchaseRequirements.length,
          totalProductionItems: productionRequirements.length,
          totalShortages: purchaseRequirements.filter(r => r.status === 'shortage').length +
                          productionRequirements.filter(r => r.status === 'shortage').length,
          totalWorkCenters: workCenterReports.length,
          totalPlanIncrease: [...purchaseRequirements, ...productionRequirements].reduce((sum, r) => sum + (r.plan_increase_requirement || 0), 0),
          totalPlanDecrease: [...purchaseRequirements, ...productionRequirements].reduce((sum, r) => sum + (r.plan_decrease_amount || 0), 0),
        },
      };
    },
  });
};

export const usePurchaseRequisitions = () => {
  return useQuery({
    queryKey: ["purchase-requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requisitions")
        .select(`
          *,
          products:product_id(code, name, unit)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useSaveMRPCalculation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      planningHorizonDays,
      startDate,
      purchaseRequirements,
      productionRequirements,
    }: {
      planningHorizonDays: number;
      startDate: string;
      purchaseRequirements: PurchaseRequirement[];
      productionRequirements: ProductionRequirement[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Создаем запись расчета
      const { data: calculation, error: calcError } = await supabase
        .from("mrp_calculations")
        .insert({
          planning_horizon_days: planningHorizonDays,
          start_date: startDate,
          created_by: user?.id,
        })
        .select()
        .single();

      if (calcError) throw calcError;

      // Сохраняем результаты - покупные материалы
      const purchaseResults = purchaseRequirements.map(req => ({
        calculation_id: calculation.id,
        product_id: req.product_id,
        gross_requirement: req.gross_requirement,
        on_hand: req.on_hand,
        reserved: req.reserved,
        available: req.available,
        net_requirement: req.net_requirement,
        status: req.status,
      }));

      // Сохраняем результаты - производимые изделия
      const productionResults = productionRequirements.map(req => ({
        calculation_id: calculation.id,
        product_id: req.product_id,
        gross_requirement: req.gross_requirement,
        on_hand: req.on_hand,
        reserved: req.reserved,
        available: req.available,
        net_requirement: req.net_requirement,
        status: req.status,
      }));

      const allResults = [...purchaseResults, ...productionResults];

      if (allResults.length > 0) {
        const { error: resultsError } = await supabase
          .from("mrp_calculation_results")
          .insert(allResults);

        if (resultsError) throw resultsError;
      }

      // Создаем заявки на закупку только для материалов с дефицитом
      const purchaseReqs = purchaseRequirements
        .filter(req => req.net_requirement > 0)
        .map((req, index) => {
          const reqDate = new Date(startDate);
          reqDate.setDate(reqDate.getDate() + 7);
          
          return {
            requisition_number: `PR-${calculation.id.substring(0, 8)}-${index + 1}`,
            calculation_id: calculation.id,
            product_id: req.product_id,
            quantity: req.net_requirement,
            required_date: reqDate.toISOString().split('T')[0],
            created_by: user?.id,
          };
        });

      if (purchaseReqs.length > 0) {
        const { error: reqsError } = await supabase
          .from("purchase_requisitions")
          .insert(purchaseReqs);

        if (reqsError) throw reqsError;
      }

      return { calculation, purchaseReqsCount: purchaseReqs.length };
    },
    onSuccess: (data) => {
      toast.success(`Расчет сохранен. Создано заявок на закупку: ${data.purchaseReqsCount}`);
      queryClient.invalidateQueries({ queryKey: ["mrp-history"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
    },
    onError: (error) => {
      toast.error("Ошибка при сохранении расчета: " + error.message);
    },
  });
};

export const useMRPHistory = () => {
  return useQuery({
    queryKey: ["mrp-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mrp_calculations")
        .select(`
          *,
          mrp_calculation_results(count)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useDeleteMRPCalculation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calculationId: string) => {
      const { error } = await supabase
        .from("mrp_calculations")
        .delete()
        .eq("id", calculationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Расчет удален");
      queryClient.invalidateQueries({ queryKey: ["mrp-history"] });
    },
    onError: (error) => {
      toast.error("Ошибка при удалении: " + error.message);
    },
  });
};
