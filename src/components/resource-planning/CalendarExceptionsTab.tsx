import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Search, CalendarDays, Edit, Trash2, X, CalendarOff, CalendarCheck, Clock, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useCalendarExceptions,
  useCreateCalendarException,
  useUpdateCalendarException,
  useDeleteCalendarException,
} from "@/hooks/useResourcePlanning";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HolidayImportDialog } from "./HolidayImportDialog";

interface ExceptionFormData {
  exception_date: Date | null;
  exception_type: string;
  name: string;
  description: string;
  is_working_day: boolean;
  reduced_hours: number | null; // Legacy: absolute hours
  reduction_hours: number; // New: hours to reduce from schedule
}

export const CalendarExceptionsTab = () => {
  const { data: exceptions, isLoading } = useCalendarExceptions();
  const createException = useCreateCalendarException();
  const updateException = useUpdateCalendarException();
  const deleteException = useDeleteCalendarException();

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingException, setEditingException] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<any>(null);
  const [deleteYearDialogOpen, setDeleteYearDialogOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [formData, setFormData] = useState<ExceptionFormData>({
    exception_date: null,
    exception_type: "holiday",
    name: "",
    description: "",
    is_working_day: false,
    reduced_hours: null,
    reduction_hours: 1,
  });

  // Get available years from exceptions + current/next years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear, currentYear + 1, currentYear + 2]);
    
    exceptions?.forEach((e: any) => {
      const year = new Date(e.exception_date).getFullYear();
      yearsSet.add(year);
    });
    
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [exceptions]);

  const filteredExceptions = useMemo(() => {
    let result = exceptions || [];
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter((e: any) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format(parseISO(e.exception_date), "d MMMM yyyy", { locale: ru }).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by year
    if (selectedYear !== "all") {
      result = result.filter((e: any) => 
        new Date(e.exception_date).getFullYear().toString() === selectedYear
      );
    }
    
    // Filter by type
    if (selectedType !== "all") {
      result = result.filter((e: any) => e.exception_type === selectedType);
    }
    
    return result;
  }, [exceptions, searchQuery, selectedYear, selectedType]);

  const getExceptionTypeLabel = (type: string) => {
    switch (type) {
      case "holiday": return "Праздник";
      case "shortened_day": return "Сокращённый день";
      case "extra_working_day": return "Рабочий день";
      default: return type;
    }
  };

  const getExceptionTypeIcon = (type: string, isWorkingDay: boolean) => {
    if (type === "shortened_day") {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    if (isWorkingDay) {
      return <CalendarCheck className="h-4 w-4 text-green-500" />;
    }
    return <CalendarOff className="h-4 w-4 text-rose-500" />;
  };

  const handleEdit = (exception: any) => {
    setEditingException(exception);
    setFormData({
      exception_date: parseISO(exception.exception_date),
      exception_type: exception.exception_type,
      name: exception.name,
      description: exception.description || "",
      is_working_day: exception.is_working_day,
      reduced_hours: exception.reduced_hours || null,
      reduction_hours: exception.reduction_hours ?? 1,
    });
    setDialogOpen(true);
  };

  const handleDelete = (exception: any) => {
    setExceptionToDelete(exception);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (exceptionToDelete) {
      deleteException.mutate(exceptionToDelete.id);
      setDeleteDialogOpen(false);
      setExceptionToDelete(null);
    }
  };

  const handleDeleteYear = (year: string) => {
    setYearToDelete(year);
    setDeleteYearDialogOpen(true);
  };

  const confirmDeleteYear = async () => {
    if (yearToDelete && exceptions) {
      const exceptionsToDelete = exceptions.filter(
        (e: any) => new Date(e.exception_date).getFullYear().toString() === yearToDelete
      );
      
      for (const exception of exceptionsToDelete) {
        await deleteException.mutateAsync(exception.id);
      }
      
      setDeleteYearDialogOpen(false);
      setYearToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingException(null);
    setFormData({
      exception_date: null,
      exception_type: "holiday",
      name: "",
      description: "",
      is_working_day: false,
      reduced_hours: null,
      reduction_hours: 1,
    });
  };

  const handleTypeChange = (type: string) => {
    const isShortenedDay = type === "shortened_day";
    setFormData({ 
      ...formData, 
      exception_type: type,
      is_working_day: isShortenedDay ? true : formData.is_working_day,
      reduced_hours: isShortenedDay ? (formData.reduced_hours || null) : null,
      reduction_hours: isShortenedDay ? (formData.reduction_hours || 1) : 1,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exception_date) return;

    const data = {
      exception_date: format(formData.exception_date, "yyyy-MM-dd"),
      exception_type: formData.exception_type,
      name: formData.name,
      description: formData.description || null,
      is_working_day: formData.is_working_day,
      reduced_hours: formData.exception_type === "shortened_day" ? formData.reduced_hours : null,
      reduction_hours: formData.exception_type === "shortened_day" ? formData.reduction_hours : null,
    };

    if (editingException) {
      await updateException.mutateAsync({ id: editingException.id, ...data });
    } else {
      await createException.mutateAsync(data);
    }
    handleDialogClose();
  };

  const groupedExceptions = filteredExceptions.reduce((groups: any, exception: any) => {
    const year = new Date(exception.exception_date).getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year].push(exception);
    return groups;
  }, {});

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск исключений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Импорт праздников РФ
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить исключение
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Год:</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все годы</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Тип:</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="holiday">Праздники</SelectItem>
                <SelectItem value="shortened_day">Сокращённые дни</SelectItem>
                <SelectItem value="extra_working_day">Рабочие дни (перенос)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredExceptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Исключения календаря не найдены</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить исключение
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedExceptions).sort((a, b) => Number(b) - Number(a)).map((year) => (
            <div key={year} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {year} год
                  <Badge variant="secondary">{groupedExceptions[year].length}</Badge>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteYear(year)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить {year} год
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedExceptions[year].map((exception: any) => (
                  <Card key={exception.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getExceptionTypeIcon(exception.exception_type, exception.is_working_day)}
                            <span className="font-medium">{exception.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {format(parseISO(exception.exception_date), "d MMMM yyyy (EEEE)", { locale: ru })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant={exception.is_working_day ? "default" : "destructive"}
                              className={cn(
                                exception.is_working_day 
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" 
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              )}
                            >
                              {exception.is_working_day ? "Рабочий" : "Выходной"}
                            </Badge>
                            <Badge variant="outline">
                              {getExceptionTypeLabel(exception.exception_type)}
                            </Badge>
                            {exception.exception_type === "shortened_day" && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                {exception.reduction_hours ? `-${exception.reduction_hours}ч` : (exception.reduced_hours ? `${exception.reduced_hours}ч` : "-1ч")}
                              </Badge>
                            )}
                          </div>
                          {exception.description && (
                            <p className="text-sm text-muted-foreground mt-2">{exception.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(exception)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exception)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingException ? "Редактировать исключение" : "Новое исключение"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Дата *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !formData.exception_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-3.5 w-3.5" />
                      {formData.exception_date 
                        ? format(formData.exception_date, "d MMM yyyy", { locale: ru })
                        : "Выберите"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.exception_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, exception_date: date || null })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Новый год"
                  className="h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Тип</Label>
                <Select
                  value={formData.exception_type || "holiday"}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Праздник</SelectItem>
                    <SelectItem value="shortened_day">Сокращённый день</SelectItem>
                    <SelectItem value="extra_working_day">Рабочий (перенос)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Статус дня</Label>
                <Select
                  value={formData.is_working_day ? "working" : "off"}
                  onValueChange={(value) => setFormData({ ...formData, is_working_day: value === "working" })}
                  disabled={formData.exception_type === "shortened_day"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Выходной</SelectItem>
                    <SelectItem value="working">Рабочий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.exception_type === "shortened_day" && (
              <div className="space-y-1.5">
                <Label htmlFor="reduction_hours" className="text-xs">Сокращение (ч) *</Label>
                <Input
                  id="reduction_hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="4"
                  value={formData.reduction_hours}
                  onChange={(e) => setFormData({ ...formData, reduction_hours: e.target.value ? parseFloat(e.target.value) : 1 })}
                  placeholder="1"
                  className="h-9"
                  required
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Вычитается из нормы каждого графика: 12ч−1ч=11ч, 10ч40м−1ч=9ч40м, 8ч−1ч=7ч
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация"
                className="h-9"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDialogClose}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={
                  !formData.exception_date || 
                  !formData.name || 
                  (formData.exception_type === "shortened_day" && !formData.reduction_hours) ||
                  createException.isPending || 
                  updateException.isPending
                }
              >
                {editingException ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить исключение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Исключение "{exceptionToDelete?.name}" будет удалено.
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

      {/* Delete Year Confirmation */}
      <AlertDialog open={deleteYearDialogOpen} onOpenChange={setDeleteYearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить все исключения за {yearToDelete} год?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Будет удалено{" "}
              {yearToDelete && exceptions
                ? exceptions.filter((e: any) => new Date(e.exception_date).getFullYear().toString() === yearToDelete).length
                : 0}{" "}
              исключений календаря.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteYear} 
              className="bg-destructive text-destructive-foreground"
              disabled={deleteException.isPending}
            >
              {deleteException.isPending ? "Удаление..." : "Удалить все"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Holiday Import Dialog */}
      <HolidayImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog} 
      />
    </div>
  );
};
