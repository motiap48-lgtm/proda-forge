import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface RoutingSheetForClear {
  id: string;
  code: string;
  name: string;
  linkedCount: number;
  productionOpsCount: number;
}

interface BulkClearDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSheets: RoutingSheetForClear[];
  onClear: () => Promise<{ success: number; failed: number }>;
  isLoading?: boolean;
}

export function BulkClearDistributionDialog({
  open,
  onOpenChange,
  selectedSheets,
  onClear,
  isLoading,
}: BulkClearDistributionDialogProps) {
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  // Filter sheets that have linked components
  const eligibleSheets = selectedSheets.filter((s) => s.linkedCount > 0);

  const handleClear = async () => {
    const res = await onClear();
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  const totalComponents = eligibleSheets.reduce((sum, s) => sum + s.linkedCount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Массовая отмена распределений
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Отмена завершена</p>
                <p className="text-sm text-muted-foreground">
                  Очищено: {result.success} техмаршрутов
                  {result.failed > 0 && (
                    <span className="text-destructive ml-2">
                      Ошибок: {result.failed}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Закрыть</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Выбрано техмаршрутов: <span className="font-medium text-foreground">{selectedSheets.length}</span>
                {eligibleSheets.length < selectedSheets.length && (
                  <span className="ml-2">
                    (с привязанными компонентами: {eligibleSheets.length})
                  </span>
                )}
              </div>

              {eligibleSheets.length === 0 ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Нет техмаршрутов с привязанными компонентами
                  </span>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[150px] border rounded-lg">
                    <div className="space-y-1 p-2">
                      {eligibleSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                        >
                          <span className="font-medium">{sheet.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {sheet.linkedCount} комп.
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex items-start gap-2 p-3 border rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Внимание!</p>
                      <p>Все привязки компонентов к операциям будут удалены. Это действие нельзя отменить.</p>
                    </div>
                  </div>

                  <div className="text-sm p-3 border rounded-lg bg-muted/50">
                    Будет удалено: <span className="font-medium">{totalComponents}</span> привязок
                    из <span className="font-medium">{eligibleSheets.length}</span> техмаршрутов
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={isLoading || eligibleSheets.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить привязки
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
