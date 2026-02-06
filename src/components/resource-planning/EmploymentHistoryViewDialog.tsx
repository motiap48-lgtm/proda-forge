import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Briefcase, UserCheck, UserX, Calendar, FileText, Pencil, Trash2, Clock, Timer, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  useEmploymentHistory, 
  useDeleteEmploymentHistory, 
  useBulkDeleteEmploymentHistory,
  type EmploymentHistoryRecord 
} from "@/hooks/useEmploymentHistory";
import { useOperatorAbsences } from "@/hooks/useOperatorAbsences";
import { EmploymentHistoryDialog } from "./EmploymentHistoryDialog";
import { getTimeAgo } from "@/utils/timeAgoUtils";
import { calculateEmploymentSummary, formatDuration, formatShortDuration } from "@/utils/employmentDurationUtils";

interface EmploymentHistoryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: { id: string; full_name: string; code: string; hire_date?: string | null } | null;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "hired":
      return <Briefcase className="h-4 w-4 text-green-600" />;
    case "terminated":
      return <UserX className="h-4 w-4 text-destructive" />;
    case "reinstated":
      return <UserCheck className="h-4 w-4 text-blue-600" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const getEventLabel = (eventType: string) => {
  switch (eventType) {
    case "hired":
      return "Приём на работу";
    case "terminated":
      return "Увольнение";
    case "reinstated":
      return "Восстановление";
    default:
      return eventType;
  }
};

const getEventVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (eventType) {
    case "hired":
      return "default";
    case "terminated":
      return "destructive";
    case "reinstated":
      return "secondary";
    default:
      return "outline";
  }
};

