import React, { useState } from "react";
import { format, startOfYear, endOfYear } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
import { FileText, Download, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CompensationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OperatorCompensationSummary {
  operatorId: string;
  operatorName: string;
  operatorCode: string;
  workScheduleName: string | null;
  totalAbsenceHours: number;
  totalCompensatedHours: number;
  pendingHours: number;
  completedCount: number;
  pendingCount: number;
  partialCount: number;
}

type PeriodFilter = "current_year" | "all_time" | string; // string for specific years

export const CompensationReportDialog: React.FC<CompensationReportDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const currentYear = new Date().getFullYear();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current_year");

  // Get available years from data
  const { data: availableYears = [] } = useQuery({
    queryKey: ["compensation-available-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence_compensations")
        .select("absence_date")
        .neq("status", "cancelled")
        .order("absence_date", { ascending: true });

      if (error) throw error;

      const years = new Set<number>();
      data?.forEach((item) => {
        const year = new Date(item.absence_date).getFullYear();
        years.add(year);
      });

      return Array.from(years).sort((a, b) => b - a);
    },
    enabled: open,
  });

  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ["compensation-report", periodFilter],
    queryFn: async () => {
      // Build date filter based on period
      let dateFilter: { from?: string; to?: string } = {};
      
      if (periodFilter === "current_year") {
        dateFilter = {
          from: `${currentYear}-01-01`,
          to: `${currentYear}-12-31`,
        };
      } else if (periodFilter !== "all_time") {
        // Specific year
        const year = parseInt(periodFilter);
        dateFilter = {
          from: `${year}-01-01`,
          to: `${year}-12-31`,
        };
      }
      // all_time = no filter

      // Fetch all compensations with operator info
      let query = supabase
        .from("absence_compensations")
        .select(`
          id,
          operator_id,
          absence_date,
          absence_hours,
          status,
          compensation_records (
            hours_worked
          ),
          operators!inner (
            id,
            full_name,
            code,
            work_schedules (
              name
            )
          )
        `)
        .neq("status", "cancelled");

      if (dateFilter.from) {
        query = query.gte("absence_date", dateFilter.from);
      }
      if (dateFilter.to) {
        query = query.lte("absence_date", dateFilter.to);
      }

      const { data: compensations, error } = await query;

      if (error) throw error;

      // Group by operator
      const operatorMap = new Map<string, OperatorCompensationSummary>();

      compensations?.forEach((comp: any) => {
        const operatorId = comp.operator_id;
        const operator = comp.operators;

        if (!operatorMap.has(operatorId)) {
          operatorMap.set(operatorId, {
            operatorId,
            operatorName: operator.full_name,
            operatorCode: operator.code,
            workScheduleName: operator.work_schedules?.name || null,
            totalAbsenceHours: 0,
            totalCompensatedHours: 0,
            pendingHours: 0,
            completedCount: 0,
            pendingCount: 0,
            partialCount: 0,
          });
        }

        const summary = operatorMap.get(operatorId)!;
        const absenceHours = Number(comp.absence_hours);
        const compensatedHours = comp.compensation_records?.reduce(
          (sum: number, r: any) => sum + Number(r.hours_worked),
          0
        ) || 0;

        summary.totalAbsenceHours += absenceHours;
        summary.totalCompensatedHours += compensatedHours;
        summary.pendingHours += Math.max(0, absenceHours - compensatedHours);

        if (comp.status === "completed") {
          summary.completedCount++;
        } else if (comp.status === "partial") {
          summary.partialCount++;
        } else if (comp.status === "pending") {
          summary.pendingCount++;
        }
      });

      // Convert to array and sort by pending hours descending
      return Array.from(operatorMap.values()).sort(
        (a, b) => b.pendingHours - a.pendingHours
      );
    },
    enabled: open,
  });

  const totalPendingHours = reportData.reduce((sum, r) => sum + r.pendingHours, 0);
  const totalCompensatedHours = reportData.reduce((sum, r) => sum + r.totalCompensatedHours, 0);
  const totalAbsenceHours = reportData.reduce((sum, r) => sum + r.totalAbsenceHours, 0);

  const handleExportCSV = () => {
    const periodLabel = periodFilter === "current_year" 
      ? currentYear.toString() 
      : periodFilter === "all_time" 
        ? "all-time" 
        : periodFilter;
    
    const headers = [
      "Код",
      "ФИО",
      "График",
      "Всего часов отсутствия",
      "Отработано часов",
      "Осталось отработать",
      "Выполнено",
      "Частично",
      "Ожидает",
    ];

    const rows = reportData.map((r) => [
      r.operatorCode,
      r.operatorName,
      r.workScheduleName || "",
      r.totalAbsenceHours.toString(),
      r.totalCompensatedHours.toString(),
      r.pendingHours.toString(),
      r.completedCount.toString(),
      r.partialCount.toString(),
      r.pendingCount.toString(),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compensation-report-${periodLabel}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPeriodLabel = () => {
    if (periodFilter === "current_year") return `${currentYear} год (текущий)`;
    if (periodFilter === "all_time") return "За всё время";
    return `${periodFilter} год`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Отчёт по отработкам
          </DialogTitle>
        </DialogHeader>

        {/* Period filter - moved outside DialogHeader to avoid conflict with close button */}
        <div className="flex items-center gap-2 -mt-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Период:</span>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-popover">
              <SelectItem value="current_year">{currentYear} (текущий)</SelectItem>
              {availableYears
                .filter((y) => y !== currentYear)
                .map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} год
                  </SelectItem>
                ))}
              <SelectItem value="all_time">За всё время</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Всего к отработке</span>
            </div>
            <div className="text-2xl font-bold">{totalAbsenceHours}ч</div>
          </div>
          <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Отработано</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalCompensatedHours}ч
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Осталось</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalPendingHours}ч
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalAbsenceHours > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Общий прогресс отработки</span>
              <span>{Math.round((totalCompensatedHours / totalAbsenceHours) * 100)}%</span>
            </div>
            <Progress value={(totalCompensatedHours / totalAbsenceHours) * 100} />
          </div>
        )}

        {/* Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>ФИО</TableHead>
                <TableHead>График</TableHead>
                <TableHead className="text-right">Всего (ч)</TableHead>
                <TableHead className="text-right">Отработано</TableHead>
                <TableHead className="text-right">Осталось</TableHead>
                <TableHead className="text-center">Прогресс</TableHead>
                <TableHead className="text-center">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Нет данных по отработкам
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => {
                  const progress =
                    row.totalAbsenceHours > 0
                      ? Math.round((row.totalCompensatedHours / row.totalAbsenceHours) * 100)
                      : 0;

                  return (
                    <TableRow key={row.operatorId}>
                      <TableCell className="font-mono text-sm">{row.operatorCode}</TableCell>
                      <TableCell className="font-medium">{row.operatorName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.workScheduleName || "—"}
                      </TableCell>
                      <TableCell className="text-right">{row.totalAbsenceHours}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {row.totalCompensatedHours}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium">
                        {row.pendingHours}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          {row.completedCount > 0 && (
                            <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                              {row.completedCount}
                            </Badge>
                          )}
                          {row.partialCount > 0 && (
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                              {row.partialCount}
                            </Badge>
                          )}
                          {row.pendingCount > 0 && (
                            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                              {row.pendingCount}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleExportCSV} disabled={reportData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
