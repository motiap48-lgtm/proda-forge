import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Plus, X, Crown, User } from "lucide-react";
import { UserMinus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  useCreateBrigade, 
  useUpdateBrigade, 
  useActiveWorkSchedules,
  useActiveOperators,
  useAddBrigadeMember,
  useRemoveBrigadeMember,
  useUpdateBrigadeMemberRole,
} from "@/hooks/useResourcePlanning";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";

interface BrigadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brigade?: any;
}

export const BrigadeDialog = ({
  open,
  onOpenChange,
  brigade,
}: BrigadeDialogProps) => {
  const createBrigade = useCreateBrigade();
  const updateBrigade = useUpdateBrigade();
  const addMember = useAddBrigadeMember();
  const removeMember = useRemoveBrigadeMember();
  const updateMemberRole = useUpdateBrigadeMemberRole();
  const { data: workCenters } = useActiveWorkCenters();
  const { data: workSchedules } = useActiveWorkSchedules();
  const { data: operators } = useActiveOperators();
  const isEditing = !!brigade;

  const [formData, setFormData] = useState({
    name: "",
    brigade_type: "assembly",
    default_work_center_id: "",
    work_schedule_id: "",
    productivity_factor: 1,
    notes: "",
    is_active: true,
  });

  const [selectedOperator, setSelectedOperator] = useState("");
  const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false);
  const [memberToDemote, setMemberToDemote] = useState<string | null>(null);

  useEffect(() => {
    if (brigade) {
      setFormData({
        name: brigade.name || "",
        brigade_type: brigade.brigade_type || "assembly",
        default_work_center_id: brigade.default_work_center_id || "",
        work_schedule_id: brigade.work_schedule_id || "",
        productivity_factor: brigade.productivity_factor || 1,
        notes: brigade.notes || "",
        is_active: brigade.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        brigade_type: "assembly",
        default_work_center_id: "",
        work_schedule_id: "",
        productivity_factor: 1,
        notes: "",
        is_active: true,
      });
    }
    setSelectedOperator("");
  }, [brigade, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      default_work_center_id: formData.default_work_center_id || null,
      work_schedule_id: formData.work_schedule_id || null,
    };

    if (isEditing) {
      updateBrigade.mutate(
        { id: brigade.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createBrigade.mutate(
        { ...data, code: "AUTO" },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const handleAddMember = () => {
    if (selectedOperator && brigade) {
      addMember.mutate({
        brigade_id: brigade.id,
        operator_id: selectedOperator,
        role: "member",
      });
      setSelectedOperator("");
    }
  };

  const handleRemoveMember = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  const handleSetLeader = async (memberId: string) => {
    if (!brigade) return;
    
    // Find and demote current leader to member
    const currentLeader = brigade?.brigade_members?.find((m: any) => m.role === "leader" && m.is_active);
    if (currentLeader) {
      // First demote the current leader, then promote the new one
      try {
        await updateMemberRole.mutateAsync({ memberId: currentLeader.id, role: "member" });
        await updateMemberRole.mutateAsync({ memberId, role: "leader" });
      } catch (error) {
        // Error is already handled by the mutation's onError
      }
    } else {
      // No current leader, just promote the selected member
      updateMemberRole.mutate({ memberId, role: "leader" });
    }
  };

  const handleDemoteLeader = (memberId: string) => {
    setMemberToDemote(memberId);
    setDemoteConfirmOpen(true);
  };

  const confirmDemoteLeader = () => {
    if (memberToDemote) {
      updateMemberRole.mutate({ memberId: memberToDemote, role: "member" });
    }
    setDemoteConfirmOpen(false);
    setMemberToDemote(null);
  };

  const activeMembers = brigade?.brigade_members?.filter((m: any) => m.is_active) || [];
  const memberOperatorIds = activeMembers.map((m: any) => m.operator_id);
  const availableOperators = operators?.filter((op: any) => !memberOperatorIds.includes(op.id)) || [];
  
  const operatorOptions = availableOperators.map((op: any) => ({
    value: op.id,
    label: `${op.code} - ${op.full_name}`,
    searchText: `${op.code} ${op.full_name}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактировать бригаду" : "Новая бригада"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Код</Label>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <Input
                value={isEditing ? brigade.code : "Авто"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Бригада сборки №1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brigade_type">Тип бригады</Label>
              <Select
                value={formData.brigade_type}
                onValueChange={(value) => setFormData({ ...formData, brigade_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assembly">Сборка</SelectItem>
                  <SelectItem value="machining">Механообработка</SelectItem>
                  <SelectItem value="mixed">Смешанная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productivity_factor">Коэффициент производительности</Label>
              <Input
                id="productivity_factor"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.productivity_factor}
                onChange={(e) =>
                  setFormData({ ...formData, productivity_factor: parseFloat(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_work_center_id">Основной участок</Label>
            <Select
              value={formData.default_work_center_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, default_work_center_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите участок" />
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

          <div className="space-y-2">
            <Label htmlFor="work_schedule_id">График работы</Label>
            <Select
              value={formData.work_schedule_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, work_schedule_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите график" />
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

          {isEditing && (
            <div className="space-y-2 border-t pt-4">
              <Label>Состав бригады</Label>
              
              <div className="flex gap-2">
                <SearchableSelect
                  options={operatorOptions}
                  value={selectedOperator}
                  onValueChange={setSelectedOperator}
                  placeholder="Выберите оператора"
                  searchPlaceholder="Поиск оператора..."
                  emptyText="Операторы не найдены"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMember}
                  disabled={!selectedOperator || addMember.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {activeMembers.length > 0 && (
                <div className="space-y-2 mt-2">
                  {activeMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {member.role === "leader" ? (
                          <Crown className="h-4 w-4 text-amber-500" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={member.role === "leader" ? "font-medium" : ""}>
                          {member.operators?.full_name}
                        </span>
                        {member.role === "leader" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  className="text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-sm cursor-pointer hover:from-amber-500 hover:to-orange-600 transition-all duration-200 group"
                                  onClick={() => handleDemoteLeader(member.id)}
                                >
                                  <span className="group-hover:hidden">Бригадир</span>
                                  <span className="hidden group-hover:inline-flex items-center gap-1">
                                    <UserMinus className="h-3 w-3" />
                                    Снять
                                  </span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Снять роль бригадира</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {member.role !== "leader" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetLeader(member.id)}
                            title="Назначить бригадиром"
                            disabled={updateMemberRole.isPending}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Активна</Label>
              <p className="text-sm text-muted-foreground">
                Доступна для назначений
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createBrigade.isPending || updateBrigade.isPending}>
              {isEditing ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>

        <AlertDialog open={demoteConfirmOpen} onOpenChange={setDemoteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Снять роль бригадира?</AlertDialogTitle>
              <AlertDialogDescription>
                Сотрудник останется в бригаде, но больше не будет её бригадиром.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDemoteLeader}>
                Снять роль
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
