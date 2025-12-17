import { useState, useRef, useMemo } from "react";
import { useProductionOutputReport, DailyOutput, DailyOutputItem, OutputReportMode, PlanFactData } from "@/hooks/useProductionOutputReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileSpreadsheet, 
  Printer, 
  ChevronDown, 
  Search, 
  X,
  Package,
  Calendar,
  Layers,
  Building2,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ProductionOutputReportProps {
  startDate?: string;
  endDate?: string;
}

type GroupingMode = 'by_date' | 'by_department' | 'by_work_center' | 'by_operation_type';
type ReportTab = 'output' | 'plan_fact';

const getOperationTypeBadge = (type: string | undefined) => {
  switch (type) {
    case "production":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Производство</Badge>;
    case "transport":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Транспортировка</Badge>;
    case "control":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Контроль</Badge>;
    case "setup":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Наладка</Badge>;
    default:
      return null;
  }
};

const getOperationTypeLabel = (type: string | undefined) => {
  switch (type) {
    case "production": return "Производство";
    case "transport": return "Транспортировка";
    case "control": return "Контроль";
    case "setup": return "Наладка";
    default: return "Прочее";
  }
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

export const ProductionOutputReport = ({ startDate, endDate }: ProductionOutputReportProps) => {
  const [reportMode, setReportMode] = useState<OutputReportMode>('finished_products');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('by_date');
  const [reportTab, setReportTab] = useState<ReportTab>('output');
  const { data, isLoading } = useProductionOutputReport(startDate, endDate, reportMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Выпуск_за_период_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  // Filter data by search
  const filteredData = useMemo(() => {
    return data?.dailyOutputs?.map(day => ({
      ...day,
      items: day.items.filter(item => 
        !searchQuery.trim() ||
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.work_center_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.operation_name && item.operation_name.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    })).filter(day => day.items.length > 0) || [];
  }, [data?.dailyOutputs, searchQuery]);

  // Group data based on grouping mode
  const groupedData = useMemo(() => {
    if (groupingMode === 'by_date') {
      return filteredData.map(day => ({
        key: day.date,
        label: format(parseISO(day.date), "d MMMM yyyy, EEEE", { locale: ru }),
        items: day.items,
        totalQuantity: day.totalQuantity,
      }));
    }

    const allItems = filteredData.flatMap(day => 
      day.items.map(item => ({ ...item, date: day.date }))
    );

    if (groupingMode === 'by_operation_type') {
      const byOpType = new Map<string, { items: (DailyOutputItem & { date: string })[], total: number }>();
      
      allItems.forEach(item => {
        const opType = item.operation_type || 'other';
        if (!byOpType.has(opType)) {
          byOpType.set(opType, { items: [], total: 0 });
        }
        const group = byOpType.get(opType)!;
        group.items.push(item);
        group.total += item.completed_quantity;
      });

      const typeOrder = ['production', 'transport', 'control', 'setup', 'other'];
      return Array.from(byOpType.entries())
        .sort((a, b) => typeOrder.indexOf(a[0]) - typeOrder.indexOf(b[0]))
        .map(([opType, data]) => ({
          key: opType,
          label: getOperationTypeLabel(opType),
          items: data.items,
          totalQuantity: data.total,
          operationType: opType,
        }));
    }

    if (groupingMode === 'by_department') {
      const byDept = new Map<string, { items: (DailyOutputItem & { date: string })[], total: number }>();
      
      allItems.forEach(item => {
        const dept = item.department || 'Без цеха';
        if (!byDept.has(dept)) {
          byDept.set(dept, { items: [], total: 0 });
        }
        const group = byDept.get(dept)!;
        group.items.push(item);
        group.total += item.completed_quantity;
      });

      return Array.from(byDept.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
        .map(([dept, data]) => ({
          key: dept,
          label: dept,
          items: data.items,
          totalQuantity: data.total,
        }));
    }

    const byWC = new Map<string, { items: (DailyOutputItem & { date: string })[], total: number, department: string | null }>();
    
    allItems.forEach(item => {
      const wcKey = item.work_center_id || 'none';
      if (!byWC.has(wcKey)) {
        byWC.set(wcKey, { items: [], total: 0, department: item.department });
      }
      const group = byWC.get(wcKey)!;
      group.items.push(item);
      group.total += item.completed_quantity;
    });

    return Array.from(byWC.entries())
      .sort((a, b) => {
        const deptA = a[1].department || '';
        const deptB = b[1].department || '';
        if (deptA !== deptB) return deptA.localeCompare(deptB, 'ru');
        return (a[1].items[0]?.work_center_name || '').localeCompare(b[1].items[0]?.work_center_name || '', 'ru');
      })
      .map(([wcId, data]) => ({
        key: wcId,
        label: data.items[0]?.work_center_name || 'Без участка',
        subLabel: data.department,
        items: data.items,
        totalQuantity: data.total,
      }));
  }, [filteredData, groupingMode]);

  // Chart data for plan/fact
  const chartData = useMemo(() => {
    return data?.planFactData?.map(item => ({
      ...item,
      dateLabel: format(parseISO(item.date), "dd.MM", { locale: ru }),
    })) || [];
  }, [data?.planFactData]);

  const handleExportExcel = () => {
    if (!data?.dailyOutputs) return;

    const wb = XLSX.utils.book_new();

    const modeLabel = reportMode === 'finished_products' ? 'Готовые изделия' : 'Все операции';
    const infoData = [
      ["Отчёт", "Выпуск продукции за период"],
      ["Режим", modeLabel],
      ["Период", `${startDate || 'Начало'} - ${endDate || 'Конец'}`],
      ["Дата формирования", format(new Date(), "dd.MM.yyyy HH:mm")],
      [],
      ["Всего дней с выпуском", data.summary.totalDays],
      ["Всего позиций", data.summary.totalItems],
      ["Общий объём выпуска", data.summary.totalQuantity],
      [],
      ["По типам продукции:"],
      ["ГП (готовая продукция)", data.summary.byProductType.finished],
      ["СБ (сборочные узлы)", data.summary.byProductType.assembly],
      ["ПФ (полуфабрикаты)", data.summary.byProductType['semi-finished']],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Информация");

    const detailRows: any[][] = reportMode === 'all_operations' 
      ? [["Дата", "Код продукта", "Наименование", "Операция", "Тип", "Количество", "Ед.", "Участок", "Цех", "Номера заказов"]]
      : [["Дата", "Код продукта", "Наименование", "Тип", "Количество", "Ед.", "Участок", "Цех", "Номера заказов"]];

    data.dailyOutputs.forEach(day => {
      day.items.forEach(item => {
        const row = [
          format(parseISO(day.date), "dd.MM.yyyy"),
          item.product_code,
          item.product_name,
        ];
        
        if (reportMode === 'all_operations') {
          row.push(item.operation_name || '');
        }
        
        row.push(
          item.product_type === 'finished' ? 'ГП' : 
            item.product_type === 'assembly' ? 'СБ' : 
            item.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
          String(item.completed_quantity),
          item.unit,
          item.work_center_name,
          item.department || '',
          item.order_numbers.join(', ')
        );
        
        detailRows.push(row);
      });
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Выпуск по дням");

    const wcRows: any[][] = [["Цех", "Участок", "Код продукта", "Наименование", "Тип", "Количество"]];
    const allItems = data.dailyOutputs.flatMap(d => d.items);
    
    const byWC = new Map<string, { items: DailyOutputItem[], dept: string | null }>();
    allItems.forEach(item => {
      const key = item.work_center_id || 'none';
      if (!byWC.has(key)) {
        byWC.set(key, { items: [], dept: item.department });
      }
      byWC.get(key)!.items.push(item);
    });

    byWC.forEach((wcData) => {
      const byProduct = new Map<string, { item: DailyOutputItem, qty: number }>();
      wcData.items.forEach(item => {
        const key = item.product_id;
        if (!byProduct.has(key)) {
          byProduct.set(key, { item, qty: 0 });
        }
        byProduct.get(key)!.qty += item.completed_quantity;
      });

      byProduct.forEach(({ item, qty }) => {
        wcRows.push([
          wcData.dept || '',
          item.work_center_name,
          item.product_code,
          item.product_name,
          item.product_type === 'finished' ? 'ГП' : 
            item.product_type === 'assembly' ? 'СБ' : 
            item.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
          qty,
        ]);
      });
    });

    const wsWC = XLSX.utils.aoa_to_sheet(wcRows);
    XLSX.utils.book_append_sheet(wb, wsWC, "По участкам");

    XLSX.writeFile(wb, `Выпуск_продукции_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Export summary report for management
  const handleExportManagementSummary = () => {
    if (!data?.departmentSummaries || !data?.planFactSummary) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["СВОДНЫЙ ОТЧЁТ ВЫПУСКА ПО ЦЕХАМ"],
      ["Для руководства"],
      [],
      ["Период", `${startDate || 'Начало'} - ${endDate || 'Конец'}`],
      ["Дата формирования", format(new Date(), "dd.MM.yyyy HH:mm")],
      [],
      ["ОБЩИЕ ПОКАЗАТЕЛИ"],
      ["План за период", data.planFactSummary.totalPlanned],
      ["Факт за период", data.planFactSummary.totalActual],
      ["Отклонение", data.planFactSummary.totalDeviation],
      ["Выполнение, %", `${data.planFactSummary.deviationPercent >= 0 ? '+' : ''}${data.planFactSummary.deviationPercent.toFixed(1)}%`],
      [],
      ["ВЫПУСК ПО ТИПАМ ПРОДУКЦИИ"],
      ["ГП (готовая продукция)", data.summary.byProductType.finished],
      ["СБ (сборочные узлы)", data.summary.byProductType.assembly],
      ["ПФ (полуфабрикаты)", data.summary.byProductType['semi-finished']],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Сводка");

    // Department details
    const deptRows: any[][] = [
      ["Цех", "Участок", "ГП", "СБ", "ПФ", "Итого"],
    ];
    
    data.departmentSummaries.forEach(dept => {
      // Department header row
      deptRows.push([
        dept.department,
        "",
        dept.byProductType.finished,
        dept.byProductType.assembly,
        dept.byProductType['semi-finished'],
        dept.totalQuantity,
      ]);
      
      // Work centers under department
      dept.workCenters.forEach(wc => {
        deptRows.push([
          "",
          wc.name,
          wc.byProductType.finished,
          wc.byProductType.assembly,
          wc.byProductType['semi-finished'],
          wc.totalQuantity,
        ]);
      });
    });

    // Grand total
    deptRows.push([
      "ИТОГО",
      "",
      data.summary.byProductType.finished,
      data.summary.byProductType.assembly,
      data.summary.byProductType['semi-finished'],
      data.summary.totalQuantity,
    ]);

    const wsDept = XLSX.utils.aoa_to_sheet(deptRows);
    wsDept['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsDept, "По цехам");

    // Plan/Fact by department
    const pfRows: any[][] = [
      ["Цех", "План", "Факт", "Отклонение", "Выполнение %"],
    ];
    
    data.planFactSummary.byDepartment.forEach(dept => {
      pfRows.push([
        dept.department,
        dept.planned,
        dept.actual,
        dept.deviation,
        `${dept.deviationPercent >= 0 ? '+' : ''}${dept.deviationPercent.toFixed(1)}%`,
      ]);
    });

    pfRows.push([
      "ИТОГО",
      data.planFactSummary.totalPlanned,
      data.planFactSummary.totalActual,
      data.planFactSummary.totalDeviation,
      `${data.planFactSummary.deviationPercent >= 0 ? '+' : ''}${data.planFactSummary.deviationPercent.toFixed(1)}%`,
    ]);

    const wsPF = XLSX.utils.aoa_to_sheet(pfRows);
    wsPF['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsPF, "План-Факт по цехам");

    // Daily plan/fact
    const dailyRows: any[][] = [
      ["Дата", "План", "Факт", "Отклонение", "Выполнение %"],
    ];
    
    data.planFactData?.forEach(day => {
      dailyRows.push([
        format(parseISO(day.date), "dd.MM.yyyy"),
        day.planned,
        day.actual,
        day.deviation,
        `${day.deviationPercent >= 0 ? '+' : ''}${day.deviationPercent.toFixed(1)}%`,
      ]);
    });

    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    wsDaily['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDaily, "План-Факт по дням");

    XLSX.writeFile(wb, `Сводный_отчёт_руководству_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedData.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  // Calculate operation type summary
  const operationTypeSummary = useMemo(() => {
    const summary = { production: 0, transport: 0, control: 0, setup: 0, other: 0 };
    const allItems = filteredData.flatMap(day => day.items);
    allItems.forEach(item => {
      const type = item.operation_type || 'other';
      if (type === 'production') summary.production += item.completed_quantity;
      else if (type === 'transport') summary.transport += item.completed_quantity;
      else if (type === 'control') summary.control += item.completed_quantity;
      else if (type === 'setup') summary.setup += item.completed_quantity;
      else summary.other += item.completed_quantity;
    });
    return summary;
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дней с выпуском</p>
                  <p className="text-2xl font-bold">{data.summary.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ГП выпущено</p>
                  <p className="text-2xl font-bold">{data.summary.byProductType.finished}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">СБ выпущено</p>
                  <p className="text-2xl font-bold">{data.summary.byProductType.assembly}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ПФ выпущено</p>
                  <p className="text-2xl font-bold">{data.summary.byProductType['semi-finished']}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operation Type Summary - only show in all_operations mode */}
      {reportMode === 'all_operations' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Сводка по типам операций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="p-2 rounded-full bg-blue-100">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">Производство</p>
                  <p className="text-xl font-bold text-blue-700">{operationTypeSummary.production}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="p-2 rounded-full bg-amber-100">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">Транспортировка</p>
                  <p className="text-xl font-bold text-amber-700">{operationTypeSummary.transport}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="p-2 rounded-full bg-green-100">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium">Контроль</p>
                  <p className="text-xl font-bold text-green-700">{operationTypeSummary.control}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="p-2 rounded-full bg-purple-100">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-medium">Наладка</p>
                  <p className="text-xl font-bold text-purple-700">{operationTypeSummary.setup}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Tabs */}
      <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as ReportTab)}>
        <TabsList>
          <TabsTrigger value="output" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Выпуск по дням
          </TabsTrigger>
          <TabsTrigger value="plan_fact" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            План/Факт
          </TabsTrigger>
        </TabsList>

        <TabsContent value="output" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Выпуск по дням</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={expandAll}
                    disabled={expandedGroups.size === groupedData.length && groupedData.length > 0}
                  >
                    Развернуть все
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={collapseAll}
                    disabled={expandedGroups.size === 0}
                  >
                    Свернуть все
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportManagementSummary}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Сводный для руководства
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Печать
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters row */}
              <div className="flex flex-col gap-4 mb-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по продукту, участку или операции..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Select value={reportMode} onValueChange={(v) => setReportMode(v as OutputReportMode)}>
                  <SelectTrigger className="w-[200px]">
                    <Layers className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finished_products">Готовые изделия</SelectItem>
                    <SelectItem value="all_operations">Все операции</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupingMode} onValueChange={(v) => setGroupingMode(v as GroupingMode)}>
                  <SelectTrigger className="w-[200px]">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_date">По датам</SelectItem>
                    <SelectItem value="by_department">По цехам</SelectItem>
                    <SelectItem value="by_work_center">По участкам</SelectItem>
                    {reportMode === 'all_operations' && (
                      <SelectItem value="by_operation_type">По типу операции</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                {reportMode === 'finished_products' ? (
                  <span>
                    <strong>Готовые изделия:</strong> учитывается только выпуск по последней операции маршрута (когда изделие полностью готово)
                  </span>
                ) : (
                  <span>
                    <strong>Все операции:</strong> детализация выпуска по каждой операции для анализа производительности
                  </span>
                )}
              </div>

              {groupedData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет данных о выпуске за выбранный период
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedData.map((group) => (
                    <Collapsible
                      key={group.key}
                      open={expandedGroups.has(group.key)}
                      onOpenChange={() => toggleGroup(group.key)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group">
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                              expandedGroups.has(group.key) ? '' : '-rotate-90'
                            }`} />
                            <div>
                              <span className="font-medium">{group.label}</span>
                              {'subLabel' in group && (group as any).subLabel && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {(group as any).subLabel}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {group.items.length} поз.
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-primary">
                              Σ {group.totalQuantity.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Код</TableHead>
                              <TableHead>Наименование</TableHead>
                              {reportMode === 'all_operations' && (
                                <TableHead>Операция</TableHead>
                              )}
                              <TableHead>Тип</TableHead>
                              <TableHead className="text-right">Количество</TableHead>
                              {groupingMode === 'by_date' && <TableHead>Участок</TableHead>}
                              {groupingMode !== 'by_date' && <TableHead>Дата</TableHead>}
                              <TableHead>Заказы</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, idx) => (
                              <TableRow key={`${item.product_id}-${idx}`}>
                                <TableCell className="font-mono text-sm">
                                  {item.product_code}
                                </TableCell>
                                <TableCell>{item.product_name}</TableCell>
                                {reportMode === 'all_operations' && (
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      {item.operation_sequence !== undefined && (
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {item.operation_sequence}
                                        </Badge>
                                      )}
                                      <span className="text-muted-foreground">
                                        {item.operation_name || '-'}
                                      </span>
                                      {item.operation_type && getOperationTypeBadge(item.operation_type)}
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell>{getProductTypeBadge(item.product_type)}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.completed_quantity.toFixed(2)} {item.unit}
                                </TableCell>
                                {groupingMode === 'by_date' && (
                                  <TableCell>
                                    <div className="text-sm">
                                      <div>{item.work_center_name}</div>
                                      {item.department && (
                                        <div className="text-muted-foreground text-xs">{item.department}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                                {groupingMode !== 'by_date' && 'date' in item && (
                                  <TableCell className="text-sm">
                                    {format(parseISO((item as any).date), "dd.MM.yyyy")}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {item.order_numbers.slice(0, 3).map(num => (
                                      <Badge key={num} variant="outline" className="text-xs">
                                        {num}
                                      </Badge>
                                    ))}
                                    {item.order_numbers.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{item.order_numbers.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan_fact" className="mt-4 space-y-6">
          {/* Plan/Fact Summary Cards */}
          {data?.planFactSummary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">План</p>
                      <p className="text-2xl font-bold">{data.planFactSummary.totalPlanned.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Факт</p>
                      <p className="text-2xl font-bold">{data.planFactSummary.totalActual.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${data.planFactSummary.totalDeviation >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {data.planFactSummary.totalDeviation >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Отклонение</p>
                      <p className={`text-2xl font-bold ${data.planFactSummary.totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.planFactSummary.totalDeviation >= 0 ? '+' : ''}{data.planFactSummary.totalDeviation.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${data.planFactSummary.deviationPercent >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <BarChart3 className={`h-6 w-6 ${data.planFactSummary.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Выполнение</p>
                      <p className={`text-2xl font-bold ${data.planFactSummary.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.planFactSummary.deviationPercent >= 0 ? '+' : ''}{data.planFactSummary.deviationPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Plan/Fact Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Динамика план/факт по дням</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportManagementSummary}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Экспорт для руководства
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет данных для построения графика
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="dateLabel" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          value.toFixed(0),
                          name === 'planned' ? 'План' : 'Факт'
                        ]}
                        labelFormatter={(label) => `Дата: ${label}`}
                      />
                      <Legend 
                        formatter={(value) => value === 'planned' ? 'План' : 'Факт'}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="planned" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary)/0.2)"
                        strokeWidth={2}
                        name="planned"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="hsl(142 76% 36%)" 
                        fill="hsl(142 76% 36% / 0.3)"
                        strokeWidth={2}
                        name="actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deviation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Отклонения по дням</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет данных для построения графика
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="dateLabel" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [
                          `${value >= 0 ? '+' : ''}${value.toFixed(0)}`,
                          'Отклонение'
                        ]}
                        labelFormatter={(label) => `Дата: ${label}`}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Bar 
                        dataKey="deviation" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan/Fact by Department Table */}
          {data?.planFactSummary && data.planFactSummary.byDepartment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>План/Факт по цехам</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Цех</TableHead>
                      <TableHead className="text-right">План</TableHead>
                      <TableHead className="text-right">Факт</TableHead>
                      <TableHead className="text-right">Отклонение</TableHead>
                      <TableHead className="text-right">Выполнение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.planFactSummary.byDepartment.map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-right">{dept.planned.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{dept.actual.toFixed(0)}</TableCell>
                        <TableCell className={`text-right font-medium ${dept.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {dept.deviation >= 0 ? '+' : ''}{dept.deviation.toFixed(0)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${dept.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {dept.deviationPercent >= 0 ? '+' : ''}{dept.deviationPercent.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>ИТОГО</TableCell>
                      <TableCell className="text-right">{data.planFactSummary.totalPlanned.toFixed(0)}</TableCell>
                      <TableCell className="text-right">{data.planFactSummary.totalActual.toFixed(0)}</TableCell>
                      <TableCell className={`text-right ${data.planFactSummary.totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.planFactSummary.totalDeviation >= 0 ? '+' : ''}{data.planFactSummary.totalDeviation.toFixed(0)}
                      </TableCell>
                      <TableCell className={`text-right ${data.planFactSummary.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.planFactSummary.deviationPercent >= 0 ? '+' : ''}{data.planFactSummary.deviationPercent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Print View (hidden) */}
      <div className="hidden">
        <div ref={printRef} className="p-8 bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Отчёт о выпуске продукции</h1>
            <p className="text-gray-600">
              Режим: {reportMode === 'finished_products' ? 'Готовые изделия' : 'Все операции'}
            </p>
            <p className="text-gray-600">
              Период: {startDate || 'Начало'} - {endDate || 'Конец'}
            </p>
            <p className="text-sm text-gray-500">
              Сформирован: {format(new Date(), "dd.MM.yyyy HH:mm")}
            </p>
          </div>

          {data?.summary && (
            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
              <div className="border p-3">
                <div className="text-lg font-bold">{data.summary.totalDays}</div>
                <div className="text-sm text-gray-600">Дней</div>
              </div>
              <div className="border p-3">
                <div className="text-lg font-bold">{data.summary.byProductType.finished}</div>
                <div className="text-sm text-gray-600">ГП</div>
              </div>
              <div className="border p-3">
                <div className="text-lg font-bold">{data.summary.byProductType.assembly}</div>
                <div className="text-sm text-gray-600">СБ</div>
              </div>
              <div className="border p-3">
                <div className="text-lg font-bold">{data.summary.byProductType['semi-finished']}</div>
                <div className="text-sm text-gray-600">ПФ</div>
              </div>
            </div>
          )}

          {groupedData.map((group) => (
            <div key={group.key} className="mb-6">
              <h3 className="font-bold border-b pb-2 mb-2">
                {group.label}
                {'subLabel' in group && (group as any).subLabel && (
                  <span className="font-normal text-gray-600 ml-2">({(group as any).subLabel})</span>
                )}
                <span className="float-right">Σ {group.totalQuantity.toFixed(1)}</span>
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Код</th>
                    <th className="text-left py-1">Наименование</th>
                    {reportMode === 'all_operations' && <th className="text-left py-1">Операция</th>}
                    <th className="text-center py-1">Тип</th>
                    <th className="text-right py-1">Кол-во</th>
                    <th className="text-left py-1">{groupingMode === 'by_date' ? 'Участок' : 'Дата'}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1">{item.product_code}</td>
                      <td className="py-1">{item.product_name}</td>
                      {reportMode === 'all_operations' && (
                        <td className="py-1">{item.operation_name || '-'}</td>
                      )}
                      <td className="text-center py-1">
                        {item.product_type === 'finished' ? 'ГП' : 
                          item.product_type === 'assembly' ? 'СБ' : 'ПФ'}
                      </td>
                      <td className="text-right py-1">{item.completed_quantity.toFixed(2)} {item.unit}</td>
                      <td className="py-1">
                        {groupingMode === 'by_date' 
                          ? item.work_center_name 
                          : ('date' in item ? format(parseISO((item as any).date), "dd.MM.yyyy") : '')}
                      </td>
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
