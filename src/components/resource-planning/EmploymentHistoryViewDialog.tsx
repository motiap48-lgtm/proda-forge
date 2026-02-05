import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Briefcase, UserCheck, UserX, Calendar, FileText, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { EmploymentHistoryDialog } from "./EmploymentHistoryDialog";

interface EmploymentHistoryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: { id: string; full_name: string; code: string } | null;
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
  const deleteHistory = useDeleteEmploymentHistory();
  const bulkDeleteHistory = useBulkDeleteEmploymentHistory();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<EmploymentHistoryRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<EmploymentHistoryRecord | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

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
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
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

          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка...
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>История занятости пуста</p>
              </div>
            ) : (
              <>
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
                <ScrollArea className="flex-1 max-h-[50vh] pr-4">
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
                </ScrollArea>
              </>
            )}
          </div>
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
