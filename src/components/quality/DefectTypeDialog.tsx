import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle } from "lucide-react";
import type { DefectType } from "@/hooks/useQualityInspections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<DefectType>) => void;
  defectType?: DefectType | null;
  isLoading?: boolean;
}

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Незначительный" },
  { value: "major", label: "Значительный" },
  { value: "critical", label: "Критический" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "Общий" },
  { value: "dimensional", label: "Размерный" },
  { value: "surface", label: "Поверхностный" },
  { value: "structural", label: "Структурный" },
  { value: "functional", label: "Функциональный" },
];

export const DefectTypeDialog = ({ open, onOpenChange, onSubmit, defectType, isLoading }: Props) => {
  const [form, setForm] = useState({ code: "", name: "", description: "", category: "general", severity: "minor", is_active: true });

  useEffect(() => {
    if (open) {
      if (defectType) {
        setForm({
          code: defectType.code,
          name: defectType.name,
          description: defectType.description || "",
          category: defectType.category,
          severity: defectType.severity,
          is_active: defectType.is_active,
        });
      } else {
        setForm({ code: "", name: "", description: "", category: "general", severity: "minor", is_active: true });
      }
    }
  }, [open, defectType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (defectType) payload.id = defectType.id;
    onSubmit(payload);
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {defectType ? "Редактирование типа дефекта" : "Новый тип дефекта"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Код *</Label>
              <Input value={form.code} onChange={e => update("code", e.target.value)} required placeholder="DEF-001" />
            </div>
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={form.category} onValueChange={v => update("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Серьёзность</Label>
              <Select value={form.severity} onValueChange={v => update("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => update("is_active", v)} />
            <Label>Активен</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {defectType ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
