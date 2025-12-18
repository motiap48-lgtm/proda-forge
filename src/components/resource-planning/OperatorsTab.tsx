import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Edit, Trash2, Wand2, Factory, Calendar, Phone, Clock, Users, FileDown, Printer, RefreshCw, LayoutGrid, List, CalendarDays } from "lucide-react";
import { useOperators, useDeleteOperator } from "@/hooks/useResourcePlanning";
import { OperatorDialog } from "./OperatorDialog";
import { BulkOperatorDialog } from "./BulkOperatorDialog";
import { ShiftRotationCalendar } from "./ShiftRotationCalendar";
import { exportOperatorsToExcel, printOperators } from "./OperatorsPrintExport";
import { differenceInWeeks } from "date-fns";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Helper to calculate current shift based on rotation
const getCurrentShiftForOperator = (operator: any) => {
  const shifts = operator.work_schedules?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return null;
  
  const totalShifts = shifts.length;
  
  // If only one shift - use it
  if (totalShifts === 1) {
    return shifts[0];
  }
  
  // If operator has rotation enabled
  if (operator.shift_rotation_enabled && totalShifts >= 2) {
    const startDate = operator.shift_rotation_start_date 
      ? new Date(operator.shift_rotation_start_date) 
      : new Date();
    const today = new Date();
    const weeksDiff = differenceInWeeks(today, startDate);
    const startingShift = operator.assigned_shift_number || 1;
    const currentShiftNumber = ((startingShift - 1 + weeksDiff) % totalShifts) + 1;
    return shifts.find((s: any) => s.shift_number === currentShiftNumber);
  }
  
  // If operator has fixed shift assigned
  if (operator.assigned_shift_number) {
    return shifts.find((s: any) => s.shift_number === operator.assigned_shift_number);
  }
  
  // No shift assigned - return null (ambiguous)
  return null;
};

