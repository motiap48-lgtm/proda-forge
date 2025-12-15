import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProductionOrderOperations = (orderId?: string) => {
  return useQuery({
    queryKey: ["production-order-operations", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from("production_order_operations")
        .select(`
          *,
          routing_operations:routing_operation_id(
            name,
            setup_time_minutes,
            cycle_time_minutes,
            work_centers:work_center_id(name, code)
          ),
          profiles:operator_id(full_name)
        `)
        .eq("production_order_id", orderId)
        .order("sequence");

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

export const useProductionOrderHistory = (orderId?: string) => {
  return useQuery({
    queryKey: ["production-order-history", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from("production_order_history")
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .eq("production_order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

export interface OperationReportData {
  quantity: number;
  defectQuantity: number;
  setupTimeActual: number | null;
  cycleTimeActual: number | null;
  notes: string;
}

export const useUpdateOperationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reportData,
      userId
    }: { 
      id: string; 
      status: string; 
      reportData?: OperationReportData;
      userId?: string;
    }) => {
      const updates: any = {};
      
      // Получаем текущую операцию и заказ
      const { data: currentOp } = await supabase
        .from("production_order_operations")
        .select("completed_quantity, production_order_id, status, actual_start_date, routing_operations(name)")
        .eq("id", id)
        .single();

      // Важно: получаем актуальное количество заказа для проверки завершения
      const { data: productionOrder } = await supabase
        .from("production_orders")
        .select("quantity, order_number, completed_quantity")
        .eq("id", currentOp?.production_order_id)
        .single();

      const currentCompleted = Number(currentOp?.completed_quantity) || 0;
      const orderQuantity = Number(productionOrder?.quantity) || 0;
      
      if (status === 'in_progress' && !currentOp?.actual_start_date) {
        updates.actual_start_date = new Date().toISOString();
        updates.status = 'in_progress';
        
        // Записываем в историю начало операции
        if (userId && currentOp?.production_order_id) {
          await supabase.from("production_order_history").insert({
            production_order_id: currentOp.production_order_id,
            user_id: userId,
            change_type: "operation_started",
            description: `Начата операция: ${currentOp.routing_operations?.name || 'Неизвестно'}`,
            new_value: new Date().toISOString(),
          });
        }
      }
      
      if (status === 'completed' && reportData) {
        // Учитываем брак: добавляем только годные изделия
        const goodQuantity = Math.max(0, reportData.quantity - reportData.defectQuantity);
        const newCompleted = currentCompleted + goodQuantity;
        updates.completed_quantity = newCompleted;
        
        // Сохраняем фактическое время
        if (reportData.setupTimeActual !== null) {
          updates.setup_time_actual = reportData.setupTimeActual;
        }
        if (reportData.cycleTimeActual !== null) {
          updates.cycle_time_actual = reportData.cycleTimeActual;
        }
        if (reportData.notes) {
          updates.notes = reportData.notes;
        }
        
        // Устанавливаем статус "завершено" только если выполнено все количество
        if (newCompleted >= orderQuantity) {
          updates.status = 'completed';
          updates.actual_end_date = new Date().toISOString();
        } else {
          // Если не все выполнено, оставляем "в процессе"
          updates.status = 'in_progress';
        }
        
        // Записываем в историю регистрацию выработки
        if (userId && currentOp?.production_order_id) {
          let historyDescription = `Зарегистрирована выработка: ${currentOp.routing_operations?.name || 'Неизвестно'} — ${goodQuantity} шт.`;
          if (reportData.defectQuantity > 0) {
            historyDescription += ` (брак: ${reportData.defectQuantity} шт.)`;
          }
          
          await supabase.from("production_order_history").insert({
            production_order_id: currentOp.production_order_id,
            user_id: userId,
            change_type: "output_registered",
            description: historyDescription,
            old_value: currentCompleted.toString(),
            new_value: newCompleted.toString(),
          });
        }
      } else if (status !== 'in_progress' && status !== 'completed') {
        updates.status = status;
      }

      const { data: operation, error } = await supabase
        .from("production_order_operations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Обновляем прогресс производственного заказа
      if (operation && reportData) {
        // Получаем все операции заказа
        const { data: allOperations } = await supabase
          .from("production_order_operations")
          .select("completed_quantity, status")
          .eq("production_order_id", operation.production_order_id);

        if (allOperations && productionOrder) {
          // Вычисляем минимальное completed_quantity среди всех операций
          const minCompleted = Math.min(
            ...allOperations.map(op => Number(op.completed_quantity) || 0)
          );

          // Проверяем, все ли операции завершены
          const allOperationsCompleted = allOperations.every(op => op.status === 'completed');
          
          // Определяем статус заказа
          let orderStatus = 'in_progress';
          if (allOperationsCompleted && minCompleted >= productionOrder.quantity) {
            orderStatus = 'completed';
          } else if (minCompleted > 0) {
            orderStatus = 'in_progress';
          } else {
            orderStatus = 'released';
          }

          // Обновляем производственный заказ
          const orderUpdates: any = { 
            completed_quantity: minCompleted,
            status: orderStatus,
          };
          
          if (orderStatus === 'completed') {
            orderUpdates.actual_end_date = new Date().toISOString().split('T')[0];
          }
          
          // Устанавливаем actual_start_date если это первая регистрация выработки
          const { data: currentOrder } = await supabase
            .from("production_orders")
            .select("actual_start_date")
            .eq("id", operation.production_order_id)
            .single();
            
          if (!currentOrder?.actual_start_date) {
            orderUpdates.actual_start_date = new Date().toISOString().split('T')[0];
          }

          await supabase
            .from("production_orders")
            .update(orderUpdates)
            .eq("id", operation.production_order_id);
        }
      }

      return operation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-order-operations"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["production-order"] });
      toast.success("Выработка зарегистрирована");
    },
    onError: (error) => {
      toast.error("Ошибка при регистрации: " + error.message);
    },
  });
};

export const useAddOrderHistory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (history: {
      production_order_id: string;
      user_id: string;
      change_type: string;
      old_value?: string;
      new_value?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("production_order_history")
        .insert(history)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-order-history"] });
    },
  });
};
