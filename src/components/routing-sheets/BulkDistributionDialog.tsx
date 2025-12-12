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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Factory, Settings, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { DistributionStrategy } from "@/hooks/useSmartDistribution";
import { useDistributionSettings } from "@/hooks/useDistributionSettings";

interface RoutingSheetForBulk {
  id: string;
  code: string;
  name: string;
  productName?: string;
  unlinkedCount: number;
  productionOpsCount: number;
}

interface BulkDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSheets: RoutingSheetForBulk[];
  onDistribute: (strategy: DistributionStrategy) => Promise<{ success: number; failed: number }>;
  isLoading?: boolean;
}

export function BulkDistributionDialog({
  open,
  onOpenChange,
  selectedSheets,
  onDistribute,
  isLoading,
}: BulkDistributionDialogProps) {
  const { defaultStrategy } = useDistributionSettings();
  const [strategy, setStrategy] = useState<DistributionStrategy>(defaultStrategy);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const eligibleSheets = selectedSheets.filter(
    (s) => s.unlinkedCount > 0 && s.productionOpsCount > 0
  );

  const handleDistribute = async () => {
    const res = await onDistribute(strategy);
    setResult(res);
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  const totalComponents = eligibleSheets.reduce((sum, s) => sum + s.unlinkedCount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Массовое распределение компонентов
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Распределение завершено</p>
                <p className="text-sm text-muted-foreground">
                  Успешно: {result.success} техмаршрутов
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
                    (подходящих для распределения: {eligibleSheets.length})
                  </span>
                )}
              </div>

              {eligibleSheets.length === 0 ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Нет техмаршрутов с непривязанными компонентами и производственными операциями
                  </span>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[150px] border rounded-lg p-2">
                    <div className="space-y-1">
                      {eligibleSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                        >
                          <span className="font-medium">{sheet.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {sheet.unlinkedCount} комп.
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Стратегия распределения</Label>
                    <RadioGroup
                      value={strategy}
                      onValueChange={(v) => setStrategy(v as DistributionStrategy)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value="smart" id="bulk-smart" />
                        <Label htmlFor="bulk-smart" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span>По типу продукта</span>
                            {defaultStrategy === "smart" && (
                              <Badge variant="secondary" className="text-xs">по умолчанию</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Материалы → первая, ПФ/СБ → последняя операция
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value="all_operations" id="bulk-all" />
                        <Label htmlFor="bulk-all" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-blue-500" />
                            <span>На все операции</span>
                            {defaultStrategy === "all_operations" && (
                              <Badge variant="secondary" className="text-xs">по умолчанию</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Каждый компонент → все производственные операции
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value="even" id="bulk-even" />
                        <Label htmlFor="bulk-even" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-green-500" />
                            <span>Равномерное распределение</span>
                            {defaultStrategy === "even" && (
                              <Badge variant="secondary" className="text-xs">по умолчанию</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Компоненты распределяются поровну между операциями
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="text-sm p-3 border rounded-lg bg-muted/50">
                    Будет распределено: <span className="font-medium">{totalComponents}</span> компонентов
                    на <span className="font-medium">{eligibleSheets.length}</span> техмаршрутов
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                onClick={handleDistribute}
                disabled={isLoading || eligibleSheets.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Распределение...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Распределить
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