export const OperatorsTab = () => {
  const { data: operators, isLoading } = useOperators();
  const deleteOperator = useDeleteOperator();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "grouped" | "calendar">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<any>(null);

  // Collect all unique shift names for filter
  const availableShifts = useMemo(() => {
    const shiftSet = new Map<string, { name: string; count: number }>();
    
    operators?.forEach((op: any) => {
      if (!op.is_active) return;
      const currentShift = getCurrentShiftForOperator(op);
      if (currentShift?.shift_name) {
        const existing = shiftSet.get(currentShift.shift_name);
        if (existing) {
          existing.count++;
        } else {
          shiftSet.set(currentShift.shift_name, { name: currentShift.shift_name, count: 1 });
        }
      }
    });
    
    return Array.from(shiftSet.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [operators]);

  const filteredOperators = useMemo(() => {
    return operators?.filter((op: any) => {
      const matchesSearch = op.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.position?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || op.employee_type === typeFilter;
      
      // Shift filter
      let matchesShift = true;
      if (shiftFilter !== "all") {
        const currentShift = getCurrentShiftForOperator(op);
        matchesShift = currentShift?.shift_name === shiftFilter;
      }
      
      return matchesSearch && matchesType && matchesShift;
    }) || [];
  }, [operators, searchQuery, typeFilter, shiftFilter]);

  const totalOperators = operators?.length || 0;
  const activeOperators = operators?.filter((op: any) => op.is_active).length || 0;

  // Calculate total available time for filtered active operators
  const { totalAvailableTime, filteredAvailableTime } = useMemo(() => {
    // Total for all active operators
    const activeOps = operators?.filter((op: any) => op.is_active) || [];
    let totalMinutes = 0;
    
    for (const operator of activeOps) {
      const currentShift = getCurrentShiftForOperator(operator);
      if (currentShift) {
        const netMinutes = currentShift.net_work_minutes ?? (currentShift.gross_work_minutes - currentShift.break_minutes);
        totalMinutes += netMinutes;
      }
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const totalTime = totalMins > 0 ? `${totalHours} ч ${totalMins} мин` : `${totalHours} ч`;
    
    // Filtered operators time
    const filteredActiveOps = filteredOperators.filter((op: any) => op.is_active);
    let filteredMinutes = 0;
    
    for (const operator of filteredActiveOps) {
      const currentShift = getCurrentShiftForOperator(operator);
      if (currentShift) {
        const netMinutes = currentShift.net_work_minutes ?? (currentShift.gross_work_minutes - currentShift.break_minutes);
        filteredMinutes += netMinutes;
      }
    }
    
    const filteredHours = Math.floor(filteredMinutes / 60);
    const filteredMins = filteredMinutes % 60;
    const filteredTime = filteredMins > 0 ? `${filteredHours} ч ${filteredMins} мин` : `${filteredHours} ч`;
    
    return { 
      totalAvailableTime: totalTime, 
      filteredAvailableTime: filteredTime 
    };
  }, [operators, filteredOperators]);

  // Group operators by current shift
  const groupedOperators = useMemo(() => {
    const groups = new Map<string, { shiftName: string; operators: any[]; totalMinutes: number }>();
    
    filteredOperators.forEach((op: any) => {
      const currentShift = getCurrentShiftForOperator(op);
      const shiftName = currentShift?.shift_name || "Смена не назначена";
      
      if (!groups.has(shiftName)) {
        groups.set(shiftName, { shiftName, operators: [], totalMinutes: 0 });
      }
      
      const group = groups.get(shiftName)!;
      group.operators.push(op);
      
      if (currentShift && op.is_active) {
        const netMinutes = currentShift.net_work_minutes ?? (currentShift.gross_work_minutes - currentShift.break_minutes);
        group.totalMinutes += netMinutes;
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => a.shiftName.localeCompare(b.shiftName));
  }, [filteredOperators]);

  const getShiftFilterLabel = () => {
    if (shiftFilter === "all") return "Все смены";
    return shiftFilter;
  };

  const getEmployeeTypeLabel = (type: string) => {
    switch (type) {
      case "operator": return "Станочник";
      case "assembler": return "Сборщик";
      case "welder": return "Сварщик";
      case "painter": return "Маляр";
      case "universal": return "Универсал";
      default: return type;
    }
  };

  const getEmployeeTypeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "operator": return "default";
      case "assembler": return "secondary";
      case "welder": return "destructive";
      case "painter": return "secondary";
      case "universal": return "outline";
      default: return "outline";
    }
  };

  const getAvailableTime = (operator: any) => {
    const currentShift = getCurrentShiftForOperator(operator);
    const shifts = operator.work_schedules?.work_schedule_shifts;
    
    // Calculate total schedule time
    const totalScheduleMinutes = shifts?.reduce((sum: number, shift: any) => {
      const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
      return sum + netMinutes;
    }, 0) || 0;
    const totalHours = Math.floor(totalScheduleMinutes / 60);
    const totalMins = totalScheduleMinutes % 60;
    const totalTime = totalMins > 0 ? `${totalHours} ч ${totalMins} мин` : `${totalHours} ч`;
    
    if (currentShift) {
      // Return time for the specific shift
      const netMinutes = currentShift.net_work_minutes ?? (currentShift.gross_work_minutes - currentShift.break_minutes);
      const hours = Math.floor(netMinutes / 60);
      const minutes = netMinutes % 60;
      return { 
        time: minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`,
        shiftName: currentShift.shift_name,
        isRotating: operator.shift_rotation_enabled,
        totalTime: shifts?.length > 1 ? totalTime : null
      };
    }
    
    // Fallback: show total for all shifts if no specific shift assigned
    if (!shifts || shifts.length === 0) return null;
    
    return { 
      time: totalTime,
      shiftName: null,
      isRotating: false,
      isTotal: true,
      totalTime: null
    };
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

  const hasActiveFilters = typeFilter !== "all" || shiftFilter !== "all" || searchQuery.length > 0;

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 flex-wrap">
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
              <SelectItem value="painter">Маляр</SelectItem>
              <SelectItem value="universal">Универсал</SelectItem>
            </SelectContent>
          </Select>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger className="w-[200px]">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Смена" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все смены</SelectItem>
              {availableShifts.map((shift) => (
                <SelectItem key={shift.name} value={shift.name}>
                  {shift.name} ({shift.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить несколько
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить оператора
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Всего: <span className="font-medium text-foreground">{totalOperators}</span></span>
            <span>•</span>
            <span>Активных: <span className="font-medium text-foreground">{activeOperators}</span></span>
            {hasActiveFilters && (
              <>
                <span>•</span>
                <span>Отфильтровано: <span className="font-medium text-foreground">{filteredOperators.length}</span></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {hasActiveFilters ? (
              <span>
                Доступное время (фильтр): <span className="font-medium text-primary">{filteredAvailableTime}</span>
                <span className="text-xs ml-2">(всего: {totalAvailableTime})</span>
              </span>
            ) : (
              <span>Общее доступное время: <span className="font-medium text-primary">{totalAvailableTime}</span></span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportOperatorsToExcel(filteredOperators, {
              shiftFilter: getShiftFilterLabel(),
              totalAvailableTime: hasActiveFilters ? filteredAvailableTime : totalAvailableTime
            })}
            disabled={filteredOperators.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => printOperators(filteredOperators, {
              shiftFilter: getShiftFilterLabel(),
              totalAvailableTime: hasActiveFilters ? filteredAvailableTime : totalAvailableTime
            })}
            disabled={filteredOperators.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="cards" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Карточки
            </TabsTrigger>
            <TabsTrigger value="grouped" className="gap-2">
              <List className="h-4 w-4" />
              По сменам
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Ротация
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <ShiftRotationCalendar operators={operators || []} />
      )}

      {/* Grouped by shift view */}
      {viewMode === "grouped" && (
        <div className="space-y-6">
          {groupedOperators.map((group) => {
            const hours = Math.floor(group.totalMinutes / 60);
            const mins = group.totalMinutes % 60;
            const timeStr = mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
            
            return (
              <Card key={group.shiftName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {group.shiftName}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {group.operators.length}
                      </Badge>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <Clock className="h-3 w-3 mr-1" />
                        {timeStr}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {group.operators.map((operator: any) => (
                      <div 
                        key={operator.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0">
                            <User className="h-8 w-8 p-1.5 rounded-full bg-muted" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{operator.full_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{operator.code}</span>
                              {operator.shift_rotation_enabled && (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(operator)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(operator)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {groupedOperators.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Операторы не найдены</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cards view */}
      {viewMode === "cards" && (
        <>
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
                        </div>
                      )}
                      {getAvailableTime(operator) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {getAvailableTime(operator)?.shiftName ? (
                            <span>
                              {getAvailableTime(operator)?.shiftName}
                              {getAvailableTime(operator)?.isRotating && (
                                <RefreshCw className="h-3 w-3 inline ml-1" />
                              )}
                              : <span className="text-primary font-medium">{getAvailableTime(operator)?.time}</span>
                              {getAvailableTime(operator)?.totalTime && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (всего {getAvailableTime(operator)?.totalTime})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              {getAvailableTime(operator)?.isTotal ? "Всего: " : ""}
                              {getAvailableTime(operator)?.time}
                              {!getAvailableTime(operator)?.shiftName && operator.work_schedules?.work_schedule_shifts?.length > 1 && (
                                <span className="text-xs ml-1">(смена не указана)</span>
                              )}
                            </span>
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
        </>
      )}

      <OperatorDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        operator={editingOperator}
      />

      <BulkOperatorDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
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
