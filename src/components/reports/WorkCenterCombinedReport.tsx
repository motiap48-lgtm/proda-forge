import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  FileSpreadsheet,
  Printer,
  Search,
  X,
  ArrowUpDown,
  Factory,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkCenterReports, WorkCenterReportData, WorkCenterProductItem } from "@/hooks/useWorkCenterReports";
import { useOperationsDetailedReport, WorkCenterOperationsData, OperationDetailedItem } from "@/hooks/useOperationsDetailedReport";
import { exportWorkCenterReportsToExcel, sortProductsByField } from "@/components/reports/WorkCenterReportExport";
import { WorkCenterReportPrintView } from "@/components/reports/WorkCenterReportPrintView";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import XLSX from "@/lib/excel";

interface WorkCenterCombinedReportProps {
  startDate?: string;
  endDate?: string;
}

type ViewMode = 'products' | 'operations';
type SortField = 'name' | 'code' | 'type' | 'planned' | 'completed' | 'deviation';
type OpSortField = 'order_number' | 'sequence' | 'operation_name' | 'product_name' | 'planned_quantity' | 'completed_quantity' | 'deviation' | 'status';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  completed: { label: "Завершен", variant: "default" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

const getProductTypeBadge = (type: string) => {
  switch (type) {
    case "material":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">МАТ</Badge>;
    case "semi-finished":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>;
    case "assembly":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>;
    case "finished":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>;
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
    case "pending": return "Ожидание";
    case "in_progress": return "В работе";
    case "completed": return "Завершено";
    default: return status;
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

export const WorkCenterCombinedReport = ({ startDate, endDate }: WorkCenterCombinedReportProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('workCenterViewMode') as ViewMode) || 'products';
  });
  const [expandedWorkCenters, setExpandedWorkCenters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedProductTypes, setExpandedProductTypes] = useState<Set<string>>(new Set(['finished', 'assembly', 'semi-finished']));
  
  // Operations mode state
  const [opSortField, setOpSortField] = useState<OpSortField>('sequence');
  const [opSortDirection, setOpSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [workCenterFilter, setWorkCenterFilter] = useState('all');
  
  const printRef = useRef<HTMLDivElement>(null);
  const [printWorkCenterId, setPrintWorkCenterId] = useState<string | undefined>(undefined);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Fetch data
  const { data: workCenterReports, isLoading: wcLoading } = useWorkCenterReports(startDate, endDate);
  const { data: operationsReports, isLoading: opsLoading } = useOperationsDetailedReport(startDate, endDate);

  const isLoading = viewMode === 'products' ? wcLoading : opsLoading;

  // Save view mode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('workCenterViewMode', mode);
  };

  // Products view helpers
  const filterReportsBySearch = (reports: WorkCenterReportData[]): WorkCenterReportData[] => {
    if (!searchQuery.trim()) return reports;
    
    const query = searchQuery.toLowerCase().trim();
    
    return reports.map(report => {
      const matchesWorkCenter = 
        report.work_center_name.toLowerCase().includes(query) ||
        report.work_center_code.toLowerCase().includes(query) ||
        (report.department && report.department.toLowerCase().includes(query));
      
      const filteredProducts = report.products?.filter(product => 
        product.product_name.toLowerCase().includes(query) ||
        product.product_code.toLowerCase().includes(query)
      ) || [];
      
      if (matchesWorkCenter) {
        return report;
      } else if (filteredProducts.length > 0) {
        return { ...report, products: filteredProducts };
      }
      return null;
    }).filter((r): r is WorkCenterReportData => r !== null);
  };

  const filteredWorkCenterReports = workCenterReports ? filterReportsBySearch(workCenterReports) : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortProducts = (products: WorkCenterProductItem[]) => {
    return sortProductsByField(products, sortField, sortDirection);
  };

  const groupProductsByType = (products: WorkCenterProductItem[]) => {
    const sorted = sortProducts(products);
    return {
      finished: sorted.filter(p => p.product_type === 'finished'),
      assembly: sorted.filter(p => p.product_type === 'assembly'),
      'semi-finished': sorted.filter(p => p.product_type === 'semi-finished'),
    };
  };

  // Operations view helpers
  const { departments, workCenters } = useMemo(() => {
    const depts = new Set<string>();
    const wcs: { id: string; name: string; code: string; department: string | null }[] = [];
    
    operationsReports?.forEach(wc => {
      if (wc.department) depts.add(wc.department);
      wcs.push({
        id: wc.work_center_id,
        name: wc.work_center_name,
        code: wc.work_center_code,
        department: wc.department
      });
    });
    
    return {
      departments: Array.from(depts).sort((a, b) => a.localeCompare(b, 'ru')),
      workCenters: wcs.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    };
  }, [operationsReports]);

  const filteredWorkCentersOptions = useMemo(() => {
    if (departmentFilter === 'all') return workCenters;
    return workCenters.filter(wc => wc.department === departmentFilter);
  }, [workCenters, departmentFilter]);

  const handleOpSort = (field: OpSortField) => {
    if (opSortField === field) {
      setOpSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOpSortField(field);
      setOpSortDirection('asc');
    }
  };

  const getOpSortIcon = (field: OpSortField) => {
    if (opSortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return opSortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortOperations = (operations: OperationDetailedItem[]) => {
    return [...operations].sort((a, b) => {
      let compareResult = 0;
      
      switch (opSortField) {
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
      
      return opSortDirection === 'asc' ? compareResult : -compareResult;
    });
  };

  const filteredOperationsReports = operationsReports?.map(wc => {
    if (departmentFilter !== 'all' && wc.department !== departmentFilter) return null;
    if (workCenterFilter !== 'all' && wc.work_center_id !== workCenterFilter) return null;
    
    let filteredOps = statusFilter === 'all' 
      ? wc.operations 
      : wc.operations.filter(op => op.status === statusFilter);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesWc = wc.work_center_name.toLowerCase().includes(query) ||
                        wc.work_center_code.toLowerCase().includes(query) ||
                        (wc.department && wc.department.toLowerCase().includes(query));
      
      if (!matchesWc) {
        filteredOps = filteredOps.filter(op =>
          op.operation_name.toLowerCase().includes(query) ||
          op.product_name.toLowerCase().includes(query) ||
          op.product_code.toLowerCase().includes(query) ||
          op.order_number.toLowerCase().includes(query)
        );
      }
    }
    
    if (filteredOps.length === 0) return null;
    
    const total_planned = filteredOps.reduce((sum, op) => sum + op.planned_quantity, 0);
    const total_completed = filteredOps.reduce((sum, op) => sum + op.completed_quantity, 0);
    const total_deviation = total_completed - total_planned;
    const completion_percent = total_planned > 0 ? (total_completed / total_planned) * 100 : 0;
    
    return { ...wc, operations: filteredOps, total_planned, total_completed, total_deviation, completion_percent };
  }).filter((wc): wc is WorkCenterOperationsData => wc !== null) || [];

  const operationsTotals = filteredOperationsReports.reduce((acc, wc) => ({
    operations: acc.operations + wc.operations.length,
    planned: acc.planned + wc.total_planned,
    completed: acc.completed + wc.total_completed,
  }), { operations: 0, planned: 0, completed: 0 });

  // Print and export handlers
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_цехам_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportExcel = () => {
    if (viewMode === 'products' && workCenterReports) {
      exportWorkCenterReportsToExcel(workCenterReports, startDate, endDate);
    } else if (viewMode === 'operations' && operationsReports) {
      const wb = XLSX.utils.book_new();
      const operationsData: any[] = [];
      filteredOperationsReports.forEach(wc => {
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
            "Тип": op.product_type === 'finished' ? 'ГП' : op.product_type === 'assembly' ? 'СБ' : op.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
            "План": op.planned_quantity,
            "Факт": op.completed_quantity,
            "Откл.": op.deviation,
            "Статус": getStatusLabel(op.status),
          });
        });
      });
      const wsOps = XLSX.utils.json_to_sheet(operationsData);
      XLSX.utils.book_append_sheet(wb, wsOps, "Операции");
      XLSX.writeFile(wb, `Отчет_по_операциям_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
  };

  const expandAll = () => {
    if (viewMode === 'products' && workCenterReports) {
      setExpandedWorkCenters(new Set(workCenterReports.map(r => r.work_center_id)));
    } else if (viewMode === 'operations' && operationsReports) {
      setExpandedWorkCenters(new Set(operationsReports.map(r => r.work_center_id)));
    }
  };

  const collapseAll = () => {
    setExpandedWorkCenters(new Set());
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || departmentFilter !== 'all' || workCenterFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setWorkCenterFilter('all');
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Hidden print view */}
      <div className="hidden">
        <WorkCenterReportPrintView
          ref={printRef}
          reports={workCenterReports || []}
          singleWorkCenterId={printWorkCenterId}
          startDate={startDate}
          endDate={endDate}
          orientation={printOrientation}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                Отчет по цехам и производственным участкам
              </CardTitle>
              <CardDescription>
                {viewMode === 'products' 
                  ? 'Выполнение плана по цехам и участкам с полной разузловкой' 
                  : 'Детализация операций по производственным участкам'}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* View mode toggle */}
              <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="products" className="gap-1.5 text-xs">
                    <Layers className="h-3.5 w-3.5" />
                    По продукции
                  </TabsTrigger>
                  <TabsTrigger value="operations" className="gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    По операциям
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>

              {viewMode === 'products' && workCenterReports && workCenterReports.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-1" />
                      Печать
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setPrintWorkCenterId(undefined);
                      setTimeout(() => handlePrint(), 100);
                    }}>
                      Все участки
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {workCenterReports.map(report => (
                      <DropdownMenuItem 
                        key={report.work_center_id}
                        onClick={() => {
                          setPrintWorkCenterId(report.work_center_id);
                          setTimeout(() => handlePrint(), 100);
                        }}
                      >
                        {report.work_center_name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" size="sm" onClick={expandAll}>
                <ChevronsDown className="h-4 w-4 mr-1" />
                Развернуть
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <ChevronsUp className="h-4 w-4 mr-1" />
                Свернуть
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={viewMode === 'products' ? "Поиск по цеху, участку или продукции..." : "Поиск по операции, изделию, заказу..."}
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

            {viewMode === 'operations' && (
              <>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="pending">Ожидание</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="completed">Завершено</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Цех" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все цеха</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={workCenterFilter} onValueChange={setWorkCenterFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Участок" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все участки</SelectItem>
                    {filteredWorkCentersOptions.map(wc => (
                      <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {/* Summary cards for operations mode */}
          {viewMode === 'operations' && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Участков</p>
                  </div>
                  <p className="text-2xl font-bold">{filteredOperationsReports.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Операций</p>
                  </div>
                  <p className="text-2xl font-bold">{operationsTotals.operations}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">План (сумма)</p>
                  </div>
                  <p className="text-2xl font-bold">{operationsTotals.planned}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-muted-foreground">Факт (сумма)</p>
                  </div>
                  <p className="text-2xl font-bold">{operationsTotals.completed}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products view */}
          {viewMode === 'products' && (
            filteredWorkCenterReports.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const departmentGroups = filteredWorkCenterReports.reduce((acc, report) => {
                    const dept = report.department || 'Без цеха';
                    if (!acc[dept]) acc[dept] = [];
                    acc[dept].push(report);
                    return acc;
                  }, {} as Record<string, WorkCenterReportData[]>);
                  
                  const sortedDepts = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b, "ru"));
                  
                  return sortedDepts.map((department) => {
                    const reports = departmentGroups[department];
                    reports.sort((a, b) => a.work_center_name.localeCompare(b.work_center_name, "ru"));
                    
                    const deptTotalPlanned = reports.reduce((s, r) => s + r.total_planned, 0);
                    const deptTotalCompleted = reports.reduce((s, r) => s + r.total_completed, 0);
                    const deptCompletionPercent = deptTotalPlanned > 0 ? (deptTotalCompleted / deptTotalPlanned) * 100 : 0;
                    
                    return (
                      <div key={department} className="space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Factory className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{department}</h3>
                              <p className="text-sm text-muted-foreground">
                                Участков: {reports.length} | Заказов: {reports.reduce((s, r) => s + r.items.length, 0)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">План</p>
                                <p className="font-semibold">{deptTotalPlanned}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Факт</p>
                                <p className="font-semibold">{deptTotalCompleted}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Выполнение</p>
                                <p className={`font-bold ${deptCompletionPercent >= 100 ? 'text-green-600' : deptCompletionPercent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {deptCompletionPercent.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pl-4">
                          {reports.map((report) => {
                            const isExpanded = expandedWorkCenters.has(report.work_center_id);
                            return (
                              <Collapsible 
                                key={report.work_center_id} 
                                open={isExpanded}
                                onOpenChange={(open) => {
                                  setExpandedWorkCenters(prev => {
                                    const next = new Set(prev);
                                    if (open) next.add(report.work_center_id);
                                    else next.delete(report.work_center_id);
                                    return next;
                                  });
                                }}
                              >
                                <Card className="border-2 border-l-4 border-l-primary">
                                  <CollapsibleTrigger asChild>
                                    <CardHeader className="bg-muted/50 py-3 cursor-pointer hover:bg-muted/70 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                          <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                              <Building2 className="h-4 w-4" />
                                              {report.work_center_name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                              Код: {report.work_center_code} | Продукция: {report.products?.length || 0} | Заказов: {report.items.length}
                                            </CardDescription>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">План</p>
                                            <p className="font-semibold">{report.total_planned}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Факт</p>
                                            <p className="font-semibold">{report.total_completed}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Отклонение</p>
                                            <p className={`font-semibold ${report.total_deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {report.total_deviation > 0 ? '+' : ''}{report.total_deviation}
                                            </p>
                                          </div>
                                          <div className="w-24">
                                            <p className="text-xs text-muted-foreground mb-1">Выполнение</p>
                                            <div className="flex items-center gap-2">
                                              <Progress value={Math.min(report.completion_percent, 100)} className="h-2" />
                                              <span className={`text-xs font-bold ${report.completion_percent >= 100 ? 'text-green-600' : report.completion_percent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {report.completion_percent.toFixed(0)}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <CardContent className="pt-3 pb-3 space-y-4">
                                      {report.products && report.products.length > 0 && (
                                        <div className="space-y-4">
                                          {(() => {
                                            const grouped = groupProductsByType(report.products);
                                            const typeLabels = {
                                              finished: { label: 'Готовая продукция', color: 'bg-blue-50 border-blue-200' },
                                              assembly: { label: 'Сборочные узлы', color: 'bg-purple-50 border-purple-200' },
                                              'semi-finished': { label: 'Полуфабрикаты', color: 'bg-orange-50 border-orange-200' },
                                            };
                                            
                                            return Object.entries(grouped).map(([type, products]) => {
                                              if (products.length === 0) return null;
                                              const typeConfig = typeLabels[type as keyof typeof typeLabels];
                                              
                                              return (
                                                <div key={type} className={`border rounded-lg ${typeConfig.color}`}>
                                                  <div className="px-3 py-2 font-medium text-sm border-b">{typeConfig.label} ({products.length})</div>
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow>
                                                        <TableHead>Продукция</TableHead>
                                                        <TableHead className="text-right w-20">План</TableHead>
                                                        <TableHead className="text-right w-20">Факт</TableHead>
                                                        <TableHead className="text-right w-20">Откл.</TableHead>
                                                        <TableHead className="text-right w-20">%</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {products.map((product, idx) => (
                                                        <TableRow key={`${product.product_code}-${idx}`}>
                                                          <TableCell>
                                                            <div className="flex items-center gap-2">
                                                              {getProductTypeBadge(product.product_type)}
                                                              <div>
                                                                <p className="font-medium text-sm">{product.product_name}</p>
                                                                <p className="text-xs text-muted-foreground">{product.product_code}</p>
                                                              </div>
                                                            </div>
                                                          </TableCell>
                                                          <TableCell className="text-right">{product.planned_quantity}</TableCell>
                                                          <TableCell className="text-right">{product.completed_quantity}</TableCell>
                                                        <TableCell className={`text-right ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {product.deviation > 0 ? '+' : ''}{product.deviation}
                                                          </TableCell>
                                                          <TableCell className={`text-right ${(() => {
                                                            const pct = product.planned_quantity > 0 ? (product.completed_quantity / product.planned_quantity) * 100 : 0;
                                                            return pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600';
                                                          })()}`}>
                                                            {product.planned_quantity > 0 ? ((product.completed_quantity / product.planned_quantity) * 100).toFixed(0) : 0}%
                                                          </TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      )}
                                    </CardContent>
                                  </CollapsibleContent>
                                </Card>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? <p>По запросу "{searchQuery}" ничего не найдено</p> : <p>Нет данных для отображения</p>}
              </div>
            )
          )}

          {/* Operations view */}
          {viewMode === 'operations' && (
            filteredOperationsReports.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const departmentGroups = filteredOperationsReports.reduce((acc, report) => {
                    const dept = report.department || 'Без цеха';
                    if (!acc[dept]) acc[dept] = [];
                    acc[dept].push(report);
                    return acc;
                  }, {} as Record<string, WorkCenterOperationsData[]>);
                  
                  const sortedDepts = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b, "ru"));
                  
                  return sortedDepts.map((department) => {
                    const reports = departmentGroups[department];
                    reports.sort((a, b) => a.work_center_name.localeCompare(b.work_center_name, "ru"));
                    
                    const deptTotalOps = reports.reduce((s, r) => s + r.operations.length, 0);
                    const deptTotalPlanned = reports.reduce((s, r) => s + r.total_planned, 0);
                    const deptTotalCompleted = reports.reduce((s, r) => s + r.total_completed, 0);
                    const deptCompletionPercent = deptTotalPlanned > 0 ? (deptTotalCompleted / deptTotalPlanned) * 100 : 0;
                    
                    return (
                      <div key={department} className="space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Factory className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{department}</h3>
                              <p className="text-sm text-muted-foreground">
                                Участков: {reports.length} | Операций: {deptTotalOps}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">План</p>
                                <p className="font-semibold">{deptTotalPlanned}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Факт</p>
                                <p className="font-semibold">{deptTotalCompleted}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Выполнение</p>
                                <p className={`font-bold ${deptCompletionPercent >= 100 ? 'text-green-600' : deptCompletionPercent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {deptCompletionPercent.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pl-4">
                          {reports.map((report) => {
                            const isExpanded = expandedWorkCenters.has(report.work_center_id);
                            return (
                              <Collapsible 
                                key={report.work_center_id} 
                                open={isExpanded}
                                onOpenChange={(open) => {
                                  setExpandedWorkCenters(prev => {
                                    const next = new Set(prev);
                                    if (open) next.add(report.work_center_id);
                                    else next.delete(report.work_center_id);
                                    return next;
                                  });
                                }}
                              >
                                <Card className="border-2 border-l-4 border-l-primary">
                                  <CollapsibleTrigger asChild>
                                    <CardHeader className="bg-muted/50 py-3 cursor-pointer hover:bg-muted/70 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                          <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                              <Building2 className="h-4 w-4" />
                                              {report.work_center_name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                              Код: {report.work_center_code} | Операций: {report.operations.length}
                                            </CardDescription>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">План</p>
                                            <p className="font-semibold">{report.total_planned}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Факт</p>
                                            <p className="font-semibold">{report.total_completed}</p>
                                          </div>
                                          <div className="w-24">
                                            <p className="text-xs text-muted-foreground mb-1">Выполнение</p>
                                            <div className="flex items-center gap-2">
                                              <Progress value={Math.min(report.completion_percent, 100)} className="h-2" />
                                              <span className={`text-xs font-bold ${report.completion_percent >= 100 ? 'text-green-600' : report.completion_percent >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {report.completion_percent.toFixed(0)}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <CardContent className="pt-3 pb-3">
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="cursor-pointer" onClick={() => handleOpSort('order_number')}>
                                                <span className="flex items-center">Заказ{getOpSortIcon('order_number')}</span>
                                              </TableHead>
                                              <TableHead className="cursor-pointer w-12" onClick={() => handleOpSort('sequence')}>
                                                <span className="flex items-center">№{getOpSortIcon('sequence')}</span>
                                              </TableHead>
                                              <TableHead className="cursor-pointer" onClick={() => handleOpSort('operation_name')}>
                                                <span className="flex items-center">Операция{getOpSortIcon('operation_name')}</span>
                                              </TableHead>
                                              <TableHead className="cursor-pointer" onClick={() => handleOpSort('product_name')}>
                                                <span className="flex items-center">Изделие{getOpSortIcon('product_name')}</span>
                                              </TableHead>
                                              <TableHead className="text-right cursor-pointer" onClick={() => handleOpSort('planned_quantity')}>
                                                <span className="flex items-center justify-end">План{getOpSortIcon('planned_quantity')}</span>
                                              </TableHead>
                                              <TableHead className="text-right cursor-pointer" onClick={() => handleOpSort('completed_quantity')}>
                                                <span className="flex items-center justify-end">Факт{getOpSortIcon('completed_quantity')}</span>
                                              </TableHead>
                                              <TableHead className="text-right cursor-pointer" onClick={() => handleOpSort('deviation')}>
                                                <span className="flex items-center justify-end">Откл.{getOpSortIcon('deviation')}</span>
                                              </TableHead>
                                              <TableHead className="cursor-pointer" onClick={() => handleOpSort('status')}>
                                                <span className="flex items-center">Статус{getOpSortIcon('status')}</span>
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {sortOperations(report.operations).map((op, idx) => (
                                              <TableRow key={`${op.order_number}-${op.sequence}-${idx}`}>
                                                <TableCell className="font-medium">{op.order_number}</TableCell>
                                                <TableCell>{op.sequence}</TableCell>
                                                <TableCell>{op.operation_name}</TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    {getProductTypeBadge(op.product_type)}
                                                    <div>
                                                      <p className="font-medium text-sm">{op.product_name}</p>
                                                      <p className="text-xs text-muted-foreground">{op.product_code}</p>
                                                    </div>
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
                                      </div>
                                    </CardContent>
                                  </CollapsibleContent>
                                </Card>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? <p>По запросу "{searchQuery}" ничего не найдено</p> : <p>Нет данных для отображения</p>}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
