import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Factory, ArrowRight, Package, Eye, Check, X } from "lucide-react";

interface DistributionPreview {
  operationSequence: number;
  operationName: string;
  materials: {
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
  }[];
}

interface DistributionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: DistributionPreview[];
  strategyName: string;
  onConfirm: () => void;
}

export function DistributionPreviewDialog({
  open,
  onOpenChange,
  preview,
  strategyName,
  onConfirm,
}: DistributionPreviewDialogProps) {
  const totalMaterials = preview.reduce((sum, p) => sum + p.materials.length, 0);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Предпросмотр распределения
          </DialogTitle>
          <DialogDescription>
            Стратегия: <span className="font-medium">{strategyName}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {preview.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет компонентов для распределения
              </div>
            ) : (
              preview.map((item) => (
                <div 
                  key={item.operationSequence}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {item.operationSequence}
                    </Badge>
                    <Factory className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.operationName || "Без названия"}</span>
                    <Badge variant="outline" className="ml-auto">
                      {item.materials.length} компонент{item.materials.length === 1 ? '' : item.materials.length < 5 ? 'а' : 'ов'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 pl-4">
                    {item.materials.map((mat) => (
                      <div 
                        key={mat.productId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground">
                          {mat.productCode}
                        </span>
                        <span className="flex-1 truncate">{mat.productName}</span>
                        <span className="text-muted-foreground">
                          ×{mat.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-sm text-muted-foreground mr-auto">
            Всего будет распределено: <span className="font-medium">{totalMaterials}</span> компонент{totalMaterials === 1 ? '' : totalMaterials < 5 ? 'а' : 'ов'}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={totalMaterials === 0}>
            <Check className="h-4 w-4 mr-2" />
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
