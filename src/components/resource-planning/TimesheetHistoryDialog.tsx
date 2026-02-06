import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, ArrowRight, Plus, Pencil, Trash } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useTimesheetHistory,
  useClearTimesheetHistory,
  ACTION_TYPE_LABELS,
  TIMESHEET_STATUS_LABELS,
  TimesheetHistoryRecord,
} from "@/hooks/useTimesheetHistory";

interface TimesheetHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string | null;
  operatorName: string;
  startDate?: Date;
  endDate?: Date;
}

const formatMinutes = (m: number | null) => {
  if (m === null) return "—";
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${h}ч ${mins}м` : `${h}ч`;
};

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case "created":
      return <Plus className="h-4 w-4 text-primary" />;
    case "updated":
      return <Pencil className="h-4 w-4 text-primary" />;
    case "deleted":
      return <Trash className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

export const TimesheetHistoryDialog: React.FC<TimesheetHistoryDialogProps> = ({
  open,
  onOpenChange,
  operatorId,
  operatorName,
  startDate,
  endDate,
}) => {
  const { data: history, isLoading } = useTimesheetHistory(operatorId, startDate, endDate);
  const clearHistory = useClearTimesheetHistory();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleClearHistory = () => {
    if (operatorId) {
      clearHistory.mutate(operatorId, {
        onSuccess: () => setConfirmClearOpen(false),
      });
    }
  };

  const renderChange = (record: TimesheetHistoryRecord) => {
    const changes: React.ReactNode[] = [];

    // Actual minutes change
    if (record.old_actual_minutes !== record.new_actual_minutes) {
      changes.push(
        <div key="actual" className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Факт:</span>
          <span className="line-through text-muted-foreground">
            {formatMinutes(record.old_actual_minutes)}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium">{formatMinutes(record.new_actual_minutes)}</span>
        </div>
      );
    }

    // Status change
    if (record.old_status !== record.new_status && record.new_status) {
      const oldLabel = record.old_status ? TIMESHEET_STATUS_LABELS[record.old_status]?.label : null;
      const newLabel = TIMESHEET_STATUS_LABELS[record.new_status]?.label || record.new_status;
      changes.push(
        <div key="status" className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Статус:</span>
          {oldLabel && (
            <>
              <span className="text-muted-foreground">{oldLabel}</span>
              <ArrowRight className="h-3 w-3" />
            </>
          )}
          <span className={cn("font-medium", TIMESHEET_STATUS_LABELS[record.new_status]?.color)}>
            {newLabel}
          </span>
        </div>
      );
    }

    // Notes change
    if (record.old_notes !== record.new_notes) {
      changes.push(
        <div key="notes" className="text-xs text-muted-foreground">
          <span>Примечание: </span>
          {record.new_notes ? (
            <span className="italic">"{record.new_notes}"</span>
          ) : (
            <span className="text-muted-foreground/50">(удалено)</span>
          )}
        </div>
      );
    }

    // For created/deleted, show all values
    if (record.action_type === "created" && changes.length === 0) {
      changes.push(
        <div key="created" className="text-xs">
          Факт: <span className="font-medium">{formatMinutes(record.new_actual_minutes)}</span>
        </div>
      );
    }

    if (record.action_type === "deleted" && changes.length === 0) {
      changes.push(
        <div key="deleted" className="text-xs text-muted-foreground">
          Было: {formatMinutes(record.old_actual_minutes)}
        </div>
      );
    }

    return changes.length > 0 ? changes : <span className="text-xs text-muted-foreground">Без изменений</span>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              История табеля: {operatorName}
            </DialogTitle>
            {history && history.length > 0 && (
              <div className="flex items-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setConfirmClearOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Очистить историю
                </Button>
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>История изменений пуста</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">{getActionIcon(record.action_type)}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs text-white",
                            ACTION_TYPE_LABELS[record.action_type]?.color
                          )}
                        >
                          {ACTION_TYPE_LABELS[record.action_type]?.label || record.action_type}
                        </Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(record.work_date), "d MMMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="space-y-0.5">{renderChange(record)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить историю табеля?</AlertDialogTitle>
            <AlertDialogDescription>
              Вся история изменений табеля для «{operatorName}» будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistory.isPending ? "Удаление..." : "Очистить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
