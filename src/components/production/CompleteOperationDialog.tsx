import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";

interface CompleteOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number) => void;
  maxQuantity: number;
  operationName: string;
  isLoading?: boolean;
}

export const CompleteOperationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  maxQuantity,
  operationName,
  isLoading = false,
}: CompleteOperationDialogProps) => {
  const [quantity, setQuantity] = useState(maxQuantity.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(quantity);
    if (value > 0 && value <= maxQuantity) {
      onConfirm(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Завершить операцию</DialogTitle>
          <DialogDescription>
            Укажите количество выполненных единиц для операции: {operationName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Выполнено единиц *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Максимум: ${maxQuantity}`}
              required
            />
            <p className="text-sm text-muted-foreground">
              Максимальное количество: {maxQuantity}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && <CheckCircle className="mr-2 h-4 w-4" />}
              Завершить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
