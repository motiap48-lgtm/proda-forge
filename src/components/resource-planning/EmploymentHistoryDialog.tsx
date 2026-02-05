 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { useUpdateEmploymentHistory, type EmploymentHistoryRecord } from "@/hooks/useEmploymentHistory";
 
 interface EmploymentHistoryDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   record: EmploymentHistoryRecord | null;
 }
 
 export const EmploymentHistoryDialog = ({
   open,
   onOpenChange,
   record,
 }: EmploymentHistoryDialogProps) => {
   const updateHistory = useUpdateEmploymentHistory();
   
   const [eventType, setEventType] = useState("hired");
   const [eventDate, setEventDate] = useState("");
   const [reason, setReason] = useState("");
   const [notes, setNotes] = useState("");
 
   useEffect(() => {
     if (record) {
       setEventType(record.event_type);
       setEventDate(record.event_date);
       setReason(record.reason || "");
       setNotes(record.notes || "");
     }
   }, [record]);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!record) return;
 
     updateHistory.mutate(
       {
         id: record.id,
         event_type: eventType,
         event_date: eventDate,
         reason: reason || undefined,
         notes: notes || undefined,
       },
       {
         onSuccess: () => onOpenChange(false),
       }
     );
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Редактировать запись истории</DialogTitle>
         </DialogHeader>
         
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label>Тип события</Label>
             <Select value={eventType} onValueChange={setEventType}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="hired">Приём на работу</SelectItem>
                 <SelectItem value="terminated">Увольнение</SelectItem>
                 <SelectItem value="reinstated">Восстановление</SelectItem>
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label>Дата события</Label>
             <Input
               type="date"
               value={eventDate}
               onChange={(e) => setEventDate(e.target.value)}
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label>Причина</Label>
             <Input
               value={reason}
               onChange={(e) => setReason(e.target.value)}
               placeholder="Причина события"
             />
           </div>
 
           <div className="space-y-2">
             <Label>Примечания</Label>
             <Textarea
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               placeholder="Дополнительные примечания"
               rows={3}
             />
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Отмена
             </Button>
             <Button type="submit" disabled={updateHistory.isPending}>
               Сохранить
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };