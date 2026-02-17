import { useState, useEffect } from "react";
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
import { AlertTriangle, UserX, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useTerminateOperator, useUpdateTermination, useCancelTermination } from "@/hooks/useEmploymentHistory";
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

interface TerminateOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: any;
  /** If true, dialog opens in edit mode for an existing scheduled termination */
  editMode?: boolean;
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

// Reverse lookup: find value by label
const findReasonValue = (label: string | null): string => {
  if (!label) return "";
  const found = TERMINATION_REASONS.find((r) => r.label === label);
  return found?.value || "";
};

export const TerminateOperatorDialog = ({
  open,
  onOpenChange,
  operator,
  editMode = false,
}: TerminateOperatorDialogProps) => {
  const terminateOperator = useTerminateOperator();
  const updateTermination = useUpdateTermination();
  const cancelTermination = useCancelTermination();

  const [formData, setFormData] = useState({
    termination_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    notes: "",
  });

  const [reasonError, setReasonError] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (open && editMode && operator) {
      setFormData({
        termination_date: operator.termination_date || format(new Date(), "yyyy-MM-dd"),
        reason: findReasonValue(operator.termination_reason),
        notes: "",
      });
      setReasonError(false);
    } else if (open && !editMode) {
      setFormData({
        termination_date: format(new Date(), "yyyy-MM-dd"),
        reason: "",
        notes: "",
      });
      setReasonError(false);
    }
  }, [open, editMode, operator]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason) {
      setReasonError(true);
      return;
    }

    const reasonLabel =
      TERMINATION_REASONS.find((r) => r.value === formData.reason)?.label || formData.reason;

    if (editMode) {
      updateTermination.mutate(
        {
          operatorId: operator.id,
          terminationDate: formData.termination_date,
          reason: reasonLabel,
          notes: formData.notes || undefined,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      terminateOperator.mutate(
        {
          operatorId: operator.id,
          terminationDate: formData.termination_date,
          reason: reasonLabel,
          notes: formData.notes || undefined,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const handleCancelTermination = () => {
    cancelTermination.mutate(operator.id, {
      onSuccess: () => {
        setCancelDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  const isPending = terminateOperator.isPending || updateTermination.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              {editMode ? "Редактирование увольнения" : "Увольнение сотрудника"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Измените дату или причину запланированного увольнения, либо отмените его."
                : "Сотрудник будет переведён в архив, где сохранится вся история его работы."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert
              variant="default"
              className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{operator?.full_name}</strong> ({operator?.code})
                {editMode
                  ? " — увольнение запланировано. Вы можете изменить параметры или отменить."
                  : " будет уволен. Если дата увольнения в будущем — сотрудник останется активным до наступления указанной даты."}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="termination_date">Дата увольнения *</Label>
              <Input
                id="termination_date"
                type="date"
                value={formData.termination_date}
                onChange={(e) =>
                  setFormData({ ...formData, termination_date: e.target.value })
                }
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

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={cancelTermination.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Отменить увольнение
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Закрыть
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending
                    ? "Сохранение..."
                    : editMode
                    ? "Сохранить"
                    : "Уволить"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить увольнение?</AlertDialogTitle>
            <AlertDialogDescription>
              Запланированное увольнение{" "}
              <strong>{operator?.full_name}</strong> будет отменено. Запись об
              увольнении будет удалена из истории.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет, оставить</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTermination}
              disabled={cancelTermination.isPending}
            >
              {cancelTermination.isPending ? "Отмена..." : "Да, отменить увольнение"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
