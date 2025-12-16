import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { Loader2, Plus } from "lucide-react";

interface QuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customerId: string) => void;
}

export const QuickCustomerDialog = ({
  open,
  onOpenChange,
  onCustomerCreated,
}: QuickCustomerDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    inn: "",
    contact_person: "",
    phone: "",
    email: "",
  });
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      const result = await createCustomer.mutateAsync({
        name: formData.name.trim(),
        inn: formData.inn.trim() || null,
        kpp: null,
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: null,
        notes: null,
        is_active: true,
      });

      if (result?.id) {
        onCustomerCreated(result.id);
        onOpenChange(false);
        setFormData({ name: "", inn: "", contact_person: "", phone: "", email: "" });
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Быстрое создание клиента
          </DialogTitle>
          <DialogDescription>
            Создайте нового клиента для привязки к заказу
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Наименование *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ООО Компания"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inn">ИНН</Label>
            <Input
              id="inn"
              value={formData.inn}
              onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
              placeholder="1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Контактное лицо</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.ru"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createCustomer.isPending || !formData.name.trim()}>
              {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
