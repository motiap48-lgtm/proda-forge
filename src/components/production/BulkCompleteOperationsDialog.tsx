import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Clock, AlertTriangle, Package, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface BulkOperationReportData {
  quantity: number;
  defectQuantity: number;
  setupTimeActual: number | null;
  cycleTimeActual: number | null;
  notes: string;
}

interface OperationForBulk {
  id: string;
  sequence: number;
  name: string;
  workCenterName?: string;
  completedQuantity: number;
  maxQuantity: number;
  isBlocked: boolean;
  blockedByName?: string;
}

interface BulkCompleteOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (operationIds: string[], data: BulkOperationReportData) => void;
  operations: OperationForBulk[];
  orderQuantity: number;
  isLoading?: boolean;
}

export const BulkCompleteOperationsDialog = ({
  open,
  onOpenChange,
  onConfirm,
  operations,
  orderQuantity,
  isLoading = false,
}: BulkCompleteOperationsDialogProps) => {
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [setupTimeActual, setSetupTimeActual] = useState("");
  const [cycleTimeActual, setCycleTimeActual] = useState("");
  const [notes, setNotes] = useState("");

  // Фильтруем операции которые можно завершить
  const availableOperations = operations.filter(op => !op.isBlocked && op.maxQuantity > 0);
  
  // Максимальное количество = минимум среди выбранных операций
  const maxQuantity = selectedOperations.length > 0
    ? Math.min(...selectedOperations.map(id => {
        const op = operations.find(o => o.id === id);
        return op?.maxQuantity || 0;
      }))
    : 0;

  useEffect(() => {
    if (open) {
      setSelectedOperations([]);
      setQuantity("1");
      setDefectQuantity("0");
      setSetupTimeActual("");
      setCycleTimeActual("");
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    // Когда меняется maxQuantity, корректируем введённое количество
    if (maxQuantity > 0 && parseFloat(quantity) > maxQuantity) {
      setQuantity(maxQuantity.toString());
    }
  }, [maxQuantity, quantity]);

  const toggleOperation = (id: string) => {
    setSelectedOperations(prev => 
      prev.includes(id) 
        ? prev.filter(opId => opId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedOperations(availableOperations.map(op => op.id));
  };

  const clearSelection = () => {
    setSelectedOperations([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyValue = parseFloat(quantity);
    const defectValue = parseFloat(defectQuantity) || 0;
    
    if (selectedOperations.length > 0 && qtyValue > 0 && qtyValue <= maxQuantity) {
      onConfirm(selectedOperations, {
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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Массовая регистрация выработки
          </DialogTitle>
          <DialogDescription>
            Выберите операции и укажите количество для одновременной регистрации
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Выбор операций */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Операции для регистрации</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll} disabled={availableOperations.length === 0}>
                  Выбрать все
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={selectedOperations.length === 0}>
                  Очистить
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-2">
                {operations.map((operation) => (
                  <div 
                    key={operation.id}
                    className={`flex items-center gap-3 p-2 rounded-md ${
                      operation.isBlocked 
                        ? "bg-amber-50 opacity-60" 
                        : selectedOperations.includes(operation.id) 
                          ? "bg-primary/5 border border-primary/30" 
                          : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={operation.id}
                      checked={selectedOperations.includes(operation.id)}
                      onCheckedChange={() => toggleOperation(operation.id)}
                      disabled={operation.isBlocked || operation.maxQuantity <= 0}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {operation.sequence}
                        </span>
                        <span className="font-medium truncate">{operation.name}</span>
                        {operation.isBlocked && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">
                            Заблокировано
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                        {operation.workCenterName && <span>{operation.workCenterName}</span>}
                        <span>Выполнено: {operation.completedQuantity}/{orderQuantity}</span>
                        {!operation.isBlocked && <span className="text-green-600">Доступно: {operation.maxQuantity}</span>}
                        {operation.isBlocked && operation.blockedByName && (
                          <span className="text-amber-600">Ожидает: {operation.blockedByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {selectedOperations.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Выбрано операций: <span className="font-medium text-foreground">{selectedOperations.length}</span>
                {maxQuantity > 0 && (
                  <> • Макс. количество: <span className="font-medium text-foreground">{maxQuantity}</span></>
                )}
              </p>
            )}
          </div>

          <Separator />

          {/* Количество */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-quantity" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Изготовлено на каждой операции *
              </Label>
              <Input
                id="bulk-quantity"
                type="number"
                step="0.01"
                min="0.01"
                max={maxQuantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={maxQuantity > 0 ? `Макс: ${maxQuantity}` : "—"}
                disabled={selectedOperations.length === 0}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-defect" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Брак
              </Label>
              <Input
                id="bulk-defect"
                type="number"
                step="0.01"
                min="0"
                max={totalOutput}
                value={defectQuantity}
                onChange={(e) => setDefectQuantity(e.target.value)}
                placeholder="0"
                disabled={selectedOperations.length === 0}
              />
              {defects > 0 && (
                <p className="text-xs text-amber-600">
                  Годных: {goodQuantity.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Время */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-setupTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Время наладки (мин)
              </Label>
              <Input
                id="bulk-setupTime"
                type="number"
                step="1"
                min="0"
                value={setupTimeActual}
                onChange={(e) => setSetupTimeActual(e.target.value)}
                disabled={selectedOperations.length === 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-cycleTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Время обработки (мин)
              </Label>
              <Input
                id="bulk-cycleTime"
                type="number"
                step="0.1"
                min="0"
                value={cycleTimeActual}
                onChange={(e) => setCycleTimeActual(e.target.value)}
                disabled={selectedOperations.length === 0}
              />
            </div>
          </div>

          {/* Примечания */}
          <div className="space-y-2">
            <Label htmlFor="bulk-notes">Примечания</Label>
            <Textarea
              id="bulk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарии для всех выбранных операций..."
              rows={2}
              disabled={selectedOperations.length === 0}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedOperations.length === 0 || maxQuantity <= 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && <CheckCircle className="mr-2 h-4 w-4" />}
              Зарегистрировать ({selectedOperations.length})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
