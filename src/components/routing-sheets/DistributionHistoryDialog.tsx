import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Package, Settings, History } from "lucide-react";
import { useDistributionHistory, STRATEGY_LABELS } from "@/hooks/useDistributionHistory";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface DistributionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routingSheetId?: string;
  routingSheetName?: string;
}

export function DistributionHistoryDialog({
  open,
  onOpenChange,
  routingSheetId,
  routingSheetName,
}: DistributionHistoryDialogProps) {
  const { history, isLoading } = useDistributionHistory(routingSheetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История распределений
            {routingSheetName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {routingSheetName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1">
                      <Settings className="h-3 w-3" />
                      {STRATEGY_LABELS[record.strategy] || record.strategy}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(record.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Компонентов:</span>
                      <span className="font-medium">{record.components_distributed}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Операций:</span>
                      <span className="font-medium">{record.operations_affected}</span>
                    </span>
                  </div>
                  {record.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      {record.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              История распределений пуста
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
