import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { QualityInspection, DefectType } from "@/hooks/useQualityInspections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<QualityInspection>) => void;
  inspection?: QualityInspection | null;
  defectTypes: DefectType[];
  productionOrders: { id: string; order_number: string }[];
  isLoading?: boolean;
}

const RESULT_OPTIONS = [
  { value: "pending", label: "Ожидает" },
  { value: "passed", label: "Годен" },
  { value: "rejected", label: "Брак" },
  { value: "rework", label: "Доработка" },
  { value: "conditional", label: "Условно годен" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Черновик" },
  { value: "in_progress", label: "В работе" },
  { value: "completed", label: "Завершён" },
];

export const QualityInspectionDialog = ({
  open, onOpenChange, onSubmit, inspection, defectTypes, productionOrders, isLoading,
}: Props) => {
  const [form, setForm] = useState({
    inspection_number: "",
    production_order_id: "",
    inspection_date: new Date().toISOString().slice(0, 10),
    status: "pending",
    result: "pending",
    inspected_quantity: 0,
    passed_quantity: 0,
    rejected_quantity: 0,
    rework_quantity: 0,
    defect_type_id: "",
    defect_description: "",
    corrective_action: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (inspection) {
        setForm({
          inspection_number: inspection.inspection_number,
          production_order_id: inspection.production_order_id,
          inspection_date: inspection.inspection_date,
          status: inspection.status,
          result: inspection.result,
          inspected_quantity: inspection.inspected_quantity,
          passed_quantity: inspection.passed_quantity,
          rejected_quantity: inspection.rejected_quantity,
          rework_quantity: inspection.rework_quantity,
          defect_type_id: inspection.defect_type_id || "",
          defect_description: inspection.defect_description || "",
          corrective_action: inspection.corrective_action || "",
          notes: inspection.notes || "",
        });
      } else {
        setForm({
          inspection_number: "",
          production_order_id: "",
          inspection_date: new Date().toISOString().slice(0, 10),
          status: "pending",
          result: "pending",
          inspected_quantity: 0,
          passed_quantity: 0,
          rejected_quantity: 0,
          rework_quantity: 0,
          defect_type_id: "",
          defect_description: "",
          corrective_action: "",
          notes: "",
        });
      }
    }
  }, [open, inspection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.defect_type_id) payload.defect_type_id = null;
    if (inspection) payload.id = inspection.id;
    onSubmit(payload);
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {inspection ? "Редактирование акта ОТК" : "Новый акт контроля качества"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Номер акта</Label>
              {inspection ? (
                <Input value={form.inspection_number} readOnly className="bg-muted cursor-default" />
              ) : (
                <Input value="" readOnly placeholder="Генерируется автоматически" className="bg-muted cursor-default" tabIndex={-1} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Дата проверки *</Label>
              <Input type="date" value={form.inspection_date} onChange={e => update("inspection_date", e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Производственный заказ *</Label>
              <Select value={form.production_order_id} onValueChange={v => update("production_order_id", v)}>
                <SelectTrigger><SelectValue placeholder="Выберите заказ" /></SelectTrigger>
                <SelectContent>
                  {productionOrders.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Результат</Label>
              <Select value={form.result} onValueChange={v => update("result", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Проверено</Label>
              <Input type="number" min={0} step="0.01" value={form.inspected_quantity} onChange={e => update("inspected_quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Годных</Label>
              <Input type="number" min={0} step="0.01" value={form.passed_quantity} onChange={e => update("passed_quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Брак</Label>
              <Input type="number" min={0} step="0.01" value={form.rejected_quantity} onChange={e => update("rejected_quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>На доработку</Label>
              <Input type="number" min={0} step="0.01" value={form.rework_quantity} onChange={e => update("rework_quantity", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип дефекта</Label>
              <Select value={form.defect_type_id} onValueChange={v => update("defect_type_id", v)}>
                <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                <SelectContent>
                  {defectTypes.filter(d => d.is_active).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Описание дефекта</Label>
            <Textarea value={form.defect_description} onChange={e => update("defect_description", e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Корректирующие действия</Label>
            <Textarea value={form.corrective_action} onChange={e => update("corrective_action", e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isLoading || !form.production_order_id}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {inspection ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
