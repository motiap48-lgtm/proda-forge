import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Calendar } from "@/components/ui/calendar";
import { Clock, Plus, Search, Edit, CheckCircle2, X, CalendarIcon, FileSpreadsheet, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  useOvertimeEntries,
  useApproveOvertimeEntry,
  useUpdateOvertimeEntry,
  useDeleteOvertimeEntry,
  OvertimeEntry,
} from "@/hooks/useOvertimeEntries";
import { useOperators } from "@/hooks/useResourcePlanning";
import { OvertimeEntryDialog } from "./OvertimeEntryDialog";

export const OvertimeEntriesTab = () => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<OvertimeEntry | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<OvertimeEntry | null>(null);

  const { data: overtimeEntries = [], isLoading } = useOvertimeEntries(startDate, endDate);
  const { data: operators = [] } = useOperators();
  const approveEntry = useApproveOvertimeEntry();
  const updateEntry = useUpdateOvertimeEntry();
  const deleteEntry = useDeleteOvertimeEntry();

  const activeOperators = useMemo(() => 
    operators.filter((op: any) => op.is_active),
    [operators]
  );

  const filteredEntries = useMemo(() => {
    let result = overtimeEntries;

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (operatorFilter !== "all") {
      result = result.filter((e) => e.operator_id === operatorFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.operators?.full_name?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.production_orders?.order_number?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [overtimeEntries, statusFilter, operatorFilter, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const pending = filteredEntries.filter((e) => e.status === "pending");
    const approved = filteredEntries.filter((e) => e.status === "approved");
    const pendingMinutes = pending.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const approvedMinutes = approved.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    
    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      pendingHours: pendingMinutes / 60,
      approvedHours: approvedMinutes / 60,
      totalHours: (pendingMinutes + approvedMinutes) / 60,
    };
  }, [filteredEntries]);

  const handleEdit = (entry: OvertimeEntry) => {
    setSelectedEntry(entry);
    setSelectedOperatorId(entry.operator_id);
    setSelectedDate(new Date(entry.work_date));
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    if (!activeOperators.length) {
      toast.error("Нет активных операторов");
      return;
    }
    setSelectedEntry(null);
    setSelectedOperatorId(activeOperators[0].id);
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  const handleQuickApprove = async (entry: OvertimeEntry) => {
    if (!entry.description?.trim()) {
      toast.error("Нельзя подтвердить без описания работ");
      handleEdit(entry);
      return;
    }
    
    try {
      await approveEntry.mutateAsync(entry.id);
      toast.success("Переработка подтверждена");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuickCancel = async (entry: OvertimeEntry) => {
    try {
      await updateEntry.mutateAsync({ id: entry.id, status: 'cancelled' });
      toast.success("Переработка отменена");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (entry: OvertimeEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteEntry.mutateAsync(entryToDelete.id);
      toast.success("Переработка удалена");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) {
      toast.error("Выберите записи для удаления");
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      for (const id of idsToDelete) {
        await deleteEntry.mutateAsync(id);
      }
      toast.success(`Удалено записей: ${idsToDelete.length}`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleExport = () => {
    const exportData = filteredEntries.map((e) => ({
      "Дата": format(new Date(e.work_date), "dd.MM.yyyy"),
      "Оператор": e.operators?.full_name || "-",
      "Начало": e.start_time?.slice(0, 5),
      "Окончание": e.end_time?.slice(0, 5),
      "Длительность (мин)": e.duration_minutes,
      "Описание работ": e.description || "",
      "Заказ": e.production_orders?.order_number || "-",
      "Статус": e.status === "pending" ? "Ожидает" : e.status === "approved" ? "Подтверждено" : "Отменено",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Переработки");
    XLSX.writeFile(wb, `Переработки_${format(startDate, "dd.MM")}-${format(endDate, "dd.MM.yyyy")}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Ожидает</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Подтверждено</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground">Отменено</Badge>;
      default:
        return null;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
    }
    return `${mins}м`;
  };

  const selectedOperator = activeOperators.find((op: any) => op.id === selectedOperatorId);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Переработки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(startDate, "d MMM", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(endDate, "d MMM yyyy", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="approved">Подтверждено</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
              </SelectContent>
            </Select>

            {/* Operator filter */}
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Оператор" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все операторы</SelectItem>
                {activeOperators.map((op: any) => (
                  <SelectItem key={op.id} value={op.id}>{op.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button size="sm" onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Всего</div>
              <div className="text-xl font-bold">{filteredEntries.length}</div>
            </div>
            <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-sm text-amber-700 dark:text-amber-400">Ожидает</div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                {totals.pendingCount} ({totals.pendingHours.toFixed(1)}ч)
              </div>
            </div>
            <div className="p-3 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-400">Подтверждено</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-400">
                {totals.approvedCount} ({totals.approvedHours.toFixed(1)}ч)
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm text-primary">Итого часов</div>
              <div className="text-xl font-bold text-primary">{totals.totalHours.toFixed(1)}ч</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Оператор</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead className="max-w-[300px]">Описание работ</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Переработки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className={cn(entry.status === "cancelled" && "opacity-50")}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => toggleSelect(entry.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {format(new Date(entry.work_date), "d MMM", { locale: ru })}
                    </TableCell>
                    <TableCell>{entry.operators?.full_name}</TableCell>
                    <TableCell className="text-sm">
                      {entry.start_time?.slice(0, 5)} — {entry.end_time?.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatDuration(entry.duration_minutes || 0)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <span className={cn(
                        "text-sm line-clamp-2",
                        !entry.description?.trim() && "text-amber-600 italic"
                      )}>
                        {entry.description?.trim() || "Описание не заполнено"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.production_orders?.order_number || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {entry.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              onClick={() => handleQuickApprove(entry)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleQuickCancel(entry)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <OvertimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        operatorId={selectedOperatorId}
        operatorName={activeOperators.find((op: any) => op.id === selectedOperatorId)?.full_name || ""}
        date={selectedDate}
        entry={selectedEntry}
        operators={activeOperators}
        onOperatorChange={setSelectedOperatorId}
        onDateChange={setSelectedDate}
        onDelete={handleDeleteClick}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить переработку?</AlertDialogTitle>
            <AlertDialogDescription>
              {entryToDelete && (
                <>
                  Переработка от {format(new Date(entryToDelete.work_date), "d MMMM yyyy", { locale: ru })} 
                  ({entryToDelete.operators?.full_name}) будет удалена безвозвратно.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранные переработки?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет удалено записей: {selectedIds.size}. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить все
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
