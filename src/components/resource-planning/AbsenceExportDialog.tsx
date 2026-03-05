import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllOperatorAbsences, ABSENCE_TYPE_LABELS } from "@/hooks/useOperatorAbsences";
import { useOperators } from "@/hooks/useResourcePlanning";
import XLSX from "@/lib/excel";

interface AbsenceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PeriodPreset = "this_month" | "last_month" | "this_year" | "custom";

export const AbsenceExportDialog: React.FC<AbsenceExportDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: absences = [] } = useAllOperatorAbsences();
  const { data: operators = [] } = useOperators();
  
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [absenceTypeFilter, setAbsenceTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  // Handle period preset change
  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "this_month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case "this_year":
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        break;
      case "custom":
        // Keep current dates
        break;
    }
  };

  // Filter absences
  const filteredAbsences = useMemo(() => {
    return absences.filter(absence => {
      // Filter by type
      if (absenceTypeFilter !== "all" && absence.absence_type !== absenceTypeFilter) {
        return false;
      }
      
      // Filter by date range (overlap check)
      const absenceStart = new Date(absence.start_date);
      const absenceEnd = new Date(absence.end_date);
      
      return absenceStart <= endDate && absenceEnd >= startDate;
    });
  }, [absences, absenceTypeFilter, startDate, endDate]);

  // Export to Excel
  const handleExport = () => {
    setIsExporting(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      const exportData = filteredAbsences.map(absence => {
        const operator = operators.find(op => op.id === absence.operator_id);
        const typeInfo = ABSENCE_TYPE_LABELS[absence.absence_type] || { label: absence.absence_type, icon: "" };
        
        const start = new Date(absence.start_date);
        const end = new Date(absence.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          "Сотрудник": operator?.full_name || "Неизвестный",
          "Код": operator?.code || "",
          "Тип отсутствия": typeInfo.label,
          "Дата начала": format(start, "dd.MM.yyyy"),
          "Дата окончания": format(end, "dd.MM.yyyy"),
          "Кол-во дней": days,
          "Статус": absence.status === "approved" ? "Одобрено" : 
                    absence.status === "pending" ? "Ожидает" :
                    absence.status === "rejected" ? "Отклонено" : "Отменено",
          "Примечание": absence.notes || "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 30 }, // Сотрудник
        { wch: 12 }, // Код
        { wch: 20 }, // Тип
        { wch: 12 }, // Дата начала
        { wch: 12 }, // Дата окончания
        { wch: 10 }, // Кол-во дней
        { wch: 12 }, // Статус
        { wch: 30 }, // Примечание
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Отсутствия");
      
      // Summary sheet
      const summaryByType = new Map<string, number>();
      filteredAbsences.forEach(absence => {
        const current = summaryByType.get(absence.absence_type) || 0;
        const start = new Date(absence.start_date);
        const end = new Date(absence.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        summaryByType.set(absence.absence_type, current + days);
      });

      const summaryData = Array.from(summaryByType.entries()).map(([type, days]) => ({
        "Тип отсутствия": ABSENCE_TYPE_LABELS[type]?.label || type,
        "Всего дней": days,
        "Записей": filteredAbsences.filter(a => a.absence_type === type).length,
      }));

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

      const startStr = format(startDate, "dd.MM.yyyy");
      const endStr = format(endDate, "dd.MM.yyyy");
      XLSX.writeFile(wb, `Отсутствия_${startStr}-${endStr}.xlsx`);
      
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Экспорт отсутствий в Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Период</Label>
            <Select value={periodPreset} onValueChange={(v) => handlePeriodPresetChange(v as PeriodPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Текущий месяц</SelectItem>
                <SelectItem value="last_month">Прошлый месяц</SelectItem>
                <SelectItem value="this_year">Текущий год</SelectItem>
                <SelectItem value="custom">Произвольный период</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodPreset === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>С</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "d MMM yyyy", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>По</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "d MMM yyyy", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Тип отсутствия</Label>
            <Select value={absenceTypeFilter} onValueChange={setAbsenceTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {Object.entries(ABSENCE_TYPE_LABELS).map(([value, { label, icon }]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Найдено записей:</span>
              <Badge variant="secondary">{filteredAbsences.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Период:</span>
              <span className="font-medium">
                {format(startDate, "d MMM", { locale: ru })} — {format(endDate, "d MMM yyyy", { locale: ru })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredAbsences.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Скачать Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
