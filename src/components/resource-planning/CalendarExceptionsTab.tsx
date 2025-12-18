import { useState } from "react";
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
import { Plus, Search, CalendarDays, Edit, Trash2, X, CalendarOff, CalendarCheck } from "lucide-react";
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

interface ExceptionFormData {
  exception_date: Date | null;
  exception_type: string;
  name: string;
  description: string;
  is_working_day: boolean;
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

  const [formData, setFormData] = useState<ExceptionFormData>({
    exception_date: null,
    exception_type: "holiday",
    name: "",
    description: "",
    is_working_day: false,
  });

  const filteredExceptions = exceptions?.filter((e: any) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format(parseISO(e.exception_date), "d MMMM yyyy", { locale: ru }).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getExceptionTypeLabel = (type: string) => {
    switch (type) {
      case "holiday": return "Праздник";
      case "shortened_day": return "Сокращённый день";
      case "extra_working_day": return "Рабочий день";
      default: return type;
    }
  };

  const handleEdit = (exception: any) => {
    setEditingException(exception);
    setFormData({
      exception_date: parseISO(exception.exception_date),
      exception_type: exception.exception_type,
      name: exception.name,
      description: exception.description || "",
      is_working_day: exception.is_working_day,
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

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingException(null);
    setFormData({
      exception_date: null,
      exception_type: "holiday",
      name: "",
      description: "",
      is_working_day: false,
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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить исключение
        </Button>
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
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {year} год
                <Badge variant="secondary">{groupedExceptions[year].length}</Badge>
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedExceptions[year].map((exception: any) => (
                  <Card key={exception.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {exception.is_working_day ? (
                              <CalendarCheck className="h-4 w-4 text-green-500" />
                            ) : (
                              <CalendarOff className="h-4 w-4 text-rose-500" />
                            )}
                            <span className="font-medium">{exception.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {format(parseISO(exception.exception_date), "d MMMM yyyy (EEEE)", { locale: ru })}
                          </div>
                          <div className="flex items-center gap-2">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingException ? "Редактировать исключение" : "Новое исключение"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Дата *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.exception_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.exception_date 
                      ? format(formData.exception_date, "d MMMM yyyy", { locale: ru })
                      : "Выберите дату"}
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

            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Новый год"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select
                  value={formData.exception_type}
                  onValueChange={(value) => setFormData({ ...formData, exception_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Праздник</SelectItem>
                    <SelectItem value="shortened_day">Сокращённый день</SelectItem>
                    <SelectItem value="extra_working_day">Рабочий день (перенос)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Статус дня</Label>
                <Select
                  value={formData.is_working_day ? "working" : "off"}
                  onValueChange={(value) => setFormData({ ...formData, is_working_day: value === "working" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Выходной</SelectItem>
                    <SelectItem value="working">Рабочий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.exception_date || !formData.name || createException.isPending || updateException.isPending}
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
    </div>
  );
};
