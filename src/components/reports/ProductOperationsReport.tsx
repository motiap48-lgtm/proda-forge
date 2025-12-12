import { useState, useRef, useMemo } from "react";
import { useProductOperationsReport, ProductReportItem } from "@/hooks/useProductOperationsReport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Package,
  Search,
  X,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Factory,
  Building2,
  ArrowRight,
  Wrench,
  Truck,
  ClipboardCheck,
  Settings,
  ExternalLink,
  FileSpreadsheet,
  Printer,
  Filter,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";

type GroupingMode = 'type' | 'department';

interface ProductOperationsReportProps {
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

const getProductTypeLabel = (type: string) => {
  switch (type) {
    case "material": return "МАТ";
    case "semi-finished": return "ПФ";
    case "assembly": return "СБ";
    case "finished": return "ГП";
    default: return type;
  }
};

const getProductTypeFullLabel = (type: string) => {
  switch (type) {
    case "finished": return "Готовая продукция";
    case "assembly": return "Сборочные узлы";
    case "semi-finished": return "Полуфабрикаты";
    default: return type;
  }
};

const getOperationTypeIcon = (type: string) => {
  switch (type) {
    case "production":
      return <Wrench className="h-3 w-3" />;
    case "transport":
      return <Truck className="h-3 w-3" />;
    case "control":
      return <ClipboardCheck className="h-3 w-3" />;
    case "setup":
      return <Settings className="h-3 w-3" />;
    default:
      return <Wrench className="h-3 w-3" />;
  }
};

const getOperationTypeLabel = (type: string) => {
  switch (type) {
    case "production": return "Производство";
    case "transport": return "Транспортировка";
    case "control": return "Контроль";
    case "setup": return "Наладка";
    default: return type;
  }
};

// Компонент для печати
const ProductOperationsPrintView = ({ 
  products, 
  startDate, 
  endDate 
}: { 
  products: ProductReportItem[]; 
  startDate?: string; 
  endDate?: string;
}) => {
  const groupedProducts = {
    finished: products.filter(p => p.product_type === 'finished'),
    assembly: products.filter(p => p.product_type === 'assembly'),
    'semi-finished': products.filter(p => p.product_type === 'semi-finished'),
  };

  return (
    <div className="p-8 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          ОТЧЕТ ПО ИЗДЕЛИЯМ
        </h1>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Прослеживание изделий по операциям, участкам и цехам
        </p>
        <p style={{ fontSize: '11px', color: '#999' }}>
          {startDate || endDate 
            ? `Период: ${startDate || '—'} — ${endDate || '—'}`
            : 'Период: Все время'}
          {' | '}
          Дата формирования: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}
        </p>
      </div>

      <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Сводка по типам продукции</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Тип</th>
              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Изделий</th>
              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Операций</th>
              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Цехов</th>
              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Участков</th>
            </tr>
          </thead>
          <tbody>
            {(['finished', 'assembly', 'semi-finished'] as const).map(type => {
              const typeProducts = groupedProducts[type];
              const totalOps = typeProducts.reduce((s, p) => s + p.operations.length, 0);
              const allDepts = new Set(typeProducts.flatMap(p => p.departments));
              const allWCs = new Set(typeProducts.flatMap(p => p.work_centers));
              
              return (
                <tr key={type}>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                    {getProductTypeFullLabel(type)} ({getProductTypeLabel(type)})
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{typeProducts.length}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{totalOps}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{allDepts.size}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{allWCs.size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(['finished', 'assembly', 'semi-finished'] as const).map(type => {
        const typeProducts = groupedProducts[type];
        if (typeProducts.length === 0) return null;

        return (
          <div key={type} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', backgroundColor: '#e5e7eb', padding: '8px' }}>
              {getProductTypeFullLabel(type)} ({typeProducts.length})
            </h2>

            {typeProducts.map(product => (
              <div key={product.product_id} style={{ marginBottom: '16px', border: '1px solid #ddd', padding: '12px' }}>
                <div style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{product.product_name}</span>
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>({product.product_code})</span>
                      {product.routing_sheet_code && (
                        <span style={{ marginLeft: '12px', fontSize: '11px', color: '#888' }}>
                          Маршрут: {product.routing_sheet_code}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', textAlign: 'right' }}>
                      <div>План: <strong>{product.planned_quantity}</strong></div>
                      <div>Факт: <strong>{product.completed_quantity}</strong></div>
                      <div style={{ 
                        color: product.deviation > 0 ? '#16a34a' : product.deviation < 0 ? '#dc2626' : '#666',
                        fontWeight: 'bold'
                      }}>
                        Откл: {product.deviation > 0 ? '+' : ''}{product.deviation}
                        {product.planned_quantity > 0 && (
                          <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                            ({product.deviation_percent > 0 ? '+' : ''}{product.deviation_percent.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    {product.departments.length > 0 && (
                      <span style={{ marginRight: '16px' }}>
                        <strong>Цехи:</strong> {product.departments.join(', ')}
                      </span>
                    )}
                    {product.work_centers.length > 0 && (
                      <span>
                        <strong>Участки:</strong> {product.work_centers.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {product.operations.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left', width: '30px' }}>№</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Операция</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Тип</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Цех</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Участок</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Тпз</th>
                        <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Тшт</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.operations.map(op => (
                        <tr key={op.operation_id}>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>{op.sequence}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                            {op.operation_name}
                            {op.is_external && op.contractor_name && (
                              <span style={{ fontSize: '9px', color: '#888' }}> (внеш: {op.contractor_name})</span>
                            )}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>{getOperationTypeLabel(op.operation_type)}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>{op.department || '—'}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                            {op.work_center_code} — {op.work_center_name}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{op.setup_time || '—'}</td>
                          <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{op.cycle_time || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>Нет технологического маршрута</p>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ marginTop: '32px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
        <p>ERP Vostok Auto — Отчет по изделиям</p>
      </div>
    </div>
  );
};

// Компонент карточки изделия
const ProductCard = ({ 
  product, 
  isExpanded, 
  onToggle 
}: { 
  product: ProductReportItem; 
  isExpanded: boolean; 
  onToggle: () => void;
}) => (
  <Collapsible open={isExpanded} onOpenChange={onToggle}>
    <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              {getProductTypeBadge(product.product_type)}
              <span className="font-medium">{product.product_name}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono">{product.product_code}</span>
              {product.routing_sheet_code && (
                <>
                  <span>•</span>
                  <span>Маршрут: {product.routing_sheet_code}</span>
                </>
              )}
              {product.departments.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {product.departments.join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {product.operations.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground max-w-md truncate">
              {product.operations
                .filter(op => op.operation_type === 'production')
                .slice(0, 4)
                .map((op, idx, arr) => (
                  <span key={op.operation_id} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {op.work_center_code || op.work_center_name}
                    </Badge>
                    {idx < arr.length - 1 && <ArrowRight className="h-3 w-3" />}
                  </span>
                ))}
              {product.operations.filter(op => op.operation_type === 'production').length > 4 && (
                <span className="text-xs">...</span>
              )}
            </div>
          )}
          <div className="text-right min-w-[120px]">
            <div className="text-xs text-muted-foreground">План: {product.planned_quantity}</div>
            <div className="text-xs text-muted-foreground">Факт: {product.completed_quantity}</div>
            <div className={`text-sm font-medium ${
              product.deviation > 0 
                ? 'text-green-600' 
                : product.deviation < 0 
                  ? 'text-destructive' 
                  : 'text-muted-foreground'
            }`}>
              Откл: {product.deviation > 0 ? '+' : ''}{product.deviation}
              {product.planned_quantity > 0 && (
                <span className="text-xs ml-1">
                  ({product.deviation_percent > 0 ? '+' : ''}{product.deviation_percent.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="px-4 pb-4 pt-2">
        {product.operations.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 mb-3 p-3 bg-muted/30 rounded-lg">
              {product.departments.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Цехи:</span>
                  {product.departments.map(dept => (
                    <Badge key={dept} variant="secondary" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
              )}
              {product.work_centers.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Участки:</span>
                  {product.work_centers.map(wc => (
                    <Badge key={wc} variant="outline" className="text-xs">
                      {wc}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Операция</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Цех</TableHead>
                  <TableHead>Участок</TableHead>
                  <TableHead className="text-right">Тпз, мин</TableHead>
                  <TableHead className="text-right">Тшт, мин</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.operations.map((op) => (
                  <TableRow key={op.operation_id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {op.sequence}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {op.is_external && (
                          <ExternalLink className="h-3 w-3 text-orange-500" />
                        )}
                        <span>{op.operation_name}</span>
                      </div>
                      {op.is_external && op.contractor_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Подрядчик: {op.contractor_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getOperationTypeIcon(op.operation_type)}
                        <span className="text-sm">{getOperationTypeLabel(op.operation_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {op.department ? (
                        <Badge variant="secondary" className="text-xs">
                          {op.department}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs font-mono">
                          {op.work_center_code}
                        </Badge>
                        <span className="text-sm">{op.work_center_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {op.setup_time || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {op.cycle_time || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Нет технологического маршрута для этого изделия
          </div>
        )}
      </div>
    </CollapsibleContent>
  </Collapsible>
);

export const ProductOperationsReport = ({ startDate, endDate }: ProductOperationsReportProps) => {
  const { data: products, isLoading } = useProductOperationsReport(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('type');
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedWorkCenters, setSelectedWorkCenters] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  // Все доступные цехи и участки
  const allAvailableDepartments = useMemo(() => {
    const deps = new Set<string>();
    products?.forEach(p => p.departments.forEach(d => deps.add(d)));
    return Array.from(deps).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [products]);

  const allAvailableWorkCenters = useMemo(() => {
    const wcs = new Set<string>();
    products?.forEach(p => p.work_centers.forEach(wc => wcs.add(wc)));
    return Array.from(wcs).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [products]);

  // Фильтрация по поиску и выбранным фильтрам
  const filteredProducts = useMemo(() => {
    return products?.filter(product => {
      // Поиск
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          product.product_name.toLowerCase().includes(query) ||
          product.product_code.toLowerCase().includes(query) ||
          product.routing_sheet_name.toLowerCase().includes(query) ||
          product.departments.some(d => d.toLowerCase().includes(query)) ||
          product.work_centers.some(wc => wc.toLowerCase().includes(query)) ||
          product.operations.some(op => 
            op.operation_name.toLowerCase().includes(query) ||
            op.work_center_name.toLowerCase().includes(query) ||
            (op.department && op.department.toLowerCase().includes(query))
          );
        if (!matchesSearch) return false;
      }

      // Фильтр по цехам
      if (selectedDepartments.size > 0) {
        const hasMatchingDept = product.departments.some(d => selectedDepartments.has(d));
        if (!hasMatchingDept) return false;
      }

      // Фильтр по участкам
      if (selectedWorkCenters.size > 0) {
        const hasMatchingWC = product.work_centers.some(wc => selectedWorkCenters.has(wc));
        if (!hasMatchingWC) return false;
      }

      return true;
    }) || [];
  }, [products, searchQuery, selectedDepartments, selectedWorkCenters]);

  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProducts(new Set(filteredProducts.map(p => p.product_id)));
  };

  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const toggleWorkCenter = (wc: string) => {
    setSelectedWorkCenters(prev => {
      const next = new Set(prev);
      if (next.has(wc)) {
        next.delete(wc);
      } else {
        next.add(wc);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedDepartments(new Set());
    setSelectedWorkCenters(new Set());
  };

  const hasActiveFilters = selectedDepartments.size > 0 || selectedWorkCenters.size > 0;

  // Экспорт в Excel
  const handleExportExcel = () => {
    if (!filteredProducts || filteredProducts.length === 0) return;

    const wb = XLSX.utils.book_new();

    const summaryData: any[] = [
      ['ОТЧЕТ ПО ИЗДЕЛИЯМ'],
      [startDate || endDate ? `Период: ${startDate || '—'} — ${endDate || '—'}` : 'Период: Все время'],
      ['Дата формирования: ' + format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })],
      [],
      ['Код изделия', 'Наименование', 'Тип', 'Техмаршрут', 'Цехи', 'Участки', 'Операций', 'План', 'Факт', 'Откл.', '%'],
    ];

    filteredProducts.forEach(product => {
      summaryData.push([
        product.product_code,
        product.product_name,
        getProductTypeLabel(product.product_type),
        product.routing_sheet_code || '—',
        product.departments.join(', ') || '—',
        product.work_centers.join(', ') || '—',
        product.operations.length,
        product.planned_quantity,
        product.completed_quantity,
        product.deviation,
        product.deviation_percent.toFixed(1) + '%',
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 15 }, { wch: 35 }, { wch: 8 }, { wch: 15 }, { wch: 25 },
      { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Изделия');

    const operationsData: any[] = [
      ['ОПЕРАЦИИ ПО ИЗДЕЛИЯМ'],
      [],
      ['Код изделия', 'Наименование изделия', 'Тип', '№ оп.', 'Операция', 'Тип операции', 'Цех', 'Код участка', 'Участок', 'Тпз', 'Тшт', 'Внешняя', 'Подрядчик'],
    ];

    filteredProducts.forEach(product => {
      product.operations.forEach(op => {
        operationsData.push([
          product.product_code,
          product.product_name,
          getProductTypeLabel(product.product_type),
          op.sequence,
          op.operation_name,
          getOperationTypeLabel(op.operation_type),
          op.department || '—',
          op.work_center_code,
          op.work_center_name,
          op.setup_time || '—',
          op.cycle_time || '—',
          op.is_external ? 'Да' : 'Нет',
          op.contractor_name || '—',
        ]);
      });
    });

    const operationsSheet = XLSX.utils.aoa_to_sheet(operationsData);
    operationsSheet['!cols'] = [
      { wch: 15 }, { wch: 35 }, { wch: 8 }, { wch: 8 }, { wch: 30 },
      { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 8 },
      { wch: 8 }, { wch: 10 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, operationsSheet, 'Операции');

    const deptData: any[] = [
      ['РАСПРЕДЕЛЕНИЕ ПО ЦЕХАМ И УЧАСТКАМ'],
      [],
      ['Цех', 'Участок', 'Код участка', 'Изделий', 'Операций'],
    ];

    const deptMap = new Map<string, Map<string, { code: string; products: Set<string>; operations: number }>>();
    
    filteredProducts.forEach(product => {
      product.operations.forEach(op => {
        const dept = op.department || 'Без цеха';
        const wcName = op.work_center_name;
        
        if (!deptMap.has(dept)) {
          deptMap.set(dept, new Map());
        }
        const wcMap = deptMap.get(dept)!;
        
        if (!wcMap.has(wcName)) {
          wcMap.set(wcName, { code: op.work_center_code, products: new Set(), operations: 0 });
        }
        const wcData = wcMap.get(wcName)!;
        wcData.products.add(product.product_id);
        wcData.operations++;
      });
    });

    Array.from(deptMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
      .forEach(([dept, wcMap]) => {
        Array.from(wcMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
          .forEach(([wcName, data]) => {
            deptData.push([dept, wcName, data.code, data.products.size, data.operations]);
          });
      });

    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    deptSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, deptSheet, 'По цехам');

    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    XLSX.writeFile(wb, `Отчет_по_изделиям_${dateStr}.xlsx`);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_изделиям_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  // Группировка по типам
  const groupedByType = useMemo(() => ({
    finished: filteredProducts.filter(p => p.product_type === 'finished'),
    assembly: filteredProducts.filter(p => p.product_type === 'assembly'),
    'semi-finished': filteredProducts.filter(p => p.product_type === 'semi-finished'),
  }), [filteredProducts]);

  // Группировка по цехам
  const groupedByDepartment = useMemo(() => {
    const groups: Record<string, ProductReportItem[]> = {};
    filteredProducts.forEach(product => {
      if (product.departments.length === 0) {
        if (!groups['Без цеха']) groups['Без цеха'] = [];
        groups['Без цеха'].push(product);
      } else {
        product.departments.forEach(dept => {
          if (!groups[dept]) groups[dept] = [];
          if (!groups[dept].find(p => p.product_id === product.product_id)) {
            groups[dept].push(product);
          }
        });
      }
    });
    return groups;
  }, [filteredProducts]);

  const typeLabels = {
    finished: { label: 'Готовая продукция', color: 'bg-blue-50 border-blue-200' },
    assembly: { label: 'Сборочные узлы', color: 'bg-purple-50 border-purple-200' },
    'semi-finished': { label: 'Полуфабрикаты', color: 'bg-orange-50 border-orange-200' },
  };

  const allDepartments = new Set(filteredProducts.flatMap(p => p.departments));
  const allWorkCenters = new Set(filteredProducts.flatMap(p => p.work_centers));
  const totalOperations = filteredProducts.reduce((s, p) => s + p.operations.length, 0);

  return (
    <>
      <div className="hidden">
        <div ref={printRef}>
          <ProductOperationsPrintView 
            products={filteredProducts} 
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Отчет по изделиям
              </CardTitle>
              <CardDescription>
                Прослеживание изделий по операциям, участкам и цехам
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8"
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
              
              {/* Фильтр по цехам */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={selectedDepartments.size > 0 ? 'border-primary' : ''}>
                    <Building2 className="h-4 w-4 mr-1" />
                    Цехи
                    {selectedDepartments.size > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selectedDepartments.size}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background">
                  <DropdownMenuLabel>Фильтр по цехам</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allAvailableDepartments.length > 0 ? (
                    allAvailableDepartments.map(dept => (
                      <DropdownMenuCheckboxItem
                        key={dept}
                        checked={selectedDepartments.has(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      >
                        {dept}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Нет цехов</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Фильтр по участкам */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={selectedWorkCenters.size > 0 ? 'border-primary' : ''}>
                    <Factory className="h-4 w-4 mr-1" />
                    Участки
                    {selectedWorkCenters.size > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selectedWorkCenters.size}</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto bg-background">
                  <DropdownMenuLabel>Фильтр по участкам</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allAvailableWorkCenters.length > 0 ? (
                    allAvailableWorkCenters.map(wc => (
                      <DropdownMenuCheckboxItem
                        key={wc}
                        checked={selectedWorkCenters.has(wc)}
                        onCheckedChange={() => toggleWorkCenter(wc)}
                      >
                        {wc}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Нет участков</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Сбросить
                </Button>
              )}
              
              {filteredProducts.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4 mr-1" />
                    Печать
                  </Button>
                </>
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
          
          {/* Переключатель группировки и статистика */}
          <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
            <Tabs value={groupingMode} onValueChange={(v) => setGroupingMode(v as GroupingMode)}>
              <TabsList>
                <TabsTrigger value="type" className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  По типам
                </TabsTrigger>
                <TabsTrigger value="department" className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  По цехам
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredProducts.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Изделий:</span>
                  <Badge variant="secondary">{filteredProducts.length}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Операций:</span>
                  <Badge variant="secondary">{totalOperations}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Цехов:</span>
                  <Badge variant="secondary">{allDepartments.size}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Участков:</span>
                  <Badge variant="secondary">{allWorkCenters.size}</Badge>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : filteredProducts.length > 0 ? (
            <div className="space-y-6">
              {groupingMode === 'type' ? (
                // Группировка по типам
                (['finished', 'assembly', 'semi-finished'] as const).map(type => {
                  const typeProducts = groupedByType[type];
                  if (typeProducts.length === 0) return null;

                  const typeInfo = typeLabels[type];
                  const typeDepts = new Set(typeProducts.flatMap(p => p.departments));
                  const typeWCs = new Set(typeProducts.flatMap(p => p.work_centers));

                  return (
                    <div key={type} className={`rounded-lg border ${typeInfo.color} overflow-hidden`}>
                      <div className="p-3 bg-background/50 border-b flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {getProductTypeBadge(type)}
                          <span className="font-semibold">{typeInfo.label}</span>
                          <Badge variant="secondary">{typeProducts.length}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Цехов: <strong>{typeDepts.size}</strong></span>
                          <span>Участков: <strong>{typeWCs.size}</strong></span>
                        </div>
                      </div>
                      
                      <div className="divide-y">
                        {typeProducts.map(product => (
                          <ProductCard
                            key={product.product_id}
                            product={product}
                            isExpanded={expandedProducts.has(product.product_id)}
                            onToggle={() => toggleProduct(product.product_id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Группировка по цехам
                Object.entries(groupedByDepartment)
                  .sort(([a], [b]) => a.localeCompare(b, 'ru'))
                  .map(([dept, deptProducts]) => {
                    const deptWCs = new Set(deptProducts.flatMap(p => p.work_centers));
                    const deptOps = deptProducts.reduce((s, p) => s + p.operations.filter(op => op.department === dept || (!op.department && dept === 'Без цеха')).length, 0);

                    return (
                      <div key={dept} className="rounded-lg border bg-card overflow-hidden">
                        <div className="p-3 bg-muted/50 border-b flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{dept}</span>
                            <Badge variant="secondary">{deptProducts.length} изд.</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Участков: <strong>{deptWCs.size}</strong></span>
                          </div>
                        </div>
                        
                        <div className="divide-y">
                          {deptProducts.map(product => (
                            <ProductCard
                              key={`${dept}-${product.product_id}`}
                              product={product}
                              isExpanded={expandedProducts.has(product.product_id)}
                              onToggle={() => toggleProduct(product.product_id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchQuery || hasActiveFilters ? (
                <p>По заданным фильтрам ничего не найдено</p>
              ) : (
                <p>Нет данных для отображения</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
