import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Clock, AlertTriangle, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface OperationReportData {
  quantity: number;
  defectQuantity: number;
  setupTimeActual: number | null;
  cycleTimeActual: number | null;
  notes: string;
}

interface CompleteOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: OperationReportData) => void;
  maxQuantity: number;
  operationName: string;
  workCenterName?: string;
  plannedSetupTime?: number;
  plannedCycleTime?: number;
  isLoading?: boolean;
}

export const CompleteOperationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  maxQuantity,
  operationName,
  workCenterName,
  plannedSetupTime,
  plannedCycleTime,
  isLoading = false,
}: CompleteOperationDialogProps) => {
  const [quantity, setQuantity] = useState(maxQuantity.toString());
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [setupTimeActual, setSetupTimeActual] = useState(plannedSetupTime?.toString() || "");
  const [cycleTimeActual, setCycleTimeActual] = useState(plannedCycleTime?.toString() || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(maxQuantity.toString());
      setDefectQuantity("0");
      setSetupTimeActual(plannedSetupTime?.toString() || "");
      setCycleTimeActual(plannedCycleTime?.toString() || "");
      setNotes("");
    }
  }, [open, maxQuantity, plannedSetupTime, plannedCycleTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyValue = parseFloat(quantity);
    const defectValue = parseFloat(defectQuantity) || 0;
    
    if (qtyValue > 0 && qtyValue <= maxQuantity) {
      onConfirm({
        quantity: qtyValue,
        defectQuantity: defectValue,
        setupTimeActual: setupTimeActual ? parseFloat(setupTimeActual) : null,
        cycleTimeActual: cycleTimeActual ? parseFloat(cycleTimeActual) : null,
        notes: notes.trim(),
      });
    }
  };

  const totalOutput = parseFloat(quantity) || 0;
  const defects = parseFloat(defectQuantity) || 0;
  const goodQuantity = Math.max(0, totalOutput - defects);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Регистрация выработки
          </DialogTitle>
          <DialogDescription>
            Операция: <span className="font-medium text-foreground">{operationName}</span>
            {workCenterName && (
              <>
                <br />
                Участок: <span className="font-medium text-foreground">{workCenterName}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Количество */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Изготовлено *
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Макс: ${maxQuantity}`}
                required
              />
              <p className="text-xs text-muted-foreground">
                Осталось сделать: {maxQuantity}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defect" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Брак
              </Label>
              <Input
                id="defect"
                type="number"
                step="0.01"
                min="0"
                max={totalOutput}
                value={defectQuantity}
                onChange={(e) => setDefectQuantity(e.target.value)}
                placeholder="0"
              />
              {defects > 0 && (
                <p className="text-xs text-amber-600">
                  Годных: {goodQuantity.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Время */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setupTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Время наладки (мин)
              </Label>
              <Input
                id="setupTime"
                type="number"
                step="1"
                min="0"
                value={setupTimeActual}
                onChange={(e) => setSetupTimeActual(e.target.value)}
                placeholder={plannedSetupTime ? `План: ${plannedSetupTime}` : "—"}
              />
              {plannedSetupTime !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Плановое: {plannedSetupTime} мин
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycleTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Время обработки (мин)
              </Label>
              <Input
                id="cycleTime"
                type="number"
                step="0.1"
                min="0"
                value={cycleTimeActual}
                onChange={(e) => setCycleTimeActual(e.target.value)}
                placeholder={plannedCycleTime ? `План: ${plannedCycleTime}` : "—"}
              />
              {plannedCycleTime !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Плановое: {plannedCycleTime} мин
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Примечания */}
          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарии, причины брака, замечания..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && <CheckCircle className="mr-2 h-4 w-4" />}
              Зарегистрировать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
