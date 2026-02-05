 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { AlertTriangle, UserX } from "lucide-react";
 import { Alert, AlertDescription } from "@/components/ui/alert";
 import { format } from "date-fns";
 import { useTerminateOperator } from "@/hooks/useEmploymentHistory";
 
 interface TerminateOperatorDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   operator: any;
 }
 
 const TERMINATION_REASONS = [
   { value: "resignation", label: "По собственному желанию" },
   { value: "mutual_agreement", label: "По соглашению сторон" },
   { value: "employer_initiative", label: "По инициативе работодателя" },
   { value: "contract_end", label: "Истечение срока договора" },
   { value: "probation_failed", label: "Не прошёл испытательный срок" },
   { value: "reduction", label: "Сокращение штата" },
   { value: "other", label: "Другое" },
 ];
 
 export const TerminateOperatorDialog = ({
   open,
   onOpenChange,
   operator,
 }: TerminateOperatorDialogProps) => {
   const terminateOperator = useTerminateOperator();
   
   const [formData, setFormData] = useState({
     termination_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
     notes: "",
   });

  const [reasonError, setReasonError] = useState(false);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     
    // Validate reason is selected
    if (!formData.reason) {
      setReasonError(true);
      return;
    }
    
     const reasonLabel = TERMINATION_REASONS.find(r => r.value === formData.reason)?.label || formData.reason;
     
     terminateOperator.mutate(
       {
         operatorId: operator.id,
         terminationDate: formData.termination_date,
         reason: reasonLabel,
         notes: formData.notes || undefined,
       },
       {
         onSuccess: () => {
           onOpenChange(false);
         },
       }
     );
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2 text-destructive">
             <UserX className="h-5 w-5" />
             Увольнение сотрудника
           </DialogTitle>
           <DialogDescription>
             Сотрудник будет переведён в архив, где сохранится вся история его работы.
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <Alert variant="default" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
             <AlertTriangle className="h-4 w-4 text-amber-600" />
             <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
               <strong>{operator?.full_name}</strong> ({operator?.code}) будет уволен. 
               В графике смен с даты увольнения до конца месяца будет отображаться иконка увольнения.
             </AlertDescription>
           </Alert>
 
           <div className="space-y-2">
             <Label htmlFor="termination_date">Дата увольнения *</Label>
             <Input
               id="termination_date"
               type="date"
               value={formData.termination_date}
               onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="reason">Причина увольнения *</Label>
             <Select
               value={formData.reason}
              onValueChange={(value) => {
                setFormData({ ...formData, reason: value });
                setReasonError(false);
              }}
             >
              <SelectTrigger className={reasonError ? "border-destructive" : ""}>
                <SelectValue placeholder="Выберите причину..." />
               </SelectTrigger>
               <SelectContent>
                 {TERMINATION_REASONS.map((reason) => (
                   <SelectItem key={reason.value} value={reason.value}>
                     {reason.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
            {reasonError && (
              <p className="text-sm text-destructive">Укажите причину увольнения</p>
            )}
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="notes">Примечание</Label>
             <Textarea
               id="notes"
               value={formData.notes}
               onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
               placeholder="Дополнительная информация..."
               rows={3}
             />
           </div>
 
           <DialogFooter>
             <Button
               type="button"
               variant="outline"
               onClick={() => onOpenChange(false)}
             >
               Отмена
             </Button>
             <Button
               type="submit"
               variant="destructive"
               disabled={terminateOperator.isPending}
             >
               {terminateOperator.isPending ? "Увольнение..." : "Уволить"}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };