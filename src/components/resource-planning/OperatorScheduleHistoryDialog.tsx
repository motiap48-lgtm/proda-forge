import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, RotateCcw, User, ArrowRight } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useOperatorScheduleHistory } from "@/hooks/useOperatorScheduleHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface OperatorScheduleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: {
    id: string;
    name: string;
    work_schedule?: { name: string } | null;
  } | null;
}

export function OperatorScheduleHistoryDialog({
  open,
  onOpenChange,
  operator,
}: OperatorScheduleHistoryDialogProps) {
  const { data: history, isLoading } = useOperatorScheduleHistory(
    operator?.id ?? null
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd.MM.yyyy", { locale: ru });
    } catch {
      return dateStr;
    }
  };

  const calculateDaysWorked = (from: string, to: string | null) => {
    try {
      const fromDate = parseISO(from);
      const toDate = to ? parseISO(to) : new Date();
      return differenceInDays(toDate, fromDate) + 1;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            История изменений графика
            {operator && (
              <span className="text-muted-foreground font-normal">
                — {operator.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>История изменений графика отсутствует</p>
              <p className="text-sm mt-1">
                Изменения будут записываться автоматически при смене графика
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Current schedule info */}
              {operator?.work_schedule && (
                <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      Текущий
                    </Badge>
                    <span className="font-medium">
                      {operator.work_schedule.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Действует с момента последнего изменения
                  </p>
                </div>
              )}

              {/* History timeline */}
              <div className="relative">
                {history.map((record, index) => {
                  const daysWorked = calculateDaysWorked(
                    record.effective_from,
                    record.effective_to
                  );

                  return (
                    <div key={record.id} className="relative pl-6 pb-4">
                      {/* Timeline connector */}
                      {index < history.length - 1 && (
                        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
                      )}

                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                      </div>

                      <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Schedule name */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className="font-medium">
                              {record.work_schedule_name || "Без графика"}
                            </p>
                            {record.assigned_shift_name && (
                              <p className="text-sm text-muted-foreground">
                                Смена: {record.assigned_shift_name}
                              </p>
                            )}
                          </div>
                          {record.shift_rotation_enabled && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Ротация
                            </Badge>
                          )}
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>{formatDate(record.effective_from)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{formatDate(record.effective_to)}</span>
                          {daysWorked && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              {daysWorked} дн.
                            </Badge>
                          )}
                        </div>

                        {/* Additional info */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {record.assigned_shift_number && (
                            <Badge variant="outline">
                              Смена #{record.assigned_shift_number}
                            </Badge>
                          )}
                          {record.shift_rotation_start_date && (
                            <Badge variant="outline">
                              Начало цикла: {formatDate(record.shift_rotation_start_date)}
                            </Badge>
                          )}
                        </div>

                        {/* Change reason */}
                        {record.change_reason && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            "{record.change_reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
