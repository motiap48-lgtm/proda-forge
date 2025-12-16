import { useState, useRef, useMemo } from "react";
import { useProductionOutputReport, DailyOutput, DailyOutputItem, OutputReportMode } from "@/hooks/useProductionOutputReport";
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
import { 
  FileSpreadsheet, 
  Printer, 
  ChevronDown, 
  Search, 
  X,
  Package,
  Factory,
  Calendar,
  Layers,
  Building2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";

interface ProductionOutputReportProps {
  startDate?: string;
  endDate?: string;
}

type GroupingMode = 'by_date' | 'by_department' | 'by_work_center';

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

    // Flatten all items for department/work center grouping
    const allItems = filteredData.flatMap(day => 
      day.items.map(item => ({ ...item, date: day.date }))
    );

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

    // by_work_center
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
        // Sort by department first, then by work center name
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

  const handleExportExcel = () => {
    if (!data?.dailyOutputs) return;

    const wb = XLSX.utils.book_new();

    // Info sheet
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

    // Detailed sheet
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

    // By work center sheet
    const wcRows: any[][] = [["Цех", "Участок", "Код продукта", "Наименование", "Тип", "Количество"]];
    const allItems = data.dailyOutputs.flatMap(d => d.items);
    
    // Aggregate by work center
    const byWC = new Map<string, { items: DailyOutputItem[], dept: string | null }>();
    allItems.forEach(item => {
      const key = item.work_center_id || 'none';
      if (!byWC.has(key)) {
        byWC.set(key, { items: [], dept: item.department });
      }
      byWC.get(key)!.items.push(item);
    });

    byWC.forEach((data, wcId) => {
      // Aggregate by product within work center
      const byProduct = new Map<string, { item: DailyOutputItem, qty: number }>();
      data.items.forEach(item => {
        const key = item.product_id;
        if (!byProduct.has(key)) {
          byProduct.set(key, { item, qty: 0 });
        }
        byProduct.get(key)!.qty += item.completed_quantity;
      });

      byProduct.forEach(({ item, qty }) => {
        wcRows.push([
          data.dept || '',
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

      {/* Controls */}
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
            {/* Search */}
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

            {/* Report mode */}
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

            {/* Grouping mode */}
            <Select value={groupingMode} onValueChange={(v) => setGroupingMode(v as GroupingMode)}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="by_date">По датам</SelectItem>
                <SelectItem value="by_department">По цехам</SelectItem>
                <SelectItem value="by_work_center">По участкам</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode description */}
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

          {/* Output list */}
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
                              <TableCell className="text-sm text-muted-foreground">
                                {item.operation_name || '-'}
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
