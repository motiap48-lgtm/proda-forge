import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useActiveCustomers } from "@/hooks/useCustomers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";

interface BulkCustomerAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrderIds: string[];
  onComplete: () => void;
}

export const BulkCustomerAssignDialog = ({
  open,
  onOpenChange,
  selectedOrderIds,
  onComplete,
}: BulkCustomerAssignDialogProps) => {
  const [customerId, setCustomerId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: customers } = useActiveCustomers();
  const queryClient = useQueryClient();

  const customerOptions = customers?.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.code})`,
  })) || [];

  const handleAssign = async () => {
    if (!customerId) {
      toast.error("Выберите клиента");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("production_orders")
        .update({ customer_id: customerId, updated_at: new Date().toISOString() })
        .in("id", selectedOrderIds);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["production-orders-with-customers"] });
      
      const selectedCustomer = customers?.find(c => c.id === customerId);
      toast.success(`Клиент "${selectedCustomer?.name}" назначен для ${selectedOrderIds.length} заказов`);
      onComplete();
      onOpenChange(false);
      setCustomerId("");
    } catch (error: any) {
      console.error("Error assigning customer:", error);
      toast.error("Ошибка при назначении клиента: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCustomer = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("production_orders")
        .update({ customer_id: null, updated_at: new Date().toISOString() })
        .in("id", selectedOrderIds);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["production-orders-with-customers"] });
      
      toast.success(`Клиент очищен для ${selectedOrderIds.length} заказов`);
      onComplete();
      onOpenChange(false);
      setCustomerId("");
    } catch (error: any) {
      console.error("Error clearing customer:", error);
      toast.error("Ошибка при очистке клиента: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Массовое назначение клиента
          </DialogTitle>
          <DialogDescription>
            Выберите клиента для назначения {selectedOrderIds.length} выбранным заказам
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <SearchableSelect
            options={customerOptions}
            value={customerId}
            onValueChange={setCustomerId}
            placeholder="Выберите клиента..."
            searchPlaceholder="Поиск клиента..."
            emptyText="Клиенты не найдены"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClearCustomer}
            disabled={isSubmitting}
          >
            Очистить клиента
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting || !customerId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Назначить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
