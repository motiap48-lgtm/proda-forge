import { useState, useRef } from "react";
import { useProductionOutputReport, DailyOutput, DailyOutputItem } from "@/hooks/useProductionOutputReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";

interface ProductionOutputReportProps {
  startDate?: string;
  endDate?: string;
}

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
  const { data, isLoading } = useProductionOutputReport(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Выпуск_за_период_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportExcel = () => {
    if (!data?.dailyOutputs) return;

    const wb = XLSX.utils.book_new();

    // Info sheet
    const infoData = [
      ["Отчёт", "Выпуск продукции за период"],
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
    const detailRows: any[][] = [
      ["Дата", "Код продукта", "Наименование", "Тип", "Количество", "Ед.", "Участок", "Цех", "Номера заказов"]
    ];

    data.dailyOutputs.forEach(day => {
      day.items.forEach(item => {
        detailRows.push([
          format(parseISO(day.date), "dd.MM.yyyy"),
          item.product_code,
          item.product_name,
          item.product_type === 'finished' ? 'ГП' : 
            item.product_type === 'assembly' ? 'СБ' : 
            item.product_type === 'semi-finished' ? 'ПФ' : 'МАТ',
          item.completed_quantity,
          item.unit,
          item.work_center_name,
          item.department || '',
          item.order_numbers.join(', '),
        ]);
      });
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Выпуск по дням");

    XLSX.writeFile(wb, `Выпуск_продукции_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data?.dailyOutputs) {
      setExpandedDates(new Set(data.dailyOutputs.map(d => d.date)));
    }
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  // Filter data by search
  const filteredData = data?.dailyOutputs?.map(day => ({
    ...day,
    items: day.items.filter(item => 
      !searchQuery.trim() ||
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.work_center_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(day => day.items.length > 0) || [];

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
          <div className="flex items-center justify-between">
            <CardTitle>Выпуск по дням</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Развернуть все
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
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
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по продукту или участку..."
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

          {/* Daily output list */}
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных о выпуске за выбранный период
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((day) => (
                <Collapsible
                  key={day.date}
                  open={expandedDates.has(day.date)}
                  onOpenChange={() => toggleDate(day.date)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                          expandedDates.has(day.date) ? '' : '-rotate-90'
                        }`} />
                        <span className="font-medium">
                          {format(parseISO(day.date), "d MMMM yyyy, EEEE", { locale: ru })}
                        </span>
                        <Badge variant="secondary">
                          {day.items.length} поз.
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-primary">
                          Σ {day.totalQuantity.toFixed(1)}
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
                          <TableHead>Тип</TableHead>
                          <TableHead className="text-right">Количество</TableHead>
                          <TableHead>Участок</TableHead>
                          <TableHead>Заказы</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {day.items.map((item, idx) => (
                          <TableRow key={`${item.product_id}-${idx}`}>
                            <TableCell className="font-mono text-sm">
                              {item.product_code}
                            </TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{getProductTypeBadge(item.product_type)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.completed_quantity.toFixed(2)} {item.unit}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{item.work_center_name}</div>
                                {item.department && (
                                  <div className="text-muted-foreground text-xs">{item.department}</div>
                                )}
                              </div>
                            </TableCell>
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

          {filteredData.map((day) => (
            <div key={day.date} className="mb-6">
              <h3 className="font-bold border-b pb-2 mb-2">
                {format(parseISO(day.date), "d MMMM yyyy, EEEE", { locale: ru })}
                <span className="float-right">Σ {day.totalQuantity.toFixed(1)}</span>
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Код</th>
                    <th className="text-left py-1">Наименование</th>
                    <th className="text-center py-1">Тип</th>
                    <th className="text-right py-1">Кол-во</th>
                    <th className="text-left py-1">Участок</th>
                  </tr>
                </thead>
                <tbody>
                  {day.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1">{item.product_code}</td>
                      <td className="py-1">{item.product_name}</td>
                      <td className="text-center py-1">
                        {item.product_type === 'finished' ? 'ГП' : 
                          item.product_type === 'assembly' ? 'СБ' : 'ПФ'}
                      </td>
                      <td className="text-right py-1">{item.completed_quantity.toFixed(2)} {item.unit}</td>
                      <td className="py-1">{item.work_center_name}</td>
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
