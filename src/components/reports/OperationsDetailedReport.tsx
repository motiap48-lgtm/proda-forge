import { useState, useRef, useEffect } from "react";
import { useOperationsDetailedReport, WorkCenterOperationsData, OperationDetailedItem } from "@/hooks/useOperationsDetailedReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Search,
  X,
  FileSpreadsheet,
  Printer,
  Factory,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface OperationsDetailedReportProps {
  startDate?: string;
  endDate?: string;
}

type SortField = 'order_number' | 'sequence' | 'operation_name' | 'product_name' | 'planned_quantity' | 'completed_quantity' | 'deviation' | 'status';
type SortDirection = 'asc' | 'desc';

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="text-xs">Ожидание</Badge>;
    case "in_progress":
      return <Badge variant="default" className="text-xs">В работе</Badge>;
    case "completed":
      return <Badge variant="outline" className="text-xs">Завершено</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "pending":
      return "Ожидание";
    case "in_progress":
      return "В работе";
    case "completed":
      return "Завершено";
    default:
      return status;
  }
};

const getStatusSortOrder = (status: string): number => {
  switch (status) {
    case "pending": return 0;
    case "in_progress": return 1;
    case "completed": return 2;
    default: return 3;
  }
};

export const OperationsDetailedReport = ({ startDate, endDate }: OperationsDetailedReportProps) => {
  const { data: reports, isLoading } = useOperationsDetailedReport(startDate, endDate);
  const [expandedWorkCenters, setExpandedWorkCenters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('operationsReport_searchQuery') || "";
  });
  const [sortField, setSortField] = useState<SortField>(() => {
    return (localStorage.getItem('operationsReport_sortField') as SortField) || 'sequence';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    return (localStorage.getItem('operationsReport_sortDirection') as SortDirection) || 'asc';
  });
  const [printWorkCenterId, setPrintWorkCenterId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('operationsReport_searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('operationsReport_sortField', sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem('operationsReport_sortDirection', sortDirection);
  }, [sortDirection]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_операциям_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handlePrintAll = () => {
    setPrintWorkCenterId(null);
    setTimeout(() => handlePrint(), 100);
  };

  const handlePrintWorkCenter = (wcId: string) => {
    setPrintWorkCenterId(wcId);
    setTimeout(() => handlePrint(), 100);
  };

  const handleExportExcel = (workCenterId?: string) => {
    if (!reports) return;

    const dataToExport = workCenterId 
      ? reports.filter(wc => wc.work_center_id === workCenterId)
      : reports;

    const workCenterName = workCenterId 
      ? reports.find(wc => wc.work_center_id === workCenterId)?.work_center_name || ''
      : '';

    const wb = XLSX.utils.book_new();

    // Operations sheet
    const operationsData: any[] = [];
    dataToExport.forEach(wc => {
      wc.operations.forEach(op => {
        operationsData.push({
          "Цех": wc.department,
          "Участок": wc.work_center_name,
          "Код участка": wc.work_center_code,
          "Заказ": op.order_number,
          "№ оп.": op.sequence,
          "Операция": op.operation_name,
          "Изделие": op.product_name,
          "Код изделия": op.product_code,
          "Тип": op.product_type === 'finished' ? 'ГП' : 
                 op.product_type === 'assembly' ? 'СБ' : 
                 op.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
          "План": op.planned_quantity,
          "Факт": op.completed_quantity,
          "Откл.": op.deviation,
          "Откл. %": op.deviation_percent.toFixed(1),
          "Статус": getStatusLabel(op.status),
          "Наладка план (мин)": op.setup_time_planned,
          "Наладка факт (мин)": op.setup_time_actual || '',
          "Цикл план (мин)": op.cycle_time_planned,
          "Цикл факт (мин)": op.cycle_time_actual || '',
        });
      });
    });

    const wsOps = XLSX.utils.json_to_sheet(operationsData);
    XLSX.utils.book_append_sheet(wb, wsOps, "Операции");

    // Summary sheet
    const summaryData = dataToExport.map(wc => ({
      "Цех": wc.department,
      "Участок": wc.work_center_name,
      "Код участка": wc.work_center_code,
      "Кол-во операций": wc.operations.length,
      "План (сумма)": wc.total_planned,
      "Факт (сумма)": wc.total_completed,
      "Откл.": wc.total_deviation,
      "Выполнение %": wc.completion_percent.toFixed(1),
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "По участкам");

    const fileName = workCenterId 
      ? `Отчет_по_операциям_${workCenterName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      : `Отчет_по_операциям_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const toggleWorkCenter = (wcId: string) => {
    setExpandedWorkCenters(prev => {
      const next = new Set(prev);
      if (next.has(wcId)) {
        next.delete(wcId);
      } else {
        next.add(wcId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (reports) {
      setExpandedWorkCenters(new Set(reports.map(wc => wc.work_center_id)));
    }
  };

  const collapseAll = () => {
    setExpandedWorkCenters(new Set());
  };

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Sort operations
  const sortOperations = (operations: OperationDetailedItem[]) => {
    return [...operations].sort((a, b) => {
      let compareResult = 0;
      
      switch (sortField) {
        case 'order_number':
          compareResult = a.order_number.localeCompare(b.order_number);
          break;
        case 'sequence':
          compareResult = a.sequence - b.sequence;
          break;
        case 'operation_name':
          compareResult = a.operation_name.localeCompare(b.operation_name, 'ru');
          break;
        case 'product_name':
          compareResult = a.product_name.localeCompare(b.product_name, 'ru');
          break;
        case 'planned_quantity':
          compareResult = a.planned_quantity - b.planned_quantity;
          break;
        case 'completed_quantity':
          compareResult = a.completed_quantity - b.completed_quantity;
          break;
        case 'deviation':
          compareResult = a.deviation - b.deviation;
          break;
        case 'status':
          compareResult = getStatusSortOrder(a.status) - getStatusSortOrder(b.status);
          break;
      }
      
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  };

  // Filter reports
  const filteredReports = reports?.map(wc => {
    if (!searchQuery.trim()) return wc;
    
    const query = searchQuery.toLowerCase();
    const matchesWc = wc.work_center_name.toLowerCase().includes(query) ||
                      wc.work_center_code.toLowerCase().includes(query) ||
                      (wc.department && wc.department.toLowerCase().includes(query));
    
    if (matchesWc) return wc;
    
    const filteredOps = wc.operations.filter(op =>
      op.operation_name.toLowerCase().includes(query) ||
      op.product_name.toLowerCase().includes(query) ||
      op.product_code.toLowerCase().includes(query) ||
      op.order_number.toLowerCase().includes(query)
    );
    
    if (filteredOps.length === 0) return null;
    return { ...wc, operations: filteredOps };
  }).filter((wc): wc is WorkCenterOperationsData => wc !== null) || [];

  // Calculate totals
  const totals = filteredReports.reduce((acc, wc) => ({
    operations: acc.operations + wc.operations.length,
    planned: acc.planned + wc.total_planned,
    completed: acc.completed + wc.total_completed,
  }), { operations: 0, planned: 0, completed: 0 });

  // Get data to print
  const printData = printWorkCenterId 
    ? filteredReports.filter(wc => wc.work_center_id === printWorkCenterId)
    : filteredReports;

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Участков</p>
            </div>
            <p className="text-2xl font-bold">{filteredReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Операций</p>
            </div>
            <p className="text-2xl font-bold">{totals.operations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">План (сумма)</p>
            </div>
            <p className="text-2xl font-bold">{totals.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Факт (сумма)</p>
            </div>
            <p className="text-2xl font-bold">{totals.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по операции, изделию, заказу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          <ChevronsDown className="h-4 w-4 mr-1" />
          Развернуть
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <ChevronsUp className="h-4 w-4 mr-1" />
          Свернуть
        </Button>
        
        {/* Excel dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={() => handleExportExcel()}>
              Все участки
            </DropdownMenuItem>
            {filteredReports.length > 0 && <DropdownMenuSeparator />}
            {filteredReports.map((wc) => (
              <DropdownMenuItem key={wc.work_center_id} onClick={() => handleExportExcel(wc.work_center_id)}>
                {wc.work_center_name} ({wc.work_center_code})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Print dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" />
              Печать
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={handlePrintAll}>
              Все участки
            </DropdownMenuItem>
            {filteredReports.length > 0 && <DropdownMenuSeparator />}
            {filteredReports.map((wc) => (
              <DropdownMenuItem key={wc.work_center_id} onClick={() => handlePrintWorkCenter(wc.work_center_id)}>
                {wc.work_center_name} ({wc.work_center_code})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Work center sections */}
      <div className="space-y-3">
        {filteredReports.map((wc) => (
          <Collapsible
            key={wc.work_center_id}
            open={expandedWorkCenters.has(wc.work_center_id)}
            onOpenChange={() => toggleWorkCenter(wc.work_center_id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedWorkCenters.has(wc.work_center_id) ? 'rotate-180' : ''}`} />
                      <div>
                        <CardTitle className="text-base">
                          {wc.work_center_name}
                          <span className="text-muted-foreground font-normal ml-2 text-sm">
                            ({wc.work_center_code})
                          </span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{wc.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{wc.operations.length} операций</p>
                        <p className="text-xs text-muted-foreground">
                          Факт: {wc.total_completed} / {wc.total_planned}
                        </p>
                      </div>
                      <div className="w-24">
                        <Progress value={wc.completion_percent} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {wc.completion_percent.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="w-[120px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('order_number')}
                        >
                          <div className="flex items-center">
                            Заказ
                            {getSortIcon('order_number')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-[50px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('sequence')}
                        >
                          <div className="flex items-center">
                            №
                            {getSortIcon('sequence')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('operation_name')}
                        >
                          <div className="flex items-center">
                            Операция
                            {getSortIcon('operation_name')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('product_name')}
                        >
                          <div className="flex items-center">
                            Изделие
                            {getSortIcon('product_name')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right w-[80px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('planned_quantity')}
                        >
                          <div className="flex items-center justify-end">
                            План
                            {getSortIcon('planned_quantity')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right w-[80px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('completed_quantity')}
                        >
                          <div className="flex items-center justify-end">
                            Факт
                            {getSortIcon('completed_quantity')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right w-[80px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('deviation')}
                        >
                          <div className="flex items-center justify-end">
                            Откл.
                            {getSortIcon('deviation')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-[100px] cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center">
                            Статус
                            {getSortIcon('status')}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortOperations(wc.operations).map((op) => (
                        <TableRow key={op.operation_id}>
                          <TableCell className="font-mono text-xs">{op.order_number}</TableCell>
                          <TableCell className="text-center">{op.sequence}</TableCell>
                          <TableCell className="font-medium">{op.operation_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getProductTypeBadge(op.product_type)}
                              <span className="text-sm">{op.product_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{op.planned_quantity}</TableCell>
                          <TableCell className="text-right">{op.completed_quantity}</TableCell>
                          <TableCell className={`text-right ${op.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {op.deviation > 0 ? '+' : ''}{op.deviation}
                          </TableCell>
                          <TableCell>{getStatusBadge(op.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery ? "Ничего не найдено" : "Нет данных по операциям"}
          </CardContent>
        </Card>
      )}

      {/* Print view */}
      <div className="hidden">
        <div ref={printRef} className="p-8">
          <h1 className="text-2xl font-bold mb-2">
            Отчёт по операциям
            {printWorkCenterId && printData.length > 0 && (
              <span className="font-normal text-lg ml-2">
                — {printData[0].work_center_name}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Период: {startDate || 'не указано'} — {endDate || 'не указано'}
          </p>
          
          {printData.map((wc) => (
            <div key={wc.work_center_id} className="mb-8 break-inside-avoid">
              <h2 className="text-lg font-semibold mb-2">
                {wc.department} / {wc.work_center_name} ({wc.work_center_code})
              </h2>
              <p className="text-sm mb-3">
                Операций: {wc.operations.length} | Факт: {wc.total_completed} / {wc.total_planned} ({wc.completion_percent.toFixed(0)}%)
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2">Заказ</th>
                    <th className="text-left py-1 px-2">№</th>
                    <th className="text-left py-1 px-2">Операция</th>
                    <th className="text-left py-1 px-2">Изделие</th>
                    <th className="text-right py-1 px-2">План</th>
                    <th className="text-right py-1 px-2">Факт</th>
                    <th className="text-right py-1 px-2">Откл.</th>
                    <th className="text-left py-1 px-2">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {sortOperations(wc.operations).map((op) => (
                    <tr key={op.operation_id} className="border-b border-gray-200">
                      <td className="py-1 px-2 font-mono text-xs">{op.order_number}</td>
                      <td className="py-1 px-2">{op.sequence}</td>
                      <td className="py-1 px-2">{op.operation_name}</td>
                      <td className="py-1 px-2">{op.product_code} - {op.product_name}</td>
                      <td className="py-1 px-2 text-right">{op.planned_quantity}</td>
                      <td className="py-1 px-2 text-right">{op.completed_quantity}</td>
                      <td className="py-1 px-2 text-right">{op.deviation}</td>
                      <td className="py-1 px-2">{getStatusLabel(op.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
