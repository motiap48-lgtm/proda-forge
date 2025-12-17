import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, Check, Copy } from "lucide-react";
import { useCreateOperator, useActiveWorkSchedules } from "@/hooks/useResourcePlanning";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BulkOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OperatorEntry {
  id: string;
  full_name: string;
  position: string;
  employee_type: string;
  default_work_center_id: string;
  work_schedule_id: string;
  phone: string;
  email: string;
  hire_date: string;
  notes: string;
}

const createEmptyOperator = (): OperatorEntry => ({
  id: crypto.randomUUID(),
  full_name: "",
  position: "",
  employee_type: "operator",
  default_work_center_id: "",
  work_schedule_id: "",
  phone: "",
  email: "",
  hire_date: "",
  notes: "",
});

export const BulkOperatorDialog = ({
  open,
  onOpenChange,
}: BulkOperatorDialogProps) => {
  const createOperator = useCreateOperator();
  const { data: workCenters } = useActiveWorkCenters();
  const { data: workSchedules } = useActiveWorkSchedules();
  
  const [operators, setOperators] = useState<OperatorEntry[]>([createEmptyOperator()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setOperators([createEmptyOperator()]);
    }
  }, [open]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (lastCardRef.current) {
        lastCardRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  const addOperator = () => {
    const lastOp = operators[operators.length - 1];
    const newOp: OperatorEntry = {
      id: crypto.randomUUID(),
      full_name: "",
      position: "",
      employee_type: lastOp.employee_type,
      default_work_center_id: lastOp.default_work_center_id,
      work_schedule_id: lastOp.work_schedule_id,
      phone: "",
      email: "",
      hire_date: lastOp.hire_date,
      notes: "",
    };
    setOperators([...operators, newOp]);
    scrollToBottom();
  };

  const removeOperator = (id: string) => {
    if (operators.length > 1) {
      setOperators(operators.filter((op) => op.id !== id));
    }
  };

  const updateOperator = (id: string, field: keyof OperatorEntry, value: string) => {
    setOperators(
      operators.map((op) => (op.id === id ? { ...op, [field]: value } : op))
    );
  };

  const copyToAll = (sourceId: string, field: "employee_type" | "default_work_center_id" | "work_schedule_id" | "hire_date") => {
    const sourceOp = operators.find(op => op.id === sourceId);
    if (!sourceOp) return;
    
    setOperators(operators.map(op => ({
      ...op,
      [field]: sourceOp[field]
    })));
    
    const fieldLabels: Record<string, string> = {
      employee_type: "Тип",
      default_work_center_id: "Участок",
      work_schedule_id: "График",
      hire_date: "Дата приёма"
    };
    toast.success(`${fieldLabels[field]} скопирован на все строки`);
  };

  const handleSubmit = async () => {
    const validOperators = operators.filter((op) => op.full_name.trim());
    
    if (validOperators.length === 0) {
      toast.error("Добавьте хотя бы одного оператора с ФИО");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const op of validOperators) {
      try {
        await createOperator.mutateAsync({
          code: "AUTO",
          full_name: op.full_name,
          position: op.position || null,
          employee_type: op.employee_type,
          default_work_center_id: op.default_work_center_id || null,
          work_schedule_id: op.work_schedule_id || null,
          phone: op.phone || null,
          email: op.email || null,
          hire_date: op.hire_date || null,
          notes: op.notes || null,
          is_active: true,
        });
        successCount++;
      } catch (error) {
        console.error("Error creating operator:", error);
      }
    }

    setIsSubmitting(false);
    
    if (successCount > 0) {
      toast.success(`Создано операторов: ${successCount}`);
      onOpenChange(false);
    }
  };

  const filledCount = operators.filter((op) => op.full_name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Массовое добавление операторов
            {filledCount > 0 && (
              <Badge variant="secondary">{filledCount} заполнено</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4 -mr-4">
          <div className="space-y-4 pb-4">
            {operators.map((operator, index) => (
              <Card 
                key={operator.id} 
                className="relative"
                ref={index === operators.length - 1 ? lastCardRef : null}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0 mt-5">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      {/* Row 1: Name, Position */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">ФИО *</Label>
                          <Input
                            value={operator.full_name}
                            onChange={(e) => updateOperator(operator.id, "full_name", e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Должность</Label>
                          <Input
                            value={operator.position}
                            onChange={(e) => updateOperator(operator.id, "position", e.target.value)}
                            placeholder="Оператор станка"
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Row 2: Type, Work Center, Schedule */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Тип</Label>
                            {operators.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => copyToAll(operator.id, "employee_type")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Копировать на все</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Select
                            value={operator.employee_type}
                            onValueChange={(value) => updateOperator(operator.id, "employee_type", value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Станочник</SelectItem>
                              <SelectItem value="assembler">Сборщик</SelectItem>
                              <SelectItem value="welder">Сварщик</SelectItem>
                              <SelectItem value="universal">Универсал</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Участок</Label>
                            {operators.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => copyToAll(operator.id, "default_work_center_id")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Копировать на все</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Select
                            value={operator.default_work_center_id || "none"}
                            onValueChange={(value) => updateOperator(operator.id, "default_work_center_id", value === "none" ? "" : value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Выберите" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Не указан</SelectItem>
                              {workCenters?.map((wc: any) => (
                                <SelectItem key={wc.id} value={wc.id}>
                                  {wc.code} - {wc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">График</Label>
                            {operators.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => copyToAll(operator.id, "work_schedule_id")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Копировать на все</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Select
                            value={operator.work_schedule_id || "none"}
                            onValueChange={(value) => updateOperator(operator.id, "work_schedule_id", value === "none" ? "" : value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Выберите" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Не указан</SelectItem>
                              {workSchedules?.map((ws: any) => (
                                <SelectItem key={ws.id} value={ws.id}>
                                  {ws.code} - {ws.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Phone, Email, Hire Date */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Телефон</Label>
                          <Input
                            value={operator.phone}
                            onChange={(e) => updateOperator(operator.id, "phone", e.target.value)}
                            placeholder="+7 (xxx) xxx-xx-xx"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input
                            type="email"
                            value={operator.email}
                            onChange={(e) => updateOperator(operator.id, "email", e.target.value)}
                            placeholder="email@example.com"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Дата приёма</Label>
                            {operators.length > 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => copyToAll(operator.id, "hire_date")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Копировать на все</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Input
                            type="date"
                            value={operator.hire_date}
                            onChange={(e) => updateOperator(operator.id, "hire_date", e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Row 4: Notes */}
                      <div className="space-y-1">
                        <Label className="text-xs">Примечания</Label>
                        <Textarea
                          value={operator.notes}
                          onChange={(e) => updateOperator(operator.id, "notes", e.target.value)}
                          placeholder="Дополнительная информация"
                          rows={1}
                          className="min-h-[36px] resize-none"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive mt-5"
                      onClick={() => removeOperator(operator.id)}
                      disabled={operators.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={addOperator}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить ещё
          </Button>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || filledCount === 0}>
              <Check className="h-4 w-4 mr-2" />
              Создать {filledCount > 0 && `(${filledCount})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
