import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Archive, UserCheck, History, X, Calendar, Briefcase, Pencil, Trash2, Clock } from "lucide-react";
import { 
  useArchivedOperators, 
  useEmploymentHistory, 
  useReinstateOperator,
  useDeleteEmploymentHistory,
  useBulkDeleteEmploymentHistory,
  type EmploymentHistoryRecord 
} from "@/hooks/useEmploymentHistory";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getTimeAgo } from "@/utils/timeAgoUtils";
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
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
 } from "@/components/ui/tooltip";
import { EmploymentHistoryDialog } from "./EmploymentHistoryDialog";
 
export const ArchivedOperatorsTab = () => {
  const { data: operators, isLoading } = useArchivedOperators();
  const reinstateOperator = useReinstateOperator();
  const deleteHistory = useDeleteEmploymentHistory();
  const bulkDeleteHistory = useBulkDeleteEmploymentHistory();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [operatorToReinstate, setOperatorToReinstate] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<EmploymentHistoryRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<EmploymentHistoryRecord | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [, setTick] = useState(0);

  const { data: employmentHistory } = useEmploymentHistory(selectedOperatorId);

  // Update time ago every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the reinstatement date for a termination event (to stop the counter)
  const getTerminationEndDate = (terminationRecord: EmploymentHistoryRecord): string | null => {
    if (!employmentHistory) return null;
    
    // Sort history by event_date ascending to find next event
    const sortedHistory = [...employmentHistory].sort(
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

  const filteredOperators = useMemo(() => {
    return operators?.filter((op: any) => {
      const matchesSearch = op.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.position?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];
  }, [operators, searchQuery]);
 
   const handleReinstate = (operator: any) => {
     setOperatorToReinstate(operator);
     setReinstateDialogOpen(true);
   };
 
   const confirmReinstate = () => {
     if (operatorToReinstate) {
       reinstateOperator.mutate(
         { operatorId: operatorToReinstate.id },
         {
           onSuccess: () => {
             setReinstateDialogOpen(false);
             setOperatorToReinstate(null);
           },
         }
       );
     }
   };
 
   const handleShowHistory = (operatorId: string) => {
     setSelectedOperatorId(operatorId);
     setHistoryDialogOpen(true);
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
    if (!employmentHistory) return;
    if (selectedHistoryIds.size === employmentHistory.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(employmentHistory.map((e: any) => e.id)));
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

   const getEventTypeLabel = (type: string) => {
     switch (type) {
       case "hired": return "Приём на работу";
       case "terminated": return "Увольнение";
       case "reinstated": return "Восстановление";
       default: return type;
     }
   };
 
   const getEventTypeBadge = (type: string) => {
     switch (type) {
       case "hired": return <Badge variant="default" className="bg-green-500">Приём</Badge>;
       case "terminated": return <Badge variant="destructive">Увольнение</Badge>;
       case "reinstated": return <Badge variant="secondary" className="bg-blue-500 text-white">Восстановление</Badge>;
       default: return <Badge variant="outline">{type}</Badge>;
     }
   };
 
   if (isLoading) {
     return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
   }
 
   return (
     <div className="space-y-4">
       <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Поиск в архиве..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="pl-10 pr-8 h-8 sm:h-9 text-sm"
           />
           {searchQuery && (
             <Button
               variant="ghost"
               size="icon"
               className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
               onClick={() => setSearchQuery("")}
             >
               <X className="h-4 w-4" />
             </Button>
           )}
         </div>
       </div>
 
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
         <Archive className="h-4 w-4" />
         <span>В архиве: <span className="font-medium text-foreground">{filteredOperators.length}</span></span>
       </div>
 
       {filteredOperators.length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center text-muted-foreground">
             <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" />
             <p>Архив пуст</p>
             <p className="text-sm">Уволенные сотрудники будут отображаться здесь</p>
           </CardContent>
         </Card>
       ) : (
         <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
           {filteredOperators.map((operator: any) => (
             <Card key={operator.id} className="opacity-75 hover:opacity-100 transition-opacity">
               <CardHeader className="pb-2">
                 <CardTitle className="text-base flex items-center justify-between">
                   <span className="truncate">{operator.full_name}</span>
                   <Badge variant="outline" className="text-xs shrink-0">{operator.code}</Badge>
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <div className="text-sm text-muted-foreground space-y-1">
                   {operator.position && (
                     <div className="flex items-center gap-2">
                       <Briefcase className="h-3.5 w-3.5" />
                       <span>{operator.position}</span>
                     </div>
                   )}
                    {operator.termination_date && (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Уволен: {format(new Date(operator.termination_date), "d MMMM yyyy", { locale: ru })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3" />
                          <span className="text-muted-foreground/80" title={getTimeAgo(operator.updated_at).formatted}>
                            {getTimeAgo(operator.updated_at).shortFormatted}
                          </span>
                        </div>
                      </>
                    )}
                    {operator.termination_reason && (
                      <div className="text-xs bg-muted/50 p-2 rounded mt-2">
                        {operator.termination_reason}
                      </div>
                    )}
                 </div>
                 
                 <div className="flex gap-2">
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1"
                         onClick={() => handleShowHistory(operator.id)}
                       >
                         <History className="h-4 w-4 mr-1" />
                         История
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>История занятости</TooltipContent>
                   </Tooltip>
                   
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button
                         variant="default"
                         size="sm"
                         className="flex-1"
                         onClick={() => handleReinstate(operator)}
                       >
                         <UserCheck className="h-4 w-4 mr-1" />
                         Восстановить
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Восстановить сотрудника</TooltipContent>
                   </Tooltip>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       {/* Reinstate confirmation dialog */}
       <AlertDialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Восстановить сотрудника?</AlertDialogTitle>
             <AlertDialogDescription>
               <strong>{operatorToReinstate?.full_name}</strong> будет восстановлен как активный сотрудник. 
               Информация об увольнении сохранится в истории.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Отмена</AlertDialogCancel>
             <AlertDialogAction onClick={confirmReinstate}>
               Восстановить
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Employment history dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
           <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История занятости
              </DialogTitle>
            </DialogHeader>
            
             <div className="flex-1 min-h-0 flex flex-col space-y-3">
              {employmentHistory?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">История пуста</p>
              ) : (
                 <>
                   <div className="flex items-center justify-between border-b pb-2 flex-shrink-0">
                     <div className="flex items-center gap-2">
                       <Checkbox
                         checked={employmentHistory && selectedHistoryIds.size === employmentHistory.length && employmentHistory.length > 0}
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
                   <ScrollArea className="h-[50vh]">
                     <div className="space-y-3 pr-4">
                      {employmentHistory?.map((event: any) => (
                        <div key={event.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedHistoryIds.has(event.id)}
                              onCheckedChange={() => toggleSelectHistory(event.id)}
                            />
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                {getEventTypeBadge(event.event_type)}
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(event.event_date), "d MMMM yyyy", { locale: ru })}
                                </span>
                              </div>
                              {event.event_type === "terminated" && (() => {
                                const endDate = getTerminationEndDate(event);
                                const timeAgo = getTimeAgo(event.created_at, endDate);
                                const isOngoing = !endDate;
                                return (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                                    <Clock className="h-3 w-3" />
                                    <span title={timeAgo.formatted}>
                                      {timeAgo.shortFormatted}
                                      {!isOngoing && <span className="text-muted-foreground/60 ml-1">(до восстановления)</span>}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditRecord(event)}
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
                                    onClick={() => handleDeleteRecord(event)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Удалить</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          {event.reason && (
                            <p className="text-sm ml-6">{event.reason}</p>
                          )}
                          {event.notes && (
                            <p className="text-xs text-muted-foreground ml-6">{event.notes}</p>
                          )}
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
     </div>
   );
 };