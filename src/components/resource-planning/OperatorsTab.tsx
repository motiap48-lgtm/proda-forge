import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Edit, Trash2, Wand2, Factory, Calendar, Phone, Clock, Users } from "lucide-react";
import { useOperators, useDeleteOperator } from "@/hooks/useResourcePlanning";
import { OperatorDialog } from "./OperatorDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const OperatorsTab = () => {
  const { data: operators, isLoading } = useOperators();
  const deleteOperator = useDeleteOperator();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<any>(null);

  const filteredOperators = operators?.filter((op: any) => {
    const matchesSearch = op.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.position?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || op.employee_type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const totalOperators = operators?.length || 0;
  const activeOperators = operators?.filter((op: any) => op.is_active).length || 0;

  const getEmployeeTypeLabel = (type: string) => {
    switch (type) {
      case "operator": return "Станочник";
      case "assembler": return "Сборщик";
      case "welder": return "Сварщик";
      case "universal": return "Универсал";
      default: return type;
    }
  };

  const getEmployeeTypeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "operator": return "default";
      case "assembler": return "secondary";
      case "welder": return "destructive";
      case "universal": return "outline";
      default: return "outline";
    }
  };

  const getAvailableTime = (operator: any) => {
    const shifts = operator.work_schedules?.work_schedule_shifts;
    if (!shifts || shifts.length === 0) return null;
    
    const totalMinutes = shifts.reduce((sum: number, shift: any) => {
      const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      return sum + netMinutes;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  };

  const handleEdit = (operator: any) => {
    setEditingOperator(operator);
    setDialogOpen(true);
  };

  const handleDelete = (operator: any) => {
    setOperatorToDelete(operator);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (operatorToDelete) {
      deleteOperator.mutate(operatorToDelete.id);
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingOperator(null);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск операторов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Тип сотрудника" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="operator">Станочник</SelectItem>
              <SelectItem value="assembler">Сборщик</SelectItem>
              <SelectItem value="welder">Сварщик</SelectItem>
              <SelectItem value="universal">Универсал</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить оператора
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Всего: <span className="font-medium text-foreground">{totalOperators}</span></span>
        <span>•</span>
        <span>Активных: <span className="font-medium text-foreground">{activeOperators}</span></span>
        {typeFilter !== "all" && (
          <>
            <span>•</span>
            <span>Отфильтровано: <span className="font-medium text-foreground">{filteredOperators.length}</span></span>
          </>
        )}
      </div>

      {filteredOperators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Операторы не найдены</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить оператора
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOperators.map((operator: any) => (
            <Card key={operator.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wand2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{operator.code}</span>
                    </div>
                    <CardTitle className="text-lg">{operator.full_name}</CardTitle>
                    {operator.position && (
                      <p className="text-sm text-muted-foreground">{operator.position}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(operator)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(operator)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={operator.is_active ? "default" : "secondary"}>
                    {operator.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                  <Badge variant={getEmployeeTypeVariant(operator.employee_type)}>
                    {getEmployeeTypeLabel(operator.employee_type)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {operator.work_centers && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Factory className="h-4 w-4" />
                      <span>{operator.work_centers.name}</span>
                    </div>
                  )}
                  {operator.work_schedules && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{operator.work_schedules.name}</span>
                      {getAvailableTime(operator) && (
                        <span className="text-primary font-medium">({getAvailableTime(operator)})</span>
                      )}
                    </div>
                  )}
                  {!operator.work_schedules && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-muted-foreground/70">График не назначен</span>
                    </div>
                  )}
                  {operator.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{operator.phone}</span>
                    </div>
                  )}
                </div>

                {operator.operator_skills && operator.operator_skills.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Навыки ({operator.operator_skills.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {operator.operator_skills.slice(0, 3).map((skill: any) => (
                        <Badge key={skill.id} variant="outline" className="text-xs">
                          {skill.work_centers?.code || skill.standard_operations?.code}
                        </Badge>
                      ))}
                      {operator.operator_skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{operator.operator_skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OperatorDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        operator={editingOperator}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить оператора?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Оператор "{operatorToDelete?.full_name}" будет удалён.
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
