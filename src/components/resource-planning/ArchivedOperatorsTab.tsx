 import { useState, useMemo } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Search, Archive, UserCheck, History, X, Calendar, Briefcase } from "lucide-react";
 import { useArchivedOperators, useEmploymentHistory, useReinstateOperator } from "@/hooks/useEmploymentHistory";
 import { format } from "date-fns";
 import { ru } from "date-fns/locale";
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
 
 export const ArchivedOperatorsTab = () => {
   const { data: operators, isLoading } = useArchivedOperators();
   const reinstateOperator = useReinstateOperator();
   
   const [searchQuery, setSearchQuery] = useState("");
   const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
   const [operatorToReinstate, setOperatorToReinstate] = useState<any>(null);
   const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
   const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
 
   const { data: employmentHistory } = useEmploymentHistory(selectedOperatorId);
 
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
                     <div className="flex items-center gap-2">
                       <Calendar className="h-3.5 w-3.5" />
                       <span>Уволен: {format(new Date(operator.termination_date), "d MMMM yyyy", { locale: ru })}</span>
                     </div>
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
         <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <History className="h-5 w-5" />
               История занятости
             </DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             {employmentHistory?.length === 0 ? (
               <p className="text-center text-muted-foreground py-4">История пуста</p>
             ) : (
               <div className="space-y-3">
                 {employmentHistory?.map((event: any) => (
                   <div key={event.id} className="border rounded-lg p-3 space-y-2">
                     <div className="flex items-center justify-between">
                       {getEventTypeBadge(event.event_type)}
                       <span className="text-sm text-muted-foreground">
                         {format(new Date(event.event_date), "d MMMM yyyy", { locale: ru })}
                       </span>
                     </div>
                     {event.reason && (
                       <p className="text-sm">{event.reason}</p>
                     )}
                     {event.notes && (
                       <p className="text-xs text-muted-foreground">{event.notes}</p>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 };