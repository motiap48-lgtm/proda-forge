import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
import { useBrigadeMemberHistory, useClearBrigadeMemberHistory } from "@/hooks/useResourcePlanning";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { UserPlus, UserMinus, Crown, RefreshCw, User, Trash2 } from "lucide-react";

interface BrigadeMemberHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brigadeId: string | null;
  brigadeName: string;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case "added":
     return <UserPlus className="h-4 w-4 text-primary" />;
    case "removed":
      return <UserMinus className="h-4 w-4 text-destructive" />;
    case "role_changed":
     return <Crown className="h-4 w-4 text-secondary-foreground" />;
    case "reactivated":
     return <RefreshCw className="h-4 w-4 text-primary" />;
    default:
      return <User className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActionLabel = (actionType: string, oldRole?: string | null, newRole?: string | null) => {
  const roleLabels: Record<string, string> = {
    leader: "бригадир",
    member: "участник",
  };
  
  switch (actionType) {
    case "added":
      return `Добавлен как ${roleLabels[newRole || "member"] || newRole}`;
    case "removed":
      return `Удалён (был ${roleLabels[oldRole || "member"] || oldRole})`;
    case "role_changed":
      return `Роль изменена: ${roleLabels[oldRole || ""] || oldRole} → ${roleLabels[newRole || ""] || newRole}`;
    case "reactivated":
      return `Восстановлен как ${roleLabels[newRole || "member"] || newRole}`;
    default:
      return actionType;
  }
};

const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (actionType) {
    case "added":
    case "reactivated":
      return "default";
    case "removed":
      return "destructive";
    case "role_changed":
      return "secondary";
    default:
      return "outline";
  }
};

export const BrigadeMemberHistoryDialog = ({
  open,
  onOpenChange,
  brigadeId,
  brigadeName,
}: BrigadeMemberHistoryDialogProps) => {
  const { data: history, isLoading } = useBrigadeMemberHistory(brigadeId);
  const clearHistory = useClearBrigadeMemberHistory();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleClearHistory = () => {
    if (brigadeId) {
      clearHistory.mutate(brigadeId, {
        onSuccess: () => setConfirmClearOpen(false),
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>История изменений: {brigadeName}</DialogTitle>
              {history && history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmClearOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Очистить
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка...
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                История изменений пуста
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {history.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {getActionIcon(entry.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {entry.operators?.full_name || "Неизвестный оператор"}
                        </span>
                        <Badge variant={getActionBadgeVariant(entry.action_type)} className="text-xs">
                          {getActionLabel(entry.action_type, entry.old_role, entry.new_role)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {entry.operators?.code && (
                          <span className="mr-2">{entry.operators.code}</span>
                        )}
                        <span>
                          {format(new Date(entry.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить историю изменений?</AlertDialogTitle>
            <AlertDialogDescription>
              Вся история изменений для бригады «{brigadeName}» будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistory.isPending ? "Удаление..." : "Очистить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
