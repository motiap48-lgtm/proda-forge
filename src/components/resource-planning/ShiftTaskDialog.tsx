import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveOperators, useActiveBrigades } from "@/hooks/useResourcePlanning";
import { useProductionOrderOperations } from "@/hooks/useShiftTasks";
import { useCreateOperatorAssignment, useCreateBrigadeAssignment } from "@/hooks/useShiftTasks";

interface ShiftTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

export const ShiftTaskDialog = ({ open, onOpenChange, selectedDate }: ShiftTaskDialogProps) => {
  const [assignmentType, setAssignmentType] = useState<"operator" | "brigade">("operator");
  const [date, setDate] = useState<Date>(selectedDate);
  const [shiftNumber, setShiftNumber] = useState("1");
  const [operatorId, setOperatorId] = useState("");
  const [brigadeId, setBrigadeId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: operators = [] } = useActiveOperators();
  const { data: brigades = [] } = useActiveBrigades();
  const { data: operations = [] } = useProductionOrderOperations();
  
  const createOperatorAssignment = useCreateOperatorAssignment();
  const createBrigadeAssignment = useCreateBrigadeAssignment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseData = {
      assignment_date: format(date, "yyyy-MM-dd"),
      shift_number: parseInt(shiftNumber),
      production_order_operation_id: operationId,
      notes: notes || null,
    };

    try {
      if (assignmentType === "operator") {
        await createOperatorAssignment.mutateAsync({
          ...baseData,
          operator_id: operatorId,
        });
      } else {
        await createBrigadeAssignment.mutateAsync({
          ...baseData,
          brigade_id: brigadeId,
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setAssignmentType("operator");
    setShiftNumber("1");
    setOperatorId("");
    setBrigadeId("");
    setOperationId("");
    setNotes("");
  };

  const isValid = operationId && (
    (assignmentType === "operator" && operatorId) ||
    (assignmentType === "brigade" && brigadeId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать назначение на смену</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment type */}
          <div className="space-y-2">
            <Label>Тип назначения</Label>
            <RadioGroup
              value={assignmentType}
              onValueChange={(v) => setAssignmentType(v as "operator" | "brigade")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="operator" id="operator" />
                <Label htmlFor="operator" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Оператор
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="brigade" id="brigade" />
                <Label htmlFor="brigade" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Бригада
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date selection */}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Shift selection */}
          <div className="space-y-2">
            <Label>Смена</Label>
            <Select value={shiftNumber} onValueChange={setShiftNumber}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Смена 1 (дневная)</SelectItem>
                <SelectItem value="2">Смена 2 (ночная)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operator/Brigade selection */}
          {assignmentType === "operator" ? (
            <div className="space-y-2">
              <Label>Оператор</Label>
              <Select value={operatorId} onValueChange={setOperatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите оператора" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.full_name} ({op.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Бригада</Label>
              <Select value={brigadeId} onValueChange={setBrigadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите бригаду" />
                </SelectTrigger>
                <SelectContent>
                  {brigades.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Operation selection */}
          <div className="space-y-2">
            <Label>Операция</Label>
            <Select value={operationId} onValueChange={setOperationId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите операцию" />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {(op as any).production_orders?.order_number} - {(op as any).routing_operations?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || createOperatorAssignment.isPending || createBrigadeAssignment.isPending}
            >
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
