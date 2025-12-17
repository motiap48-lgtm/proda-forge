import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, UsersRound, Edit, Trash2, Wand2, Factory, Calendar, User, Crown } from "lucide-react";
import { useBrigades, useDeleteBrigade } from "@/hooks/useResourcePlanning";
import { BrigadeDialog } from "./BrigadeDialog";
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

export const BrigadesTab = () => {
  const { data: brigades, isLoading } = useBrigades();
  const deleteBrigade = useDeleteBrigade();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrigade, setEditingBrigade] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brigadeToDelete, setBrigadeToDelete] = useState<any>(null);

  const filteredBrigades = brigades?.filter((b: any) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getBrigadeTypeLabel = (type: string) => {
    switch (type) {
      case "assembly": return "Сборка";
      case "machining": return "Механообработка";
      case "mixed": return "Смешанная";
      default: return type;
    }
  };

  const getAvailableTime = (brigade: any) => {
    const shifts = brigade.work_schedules?.work_schedule_shifts;
    if (!shifts || shifts.length === 0) return null;
    
    const totalMinutes = shifts.reduce((sum: number, shift: any) => {
      const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      return sum + netMinutes;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  };

  const handleEdit = (brigade: any) => {
    setEditingBrigade(brigade);
    setDialogOpen(true);
  };

  const handleDelete = (brigade: any) => {
    setBrigadeToDelete(brigade);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (brigadeToDelete) {
      deleteBrigade.mutate(brigadeToDelete.id);
      setDeleteDialogOpen(false);
      setBrigadeToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingBrigade(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск бригад..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать бригаду
        </Button>
      </div>

      {filteredBrigades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UsersRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Бригады не найдены</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать бригаду
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBrigades.map((brigade: any) => {
            const activeMembers = brigade.brigade_members?.filter((m: any) => m.is_active) || [];
            const leader = activeMembers.find((m: any) => m.role === "leader");
            
            return (
              <Card key={brigade.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{brigade.code}</span>
                      </div>
                      <CardTitle className="text-lg">{brigade.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(brigade)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(brigade)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={brigade.is_active ? "default" : "secondary"}>
                      {brigade.is_active ? "Активна" : "Неактивна"}
                    </Badge>
                    <Badge variant="outline">
                      {getBrigadeTypeLabel(brigade.brigade_type)}
                    </Badge>
                    <Badge variant="outline">
                      x{brigade.productivity_factor}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {brigade.work_centers && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Factory className="h-4 w-4" />
                        <span>{brigade.work_centers.name}</span>
                      </div>
                    )}
                    {brigade.work_schedules && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{brigade.work_schedules.name}</span>
                        {getAvailableTime(brigade) && (
                          <span className="text-primary font-medium">({getAvailableTime(brigade)})</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UsersRound className="h-4 w-4" />
                      <span>{activeMembers.length} чел.</span>
                    </div>
                  </div>

                  {activeMembers.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium mb-2">Состав:</p>
                      <div className="space-y-1">
                        {activeMembers.map((member: any) => (
                          <div key={member.id} className="flex items-center gap-2 text-sm">
                            {member.role === "leader" ? (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className={member.role === "leader" ? "font-medium" : ""}>
                              {member.operators?.full_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BrigadeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        brigade={editingBrigade}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить бригаду?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Бригада "{brigadeToDelete?.name}" будет удалена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
