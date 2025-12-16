import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Wand2 } from "lucide-react";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  Customer,
} from "@/hooks/useCustomers";

export const CustomersManagement = () => {
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    inn: "",
    kpp: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      inn: "",
      kpp: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
    });
    setEditingCustomer(null);
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        inn: customer.inn || "",
        kpp: customer.kpp || "",
        contact_person: customer.contact_person || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
        is_active: customer.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingCustomer) {
      await updateCustomer.mutateAsync({
        id: editingCustomer.id,
        ...formData,
        inn: formData.inn || null,
        kpp: formData.kpp || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });
    } else {
      await createCustomer.mutateAsync({
        ...formData,
        inn: formData.inn || null,
        kpp: formData.kpp || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const filteredCustomers = customers?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.inn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <p className="text-muted-foreground">Загрузка...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск клиентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить клиента
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredCustomers?.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Клиенты не найдены
          </p>
        ) : (
          filteredCustomers?.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{customer.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {customer.code}
                  </Badge>
                  {!customer.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Неактивен
                    </Badge>
                  )}
                </div>
                {customer.inn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ИНН: {customer.inn}
                    {customer.kpp && ` / КПП: ${customer.kpp}`}
                  </p>
                )}
                {customer.contact_person && (
                  <p className="text-xs text-muted-foreground">
                    {customer.contact_person}
                    {customer.phone && ` • ${customer.phone}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(customer)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCustomerToDelete(customer);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Редактировать клиента" : "Новый клиент"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Измените данные клиента"
                : "Заполните информацию о новом клиенте"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingCustomer && (
              <div className="space-y-2">
                <Label>Код</Label>
                <div className="flex items-center gap-2">
                  <Input value={editingCustomer.code} disabled />
                  <Wand2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Наименование *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="ООО Компания"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inn">ИНН</Label>
                <Input
                  id="inn"
                  value={formData.inn}
                  onChange={(e) =>
                    setFormData({ ...formData, inn: e.target.value })
                  }
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpp">КПП</Label>
                <Input
                  id="kpp"
                  value={formData.kpp}
                  onChange={(e) =>
                    setFormData({ ...formData, kpp: e.target.value })
                  }
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Контактное лицо</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@company.ru"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Активен</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              {editingCustomer ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить клиента "{customerToDelete?.name}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
