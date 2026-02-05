 import { format } from "date-fns";
 import { ru } from "date-fns/locale";
 import { Briefcase, UserCheck, UserX, Calendar, FileText } from "lucide-react";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { useEmploymentHistory } from "@/hooks/useEmploymentHistory";
 
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
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
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
 
         <ScrollArea className="max-h-[400px] pr-4">
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
             <div className="space-y-3">
               {history.map((record: any) => (
                 <div
                   key={record.id}
                   className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                 >
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
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 };