export const EmploymentHistoryViewDialog = ({
  open,
  onOpenChange,
  operator,
}: EmploymentHistoryViewDialogProps) => {
  const { data: history, isLoading } = useEmploymentHistory(operator?.id || null);
  const { data: absences } = useOperatorAbsences(operator?.id);
  const deleteHistory = useDeleteEmploymentHistory();
  const bulkDeleteHistory = useBulkDeleteEmploymentHistory();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<EmploymentHistoryRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<EmploymentHistoryRecord | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [, setTick] = useState(0);

  // Update time every second for live duration
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate employment summary
  const employmentSummary = useMemo(() => {
    if (!history || history.length === 0) return null;
    return calculateEmploymentSummary(
      history.map(h => ({
        event_type: h.event_type,
        event_date: h.event_date,
        created_at: h.created_at,
      })),
      absences?.map(a => ({
        start_date: a.start_date,
        end_date: a.end_date,
        status: a.status,
      })) || []
    );
  }, [history, absences, setTick]);

  // Find the reinstatement date for a termination event (to stop the counter)
  const getTerminationEndDate = (terminationRecord: EmploymentHistoryRecord): string | null => {
    if (!history) return null;
    
    // Sort history by event_date ascending to find next event
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    
    const terminationIndex = sortedHistory.findIndex(r => r.id === terminationRecord.id);
    if (terminationIndex === -1) return null;
    
    // Look for the next reinstated event after this termination
    for (let i = terminationIndex + 1; i < sortedHistory.length; i++) {
      if (sortedHistory[i].event_type === "reinstated") {
        return sortedHistory[i].created_at;
      }
    }
    
    // No reinstatement found - still terminated (counter continues)
    return null;
  };

  const handleEditRecord = (record: EmploymentHistoryRecord) => {
    setRecordToEdit(record);
    setEditDialogOpen(true);
  };

  const handleDeleteRecord = (record: EmploymentHistoryRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRecord = () => {
    if (recordToDelete) {
      deleteHistory.mutate(recordToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setRecordToDelete(null);
        },
      });
    }
  };

  const toggleSelectHistory = (id: string) => {
    const newSelected = new Set(selectedHistoryIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHistoryIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (!history) return;
    if (selectedHistoryIds.size === history.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(history.map((e: any) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedHistoryIds.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteHistory.mutate(Array.from(selectedHistoryIds), {
      onSuccess: () => {
        setBulkDeleteDialogOpen(false);
        setSelectedHistoryIds(new Set());
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              История занятости
            </DialogTitle>
            {operator && (
              <p className="text-sm text-muted-foreground">
                {operator.full_name} ({operator.code})
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка...
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">История занятости пуста</p>
                {!operator?.hire_date && (
                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Укажите дату приёма в карточке сотрудника для учёта стажа
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Employment Duration Summary */}
                {employmentSummary && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" />
                        Стаж работы на предприятии
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-3">
                      {/* Total summary */}
                      <div className="flex items-center justify-between bg-background rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="font-medium">Общий стаж:</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {formatDuration(employmentSummary.totalDuration)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {employmentSummary.totalDuration.netDays} раб. дн.
                            {employmentSummary.totalAbsenceDays > 0 && (
                              <span className="ml-1">
                                (−{employmentSummary.totalAbsenceDays} дн. отсутствий)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Individual periods */}
                      {employmentSummary.periods.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Периоды работы ({employmentSummary.periods.length})
                          </div>
                          {employmentSummary.periods.map((period, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between rounded-lg p-2 text-sm border ${
                                period.isCurrent ? "bg-green-500/10 border-green-500/30" : "bg-background"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs">
                                  #{employmentSummary.periods.length - index}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span>{format(period.startDate, "dd.MM.yyyy")}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span>
                                      {period.endDate 
                                        ? format(period.endDate, "dd.MM.yyyy")
                                        : <Badge variant="outline" className="text-xs h-5 bg-green-500/20 border-green-500/50 text-green-600">по н.в.</Badge>
                                      }
                                    </span>
                                  </div>
                                  {period.duration.absenceDays > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Отсутствий: {period.duration.absenceDays} дн.
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`font-medium ${period.isCurrent ? "text-green-600" : ""}`}>
                                      {formatShortDuration(period.duration)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <div className="text-sm">
                                      <div>{formatDuration(period.duration)}</div>
                                      <div className="text-muted-foreground">
                                        Всего дней: {period.duration.totalDays}
                                      </div>
                                      <div className="text-muted-foreground">
                                        Рабочих дней: {period.duration.netDays}
                                      </div>
                                      {period.duration.absenceDays > 0 && (
                                        <div className="text-orange-400">
                                          Отсутствий: {period.duration.absenceDays} дн.
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <div className="text-xs text-muted-foreground">
                                  {period.duration.netDays} раб. дн.
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* History records section */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={history && selectedHistoryIds.size === history.length && history.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedHistoryIds.size > 0 ? `Выбрано: ${selectedHistoryIds.size}` : "Выбрать все"}
                      </span>
                    </div>
                    {selectedHistoryIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Удалить ({selectedHistoryIds.size})
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {history.map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Checkbox
                          checked={selectedHistoryIds.has(record.id)}
                          onCheckedChange={() => toggleSelectHistory(record.id)}
                          className="mt-0.5"
                        />
                        <div className="mt-0.5">
                          {getEventIcon(record.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getEventVariant(record.event_type)}>
                              {getEventLabel(record.event_type)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(record.event_date), "d MMMM yyyy", { locale: ru })}
                            </span>
                          </div>
                          {record.event_type === "terminated" && (() => {
                            const endDate = getTerminationEndDate(record);
                            const timeAgo = getTimeAgo(record.created_at, endDate);
                            const isOngoing = !endDate;
                            return (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/80 mt-1">
                                <Clock className="h-3 w-3" />
                                <span title={timeAgo.formatted}>
                                  {timeAgo.shortFormatted}
                                  {!isOngoing && <span className="text-muted-foreground/60 ml-1">(до восстановления)</span>}
                                </span>
                              </div>
                            );
                          })()}
                          {record.reason && (
                            <p className="text-sm mt-1">{record.reason}</p>
                          )}
                          {record.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {record.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditRecord(record)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Редактировать</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRecord(record)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Удалить</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit history record dialog */}
      <EmploymentHistoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={recordToEdit}
      />

      {/* Delete single record confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Эта запись истории занятости будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранные записи?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет удалено записей: <strong>{selectedHistoryIds.size}</strong>. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
