import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Plus, Edit, Trash2, Building2, Phone, Mail, MapPin, User, Wand2 } from "lucide-react";
import {
  useContractors,
  useCreateContractor,
  useUpdateContractor,
  useDeleteContractor,
  Contractor,
} from "@/hooks/useContractors";

interface ContractorFormData {
  code: string;
  name: string;
  inn: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
}

const initialFormData: ContractorFormData = {
  code: "AUTO",
  name: "",
  inn: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  is_active: true,
};

export function ContractorsManagement() {
  const { data: contractors, isLoading } = useContractors();
  const createContractor = useCreateContractor();
  const updateContractor = useUpdateContractor();
  const deleteContractor = useDeleteContractor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState<ContractorFormData>(initialFormData);

  const handleOpenCreate = () => {
    setSelectedContractor(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setFormData({
      code: contractor.code,
      name: contractor.name,
      inn: contractor.inn || "",
      contact_person: contractor.contact_person || "",
      phone: contractor.phone || "",
      email: contractor.email || "",
      address: contractor.address || "",
      notes: contractor.notes || "",
      is_active: contractor.is_active,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    if (selectedContractor) {
      await updateContractor.mutateAsync({
        id: selectedContractor.id,
        ...formData,
        inn: formData.inn || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });
    } else {
      await createContractor.mutateAsync({
        code: formData.code === "AUTO" ? "" : formData.code,
        name: formData.name,
        inn: formData.inn || null,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedContractor) return;
    await deleteContractor.mutateAsync(selectedContractor.id);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Контрагенты</h3>
          <p className="text-sm text-muted-foreground">
            Справочник организаций для внешних (аутсорсинговых) операций
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {contractors?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Контрагенты не добавлены</p>
            <Button onClick={handleOpenCreate} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Добавить первого контрагента
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contractors?.map((contractor) => (
            <Card key={contractor.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    <div>
                      <CardTitle className="text-base">{contractor.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{contractor.code}</p>
                    </div>
                  </div>
                  <Badge variant={contractor.is_active ? "default" : "secondary"}>
                    {contractor.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {contractor.inn && (
                  <div className="text-muted-foreground">
                    ИНН: {contractor.inn}
                  </div>
                )}
                {contractor.contact_person && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {contractor.contact_person}
                  </div>
                )}
                {contractor.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {contractor.phone}
                  </div>
                )}
                {contractor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {contractor.email}
                  </div>
                )}
                {contractor.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{contractor.address}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(contractor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDelete(contractor)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedContractor ? "Редактирование контрагента" : "Новый контрагент"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Код</Label>
                <div className="relative">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={formData.code === "AUTO" || !!selectedContractor}
                    className="pr-10"
                  />
                  {formData.code === "AUTO" && (
                    <Wand2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>ИНН</Label>
                <Input
                  value={formData.inn}
                  onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ООО Гальваника и Ко"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Контактное лицо</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Иванов И.И."
                />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@contractor.ru"
              />
            </div>

            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Активен</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !formData.name.trim() ||
                  createContractor.isPending ||
                  updateContractor.isPending
                }
              >
                {selectedContractor ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить контрагента?</AlertDialogTitle>
            <AlertDialogDescription>
              Контрагент "{selectedContractor?.name}" будет удалён. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
