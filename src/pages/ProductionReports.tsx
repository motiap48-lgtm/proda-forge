import { useState, useRef, useEffect, useMemo, Fragment } from "react";
 import { useSearchParams } from "react-router-dom";
 import { useTabPersistence } from "@/hooks/useTabPersistence";
 import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionReports, useProductionSummary } from "@/hooks/useProductionReports";
import { useWorkCenterReports, WorkCenterReportData, WorkCenterProductItem } from "@/hooks/useWorkCenterReports";
import { useActiveCustomers } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Building2, 
  Package, 
  Clock, 
  Factory,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  FileSpreadsheet,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Minimize2,
  Maximize2,
  Filter,
  Users,
  AlertTriangle,
  Layers,
  ListOrdered
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useReactToPrint } from "react-to-print";
import { exportWorkCenterReportsToExcel, sortProductsByField } from "@/components/reports/WorkCenterReportExport";
import { WorkCenterReportPrintView } from "@/components/reports/WorkCenterReportPrintView";
import { ProductOperationsReport } from "@/components/reports/ProductOperationsReport";
import { TimelineAnalytics } from "@/components/reports/TimelineAnalytics";
import { ProductionOutputReport } from "@/components/reports/ProductionOutputReport";
import { WorkCenterCombinedReport } from "@/components/reports/WorkCenterCombinedReport";
import { CustomerReport } from "@/components/reports/CustomerReport";
import { OverdueOrdersReport } from "@/components/reports/OverdueOrdersReport";
import { exportPlanFactToExcel } from "@/components/reports/PlanFactExcelExport";
import { exportPlanFactByOrderToExcel } from "@/components/reports/PlanFactByOrderExcelExport";
import { exportPlanFactAggregatedToExcel } from "@/components/reports/PlanFactAggregatedExcelExport";
import { PlanFactPrintView } from "@/components/reports/PlanFactPrintView";
import { PlanFactByOrderPrintView } from "@/components/reports/PlanFactByOrderPrintView";
import { PlanFactAggregatedPrintView } from "@/components/reports/PlanFactAggregatedPrintView";
import { PlanFactByOrderView } from "@/components/reports/PlanFactByOrderView";
import { PrintPreviewDialog } from "@/components/reports/PrintPreviewDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  planned: { label: "Запланирован", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В работе", variant: "default" as const },
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершен", variant: "default" as const },
  cancelled: { label: "Отменен", variant: "destructive" as const },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

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

const ProductionReportsContent = () => {
   const [activeTab, setActiveTab] = useTabPersistence("plan-fact");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [expandedWorkCenters, setExpandedWorkCenters] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'code' | 'type' | 'planned' | 'completed' | 'deviation'>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [printWorkCenterId, setPrintWorkCenterId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductTypes, setExpandedProductTypes] = useState<Set<string>>(new Set(['finished', 'assembly', 'semi-finished']));
  const [planFactPrintType, setPlanFactPrintType] = useState<'all' | 'finished' | 'assembly' | 'semi-finished'>('all');
  
  // Plan-Fact view mode: aggregated (summary) or by_order (per order)
  const [planFactViewMode, setPlanFactViewMode] = useState<'aggregated' | 'by_order'>(() => {
    return (localStorage.getItem('planFactViewMode') as 'aggregated' | 'by_order') || 'aggregated';
  });
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set()); // For click-to-expand in aggregated mode
  // Customer filter
  const [customerFilter, setCustomerFilter] = useState<string>(() => {
    return localStorage.getItem('reportsCustomerFilter') || 'all';
  });
  // Completion filter for aggregated mode
  const [completionFilter, setCompletionFilter] = useState<'all' | 'not_completed' | 'partially' | 'completed'>(() => {
    const saved = localStorage.getItem('planFactCompletionFilter');
    return (saved as 'all' | 'not_completed' | 'partially' | 'completed') || 'all';
  });
  
  // План-факт фильтры с загрузкой из localStorage
  const [planFactStatusFilter, setPlanFactStatusFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>(() => {
    const saved = localStorage.getItem('planFactStatusFilter');
    return (saved as 'all' | 'planned' | 'in_progress' | 'completed') || 'all';
  });
  const [planFactSortField, setPlanFactSortField] = useState<'order_number' | 'product_name' | 'planned' | 'completed' | 'deviation'>(() => {
    const saved = localStorage.getItem('planFactSortField');
    return (saved as 'order_number' | 'product_name' | 'planned' | 'completed' | 'deviation') || 'order_number';
  });
  const [planFactSortDirection, setPlanFactSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('planFactSortDirection');
    return (saved as 'asc' | 'desc') || 'asc';
  });
  
  // Print orientation
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>(() => {
    const saved = localStorage.getItem('printOrientation');
    return (saved as 'portrait' | 'landscape') || 'landscape';
  });

  // Print preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'work-centers' | 'plan-fact' | 'by-order' | 'aggregated'>('work-centers');
  
  // Aggregated print options
  const [aggregatedProductTypeFilter, setAggregatedProductTypeFilter] = useState<('finished' | 'assembly' | 'semi-finished')[]>([]);
  const [aggregatedShowDetails, setAggregatedShowDetails] = useState(false);

  // Fetch customers
  const { data: customers } = useActiveCustomers();

  // Save customer filter to localStorage
  useEffect(() => {
    localStorage.setItem('reportsCustomerFilter', customerFilter);
  }, [customerFilter]);

  // Сохранение фильтров план-факт в localStorage
  useEffect(() => {
    localStorage.setItem('planFactStatusFilter', planFactStatusFilter);
  }, [planFactStatusFilter]);

  useEffect(() => {
    localStorage.setItem('planFactSortField', planFactSortField);
  }, [planFactSortField]);

  useEffect(() => {
    localStorage.setItem('planFactSortDirection', planFactSortDirection);
  }, [planFactSortDirection]);

  useEffect(() => {
    localStorage.setItem('planFactViewMode', planFactViewMode);
  }, [planFactViewMode]);

  useEffect(() => {
    localStorage.setItem('planFactCompletionFilter', completionFilter);
  }, [completionFilter]);

  useEffect(() => {
    localStorage.setItem('printOrientation', printOrientation);
  }, [printOrientation]);

  const toggleProductType = (type: string) => {
    setExpandedProductTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const expandAllProductTypes = () => {
    setExpandedProductTypes(new Set(['finished', 'assembly', 'semi-finished']));
  };

  const collapseAllProductTypes = () => {
    setExpandedProductTypes(new Set());
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const expandAllOrders = () => {
    const allOrderIds = planFactFilteredReports
      .filter(r => r.product_type === 'finished' && !r.parent_order_id)
      .map(r => r.order_id);
    setExpandedOrders(new Set(allOrderIds));
  };

  const collapseAllOrders = () => {
    setExpandedOrders(new Set());
  };
  const printRef = useRef<HTMLDivElement>(null);
  const planFactPrintRef = useRef<HTMLDivElement>(null);
  const planFactByOrderPrintRef = useRef<HTMLDivElement>(null);
  const planFactAggregatedPrintRef = useRef<HTMLDivElement>(null);

  const { data: reports, isLoading } = useProductionReports(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const { data: summary } = useProductionSummary(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const { data: workCenterReports, isLoading: wcLoading } = useWorkCenterReports(
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined
  );

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Отчет_по_цехам_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handlePlanFactPrint = useReactToPrint({
    contentRef: planFactPrintRef,
    documentTitle: `План-факт_${planFactPrintType}_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handlePlanFactByOrderPrint = useReactToPrint({
    contentRef: planFactByOrderPrintRef,
    documentTitle: `План-факт_по_заказам_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handlePlanFactAggregatedPrint = useReactToPrint({
    contentRef: planFactAggregatedPrintRef,
    documentTitle: `План-факт_суммарно_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const printPlanFact = (type: 'all' | 'finished' | 'assembly' | 'semi-finished') => {
    setPlanFactPrintType(type);
    setPreviewType('plan-fact');
    setPreviewOpen(true);
  };

  const openPrintPreview = (type: 'work-centers' | 'plan-fact' | 'by-order' | 'aggregated') => {
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const handlePreviewPrint = () => {
    switch (previewType) {
      case 'work-centers':
        handlePrint();
        break;
      case 'plan-fact':
        handlePlanFactPrint();
        break;
      case 'by-order':
        handlePlanFactByOrderPrint();
        break;
      case 'aggregated':
        handlePlanFactAggregatedPrint();
        break;
    }
  };

  const getPreviewTitle = () => {
    switch (previewType) {
      case 'work-centers':
        return 'Предпросмотр: Отчет по цехам';
      case 'plan-fact':
        return 'Предпросмотр: План-факт';
      case 'by-order':
        return 'Предпросмотр: План-факт по заказам';
      case 'aggregated': {
        const typeLabels: Record<string, string> = {
          finished: 'ГП',
          assembly: 'СБ',
          'semi-finished': 'ПФ'
        };
        const typeLabel = aggregatedProductTypeFilter.length === 0 || aggregatedProductTypeFilter.length === 3
          ? 'Все типы'
          : aggregatedProductTypeFilter.map(t => typeLabels[t]).join(' + ');
        const detailsLabel = aggregatedShowDetails ? ' с детализацией' : '';
        return `Предпросмотр: ${typeLabel}${detailsLabel}`;
      }
    }
  };

  const toggleExpandedProduct = (productCode: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productCode)) {
        next.delete(productCode);
      } else {
        next.add(productCode);
      }
      return next;
    });
  };

  const expandAllProducts = () => {
    setExpandedProducts(new Set(aggregatedByProduct.map(p => p.product_code)));
  };

  const collapseAllProducts = () => {
    setExpandedProducts(new Set());
  };

  const handleExportExcel = () => {
    if (workCenterReports) {
      exportWorkCenterReportsToExcel(
        workCenterReports,
        startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        endDate ? format(endDate, "yyyy-MM-dd") : undefined
      );
    }
  };

  const handlePlanFactExportExcel = (productTypes?: ('finished' | 'assembly' | 'semi-finished')[]) => {
    if (planFactFilteredReports.length > 0) {
      if (planFactViewMode === 'by_order') {
        exportPlanFactByOrderToExcel(
          planFactFilteredReports,
          startDate ? format(startDate, "yyyy-MM-dd") : undefined,
          endDate ? format(endDate, "yyyy-MM-dd") : undefined
        );
      } else {
        // Aggregated mode - use aggregated export
        exportPlanFactAggregatedToExcel(
          aggregatedByProduct,
          planFactFilteredReports,
          startDate ? format(startDate, "yyyy-MM-dd") : undefined,
          endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          completionFilter,
          productTypes
        );
      }
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
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

  // Фильтрация отчётов по поисковому запросу
  const filterReportsBySearch = (reports: WorkCenterReportData[]): WorkCenterReportData[] => {
    if (!searchQuery.trim()) return reports;
    
    const query = searchQuery.toLowerCase().trim();
    
    return reports.map(report => {
      // Проверяем совпадение по участку или цеху
      const matchesWorkCenter = 
        report.work_center_name.toLowerCase().includes(query) ||
        report.work_center_code.toLowerCase().includes(query) ||
        (report.department && report.department.toLowerCase().includes(query));
      
      // Фильтруем продукцию
      const filteredProducts = report.products?.filter(product => 
        product.product_name.toLowerCase().includes(query) ||
        product.product_code.toLowerCase().includes(query)
      ) || [];
      
      // Если участок совпадает - показываем всю его продукцию
      // Если нет - показываем только совпавшую продукцию
      if (matchesWorkCenter) {
        return report;
      } else if (filteredProducts.length > 0) {
        return { ...report, products: filteredProducts };
      }
      return null;
    }).filter((r): r is WorkCenterReportData => r !== null);
  };

  const filteredWorkCenterReports = workCenterReports ? filterReportsBySearch(workCenterReports) : [];

  // План-факт: фильтрация по статусу и клиенту
  const planFactFilteredReports = useMemo(() => {
    // First pass: get filtered reports without order number filter
    const baseFiltered = reports?.filter(r => {
      // Filter by status
      if (planFactStatusFilter !== 'all' && r.status !== planFactStatusFilter) return false;
      // Filter by customer
      if (customerFilter !== 'all') {
        if (customerFilter === 'no_customer') {
          if (r.customer_id) return false;
        } else {
          if (r.customer_id !== customerFilter) return false;
        }
      }
      return true;
    }) || [];

    // If in by_order mode with specific order selected, include the order and all its related orders
    if (planFactViewMode === 'by_order' && selectedOrderNumber !== 'all') {
      const selectedOrder = baseFiltered.find(r => r.order_number === selectedOrderNumber);
      if (!selectedOrder) return [];

      // If selected order is a parent (finished, no parent_order_id), include it and its children
      if (selectedOrder.product_type === 'finished' && !selectedOrder.parent_order_id) {
        return baseFiltered.filter(r => 
          r.order_number === selectedOrderNumber || 
          r.parent_order_id === selectedOrder.order_id
        );
      }
      
      // If selected order is a child, include its parent and all siblings
      if (selectedOrder.parent_order_id) {
        const parentOrder = baseFiltered.find(r => r.order_id === selectedOrder.parent_order_id);
        if (parentOrder) {
          return baseFiltered.filter(r =>
            r.order_id === parentOrder.order_id ||
            r.parent_order_id === parentOrder.order_id
          );
        }
      }
      
      // Just return the selected order if no relations found
      return [selectedOrder];
    }

    return baseFiltered;
  }, [reports, planFactStatusFilter, customerFilter, planFactViewMode, selectedOrderNumber]);

  // Auto-expand selected order
  useEffect(() => {
    if (planFactViewMode === 'by_order' && selectedOrderNumber !== 'all') {
      const selectedOrder = planFactFilteredReports.find(r => r.order_number === selectedOrderNumber);
      if (selectedOrder) {
        // Find the parent order to expand
        const parentToExpand = selectedOrder.parent_order_id 
          ? planFactFilteredReports.find(r => r.order_id === selectedOrder.parent_order_id)
          : selectedOrder;
        
        if (parentToExpand && parentToExpand.product_type === 'finished' && !parentToExpand.parent_order_id) {
          setExpandedOrders(new Set([parentToExpand.order_id]));
        }
      }
    }
  }, [selectedOrderNumber, planFactViewMode, planFactFilteredReports]);


  // Агрегированные данные по продуктам для режима "Суммарно"
  interface AggregatedProduct {
    product_code: string;
    product_name: string;
    product_type: string;
    original_planned_quantity: number;
    planned_quantity: number;
    completed_quantity: number;
    deviation: number;
    order_count: number;
    completion_percent: number;
  }

  const aggregatedByProduct = useMemo(() => {
    const grouped = new Map<string, AggregatedProduct>();
    
    planFactFilteredReports.forEach(r => {
      const key = r.product_code;
      const existing = grouped.get(key);
      if (existing) {
        existing.original_planned_quantity += r.original_planned_quantity;
        existing.planned_quantity += r.planned_quantity;
        existing.completed_quantity += r.completed_quantity;
        existing.deviation += r.deviation;
        existing.order_count += 1;
        existing.completion_percent = existing.planned_quantity > 0 
          ? Math.round((existing.completed_quantity / existing.planned_quantity) * 100) 
          : 0;
      } else {
        const planned = r.planned_quantity || 0;
        const completed = r.completed_quantity || 0;
        grouped.set(key, {
          product_code: r.product_code,
          product_name: r.product_name,
          product_type: r.product_type,
          original_planned_quantity: r.original_planned_quantity,
          planned_quantity: planned,
          completed_quantity: completed,
          deviation: r.deviation,
          order_count: 1,
          completion_percent: planned > 0 ? Math.round((completed / planned) * 100) : 0,
        });
      }
    });
    
    // Apply completion filter
    let result = Array.from(grouped.values());
    if (completionFilter !== 'all') {
      result = result.filter(p => {
        const percent = p.completion_percent;
        switch (completionFilter) {
          case 'not_completed':
            return percent === 0;
          case 'partially':
            return percent > 0 && percent < 100;
          case 'completed':
            return percent >= 100;
          default:
            return true;
        }
      });
    }
    
    return result;
  }, [planFactFilteredReports, completionFilter]);

  // Get unique order numbers for selector (only finished goods parent orders)
  const uniqueOrderNumbers = useMemo(() => {
    if (!reports) return [];
    const finishedOrders = reports.filter(r => r.product_type === 'finished');
    return finishedOrders.map(r => ({
      order_number: r.order_number,
      product_name: r.product_name,
      product_code: r.product_code
    }));
  }, [reports]);

  // Arrow key navigation for orders
  useEffect(() => {
    if (planFactViewMode !== 'by_order') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const orderNumbers = ['all', ...uniqueOrderNumbers.map(o => o.order_number)];
        const currentIndex = orderNumbers.indexOf(selectedOrderNumber);
        
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          setSelectedOrderNumber(orderNumbers[currentIndex - 1]);
        } else if (e.key === 'ArrowDown' && currentIndex < orderNumbers.length - 1) {
          setSelectedOrderNumber(orderNumbers[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [planFactViewMode, selectedOrderNumber, uniqueOrderNumbers]);

  // План-факт: сортировка
  const sortPlanFactReports = (data: typeof planFactFilteredReports) => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (planFactSortField) {
        case 'order_number':
          comparison = a.order_number.localeCompare(b.order_number);
          break;
        case 'product_name':
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case 'planned':
          comparison = a.planned_quantity - b.planned_quantity;
          break;
        case 'completed':
          comparison = a.completed_quantity - b.completed_quantity;
          break;
        case 'deviation':
          comparison = a.deviation - b.deviation;
          break;
      }
      return planFactSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Сортировка агрегированных данных
  const sortAggregatedProducts = (data: AggregatedProduct[]) => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (planFactSortField) {
        case 'product_name':
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case 'planned':
          comparison = a.planned_quantity - b.planned_quantity;
          break;
        case 'completed':
          comparison = a.completed_quantity - b.completed_quantity;
          break;
        case 'deviation':
          comparison = a.deviation - b.deviation;
          break;
        default:
          comparison = a.product_name.localeCompare(b.product_name);
      }
      return planFactSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handlePlanFactSort = (field: typeof planFactSortField) => {
    if (planFactSortField === field) {
      setPlanFactSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPlanFactSortField(field);
      setPlanFactSortDirection('asc');
    }
  };

  const getPlanFactSortIcon = (field: typeof planFactSortField) => {
    if (planFactSortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return planFactSortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const chartData = planFactFilteredReports.slice(0, 10).map((report) => ({
    name: report.order_number,
    "план (исх.)": report.original_planned_quantity,
    "план (тек.)": report.planned_quantity,
    факт: report.completed_quantity,
  })) || [];

  const pieData = summary ? Object.entries(summary.statusCounts).map(([status, count]) => ({
    name: statusConfig[status as keyof typeof statusConfig]?.label || status,
    value: count,
  })) : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Отчеты производства</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Аналитика и отчетность по производственным процессам</p>
          </div>
        </div>

         <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 lg:w-auto">
            <TabsTrigger value="plan-fact" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">План-факт</span>
            </TabsTrigger>
            <TabsTrigger value="output" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Выпуск</span>
            </TabsTrigger>
            <TabsTrigger value="work-centers" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">По цехам</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">По изделиям</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Временная</span>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Просроченные</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">По клиентам</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan-fact" className="space-y-6">

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd.MM.yyyy", { locale: ru }) : "Дата начала"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd.MM.yyyy", { locale: ru }) : "Дата окончания"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={planFactStatusFilter} onValueChange={(v) => setPlanFactStatusFilter(v as typeof planFactStatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="planned">Запланирован</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершен</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Клиент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все клиенты</SelectItem>
                <SelectItem value="no_customer">Без клиента</SelectItem>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <Select value={planFactViewMode} onValueChange={(v) => {
              setPlanFactViewMode(v as 'aggregated' | 'by_order');
              if (v === 'aggregated') setSelectedOrderNumber('all');
            }}>
              <SelectTrigger className="w-[180px]">
                {planFactViewMode === 'aggregated' ? (
                  <Layers className="h-4 w-4 mr-2" />
                ) : (
                  <ListOrdered className="h-4 w-4 mr-2" />
                )}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggregated">Суммарно</SelectItem>
                <SelectItem value="by_order">По заказам</SelectItem>
              </SelectContent>
            </Select>

            {/* Completion Filter - visible in aggregated mode */}
            {planFactViewMode === 'aggregated' && (
              <Select value={completionFilter} onValueChange={(v) => setCompletionFilter(v as typeof completionFilter)}>
                <SelectTrigger className="w-[180px]">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Выполнение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="not_completed">Невыполненные (0%)</SelectItem>
                  <SelectItem value="partially">Частично (1-99%)</SelectItem>
                  <SelectItem value="completed">Выполненные (100%)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Order Selector - visible in by_order mode */}
            {planFactViewMode === 'by_order' && (
              <Select value={selectedOrderNumber} onValueChange={setSelectedOrderNumber}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Выберите заказ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все заказы (по отдельности)</SelectItem>
                  {uniqueOrderNumbers.map(o => (
                    <SelectItem 
                      key={o.order_number} 
                      value={o.order_number}
                      className={selectedOrderNumber === o.order_number ? "bg-primary/10 font-medium" : ""}
                    >
                      {o.order_number} - {o.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" onClick={() => {
              handleReset();
              setPlanFactStatusFilter('all');
              setCustomerFilter('all');
              setPlanFactViewMode('aggregated');
              setSelectedOrderNumber('all');
              setCompletionFilter('all');
            }}>
              Сбросить
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Плановый объем</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalPlannedOriginal}</div>
                {summary.totalPlanChange !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    Текущий: <span className="font-medium text-foreground">{summary.totalPlanned}</span>{" "}
                    <span className={summary.totalPlanChange > 0 ? "text-amber-600" : "text-green-600"}>
                      ({summary.totalPlanChange > 0 ? "+" : ""}{summary.totalPlanChange})
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Фактический объем</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalCompleted}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Отклонение</CardTitle>
                {summary.totalDeviation >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalDeviation > 0 ? '+' : ''}{summary.totalDeviation}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.deviationPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>План-факт по заказам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="план (исх.)" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="план (тек.)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="факт" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Распределение по статусам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {planFactViewMode === 'aggregated' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    expandAllProductTypes();
                    expandAllProducts();
                  }}
                  disabled={expandedProducts.size === aggregatedByProduct.length && aggregatedByProduct.length > 0}
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Развернуть все</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllProducts}
                  disabled={expandedProducts.size === 0}
                >
                  <Minimize2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Свернуть все</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllOrders}
                  disabled={(() => {
                    const parentOrderCount = planFactFilteredReports.filter(r => r.product_type === 'finished' && !r.parent_order_id).length;
                    return expandedOrders.size === parentOrderCount && parentOrderCount > 0;
                  })()}
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Развернуть все</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllOrders}
                  disabled={expandedOrders.size === 0}
                >
                  <Minimize2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Свернуть все</span>
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Orientation selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  {printOrientation === 'portrait' ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="3" width="12" height="18" rx="1" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="6" width="18" height="12" rx="1" />
                    </svg>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPrintOrientation('portrait')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="3" width="12" height="18" rx="1" />
                  </svg>
                  Портрет
                  {printOrientation === 'portrait' && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPrintOrientation('landscape')}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6" width="18" height="12" rx="1" />
                  </svg>
                  Альбом
                  {printOrientation === 'landscape' && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {planFactViewMode === 'aggregated' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={aggregatedByProduct.length === 0}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Excel</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel()}>
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded mr-2">Все</span>
                    Все типы продукции
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['finished'])}>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">ГП</Badge>
                    Готовая продукция
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['assembly'])}>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mr-2">СБ</Badge>
                    Сборочные узлы
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['semi-finished'])}>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 mr-2">ПФ</Badge>
                    Полуфабрикаты
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['finished', 'assembly'])}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['finished', 'semi-finished'])}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePlanFactExportExcel(['assembly', 'semi-finished'])}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePlanFactExportExcel()}
                disabled={planFactFilteredReports.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            )}
            {planFactViewMode === 'aggregated' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={aggregatedByProduct.length === 0}>
                    <Printer className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Печать</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
                  {/* All types */}
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter([]);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded mr-2">Все</span>
                    Суммарно (без детализации)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter([]);
                    setAggregatedShowDetails(true);
                    openPrintPreview('aggregated');
                  }}>
                    <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded mr-2">Все</span>
                    Суммарно с детализацией
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* ГП - Finished goods */}
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['finished']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">ГП</Badge>
                    Суммарно
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['finished']);
                    setAggregatedShowDetails(true);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">ГП</Badge>
                    С детализацией
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* СБ - Assemblies */}
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['assembly']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mr-2">СБ</Badge>
                    Суммарно
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['assembly']);
                    setAggregatedShowDetails(true);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mr-2">СБ</Badge>
                    С детализацией
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* ПФ - Semi-finished */}
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['semi-finished']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 mr-2">ПФ</Badge>
                    Суммарно
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['semi-finished']);
                    setAggregatedShowDetails(true);
                    openPrintPreview('aggregated');
                  }}>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 mr-2">ПФ</Badge>
                    С детализацией
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* Combinations */}
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['finished', 'assembly']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>
                    </div>
                    Суммарно
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['finished', 'semi-finished']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">ГП</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>
                    </div>
                    Суммарно
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setAggregatedProductTypeFilter(['assembly', 'semi-finished']);
                    setAggregatedShowDetails(false);
                    openPrintPreview('aggregated');
                  }}>
                    <div className="flex items-center gap-1 mr-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">СБ</Badge>
                      <span>+</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">ПФ</Badge>
                    </div>
                    Суммарно
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPrintPreview('by-order')}
                disabled={planFactFilteredReports.length === 0}
              >
                <Printer className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Печать</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tables Section */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : planFactFilteredReports.length > 0 ? (
          planFactViewMode === 'aggregated' ? (
          <div className="space-y-4">
            {/* Готовая продукция */}
            {(() => {
              const finishedProducts = sortAggregatedProducts(aggregatedByProduct.filter(p => p.product_type === 'finished'));
              if (finishedProducts.length === 0) return null;
              const totals = finishedProducts.reduce((acc, p) => ({
                planned: acc.planned + p.planned_quantity,
                completed: acc.completed + p.completed_quantity,
              }), { planned: 0, completed: 0 });
              return (
                <Collapsible open={expandedProductTypes.has('finished')} onOpenChange={() => toggleProductType('finished')}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedProductTypes.has('finished') ? '' : '-rotate-90'}`} />
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ГП</Badge>
                            Готовая продукция
                            <span className="text-muted-foreground font-normal">({finishedProducts.length} изд.)</span>
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            План: {totals.planned} | Факт: {totals.completed}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('product_name')}>
                                <div className="flex items-center">Изделие {getPlanFactSortIcon('product_name')}</div>
                              </TableHead>
                              <TableHead className="text-right">Заказов</TableHead>
                              <TableHead className="text-right">План (исх.)</TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('planned')}>
                                <div className="flex items-center justify-end">План (тек.) {getPlanFactSortIcon('planned')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('completed')}>
                                <div className="flex items-center justify-end">Факт {getPlanFactSortIcon('completed')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('deviation')}>
                                <div className="flex items-center justify-end">Откл. {getPlanFactSortIcon('deviation')}</div>
                              </TableHead>
                              <TableHead className="w-[140px]">Выполнение</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {finishedProducts.map((product) => {
                              const productOrders = planFactFilteredReports.filter(r => r.product_code === product.product_code);
                              const isExpanded = expandedProducts.has(product.product_code);
                              return (
                                <Fragment key={product.product_code}>
                                  <TableRow 
                                    key={product.product_code} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => toggleExpandedProduct(product.product_code)}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <ChevronDown className={`h-4 w-4 transition-transform text-muted-foreground ${isExpanded ? '' : '-rotate-90'}`} />
                                        <div>
                                          <div className="font-medium">{product.product_name}</div>
                                          <div className="text-xs text-muted-foreground">{product.product_code}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{product.order_count}</TableCell>
                                    <TableCell className="text-right">{product.original_planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.completed_quantity}</TableCell>
                                    <TableCell className={`text-right ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {product.deviation > 0 ? '+' : ''}{product.deviation}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress 
                                          value={Math.min(product.completion_percent, 100)} 
                                          className={`h-2 w-20 ${product.completion_percent >= 100 ? '[&>div]:bg-green-500' : product.completion_percent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                        />
                                        <span className={`text-xs font-medium ${product.completion_percent >= 100 ? 'text-green-600' : product.completion_percent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                          {product.completion_percent}%
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && productOrders.map((order) => {
                                    const orderPercent = order.planned_quantity > 0 
                                      ? Math.round((order.completed_quantity / order.planned_quantity) * 100) 
                                      : 0;
                                    return (
                                      <TableRow key={order.order_number} className="bg-muted/30">
                                        <TableCell className="pl-10">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm">{order.order_number}</span>
                                            <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                                              {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">1</TableCell>
                                        <TableCell className="text-right">{order.original_planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.completed_quantity}</TableCell>
                                        <TableCell className={`text-right ${order.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {order.deviation > 0 ? '+' : ''}{order.deviation}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Progress 
                                              value={Math.min(orderPercent, 100)} 
                                              className={`h-2 w-20 ${orderPercent >= 100 ? '[&>div]:bg-green-500' : orderPercent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                            />
                                            <span className={`text-xs font-medium ${orderPercent >= 100 ? 'text-green-600' : orderPercent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                              {orderPercent}%
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* Сборочные узлы */}
            {(() => {
              const assemblyProducts = sortAggregatedProducts(aggregatedByProduct.filter(p => p.product_type === 'assembly'));
              if (assemblyProducts.length === 0) return null;
              const totals = assemblyProducts.reduce((acc, p) => ({
                planned: acc.planned + p.planned_quantity,
                completed: acc.completed + p.completed_quantity,
              }), { planned: 0, completed: 0 });
              return (
                <Collapsible open={expandedProductTypes.has('assembly')} onOpenChange={() => toggleProductType('assembly')}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedProductTypes.has('assembly') ? '' : '-rotate-90'}`} />
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">СБ</Badge>
                            Сборочные узлы
                            <span className="text-muted-foreground font-normal">({assemblyProducts.length} изд.)</span>
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            План: {totals.planned} | Факт: {totals.completed}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('product_name')}>
                                <div className="flex items-center">Изделие {getPlanFactSortIcon('product_name')}</div>
                              </TableHead>
                              <TableHead className="text-right">Заказов</TableHead>
                              <TableHead className="text-right">План (исх.)</TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('planned')}>
                                <div className="flex items-center justify-end">План (тек.) {getPlanFactSortIcon('planned')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('completed')}>
                                <div className="flex items-center justify-end">Факт {getPlanFactSortIcon('completed')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('deviation')}>
                                <div className="flex items-center justify-end">Откл. {getPlanFactSortIcon('deviation')}</div>
                              </TableHead>
                              <TableHead className="w-[140px]">Выполнение</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assemblyProducts.map((product) => {
                              const productOrders = planFactFilteredReports.filter(r => r.product_code === product.product_code);
                              const isExpanded = expandedProducts.has(product.product_code);
                              return (
                                <Fragment key={product.product_code}>
                                  <TableRow 
                                    key={product.product_code} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => toggleExpandedProduct(product.product_code)}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <ChevronDown className={`h-4 w-4 transition-transform text-muted-foreground ${isExpanded ? '' : '-rotate-90'}`} />
                                        <div>
                                          <div className="font-medium">{product.product_name}</div>
                                          <div className="text-xs text-muted-foreground">{product.product_code}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{product.order_count}</TableCell>
                                    <TableCell className="text-right">{product.original_planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.completed_quantity}</TableCell>
                                    <TableCell className={`text-right ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {product.deviation > 0 ? '+' : ''}{product.deviation}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress 
                                          value={Math.min(product.completion_percent, 100)} 
                                          className={`h-2 w-20 ${product.completion_percent >= 100 ? '[&>div]:bg-green-500' : product.completion_percent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                        />
                                        <span className={`text-xs font-medium ${product.completion_percent >= 100 ? 'text-green-600' : product.completion_percent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                          {product.completion_percent}%
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && productOrders.map((order) => {
                                    const orderPercent = order.planned_quantity > 0 
                                      ? Math.round((order.completed_quantity / order.planned_quantity) * 100) 
                                      : 0;
                                    return (
                                      <TableRow key={order.order_number} className="bg-muted/30">
                                        <TableCell className="pl-10">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm">{order.order_number}</span>
                                            <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                                              {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">1</TableCell>
                                        <TableCell className="text-right">{order.original_planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.completed_quantity}</TableCell>
                                        <TableCell className={`text-right ${order.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {order.deviation > 0 ? '+' : ''}{order.deviation}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Progress 
                                              value={Math.min(orderPercent, 100)} 
                                              className={`h-2 w-20 ${orderPercent >= 100 ? '[&>div]:bg-green-500' : orderPercent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                            />
                                            <span className={`text-xs font-medium ${orderPercent >= 100 ? 'text-green-600' : orderPercent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                              {orderPercent}%
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* Полуфабрикаты */}
            {(() => {
              const semiFinishedProducts = sortAggregatedProducts(aggregatedByProduct.filter(p => p.product_type === 'semi-finished'));
              if (semiFinishedProducts.length === 0) return null;
              const totals = semiFinishedProducts.reduce((acc, p) => ({
                planned: acc.planned + p.planned_quantity,
                completed: acc.completed + p.completed_quantity,
              }), { planned: 0, completed: 0 });
              return (
                <Collapsible open={expandedProductTypes.has('semi-finished')} onOpenChange={() => toggleProductType('semi-finished')}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedProductTypes.has('semi-finished') ? '' : '-rotate-90'}`} />
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">ПФ</Badge>
                            Полуфабрикаты
                            <span className="text-muted-foreground font-normal">({semiFinishedProducts.length} изд.)</span>
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            План: {totals.planned} | Факт: {totals.completed}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('product_name')}>
                                <div className="flex items-center">Изделие {getPlanFactSortIcon('product_name')}</div>
                              </TableHead>
                              <TableHead className="text-right">Заказов</TableHead>
                              <TableHead className="text-right">План (исх.)</TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('planned')}>
                                <div className="flex items-center justify-end">План (тек.) {getPlanFactSortIcon('planned')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('completed')}>
                                <div className="flex items-center justify-end">Факт {getPlanFactSortIcon('completed')}</div>
                              </TableHead>
                              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handlePlanFactSort('deviation')}>
                                <div className="flex items-center justify-end">Откл. {getPlanFactSortIcon('deviation')}</div>
                              </TableHead>
                              <TableHead className="w-[140px]">Выполнение</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {semiFinishedProducts.map((product) => {
                              const productOrders = planFactFilteredReports.filter(r => r.product_code === product.product_code);
                              const isExpanded = expandedProducts.has(product.product_code);
                              return (
                                <Fragment key={product.product_code}>
                                  <TableRow 
                                    key={product.product_code} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => toggleExpandedProduct(product.product_code)}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <ChevronDown className={`h-4 w-4 transition-transform text-muted-foreground ${isExpanded ? '' : '-rotate-90'}`} />
                                        <div>
                                          <div className="font-medium">{product.product_name}</div>
                                          <div className="text-xs text-muted-foreground">{product.product_code}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{product.order_count}</TableCell>
                                    <TableCell className="text-right">{product.original_planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.planned_quantity}</TableCell>
                                    <TableCell className="text-right">{product.completed_quantity}</TableCell>
                                    <TableCell className={`text-right ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {product.deviation > 0 ? '+' : ''}{product.deviation}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Progress 
                                          value={Math.min(product.completion_percent, 100)} 
                                          className={`h-2 w-20 ${product.completion_percent >= 100 ? '[&>div]:bg-green-500' : product.completion_percent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                        />
                                        <span className={`text-xs font-medium ${product.completion_percent >= 100 ? 'text-green-600' : product.completion_percent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                          {product.completion_percent}%
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && productOrders.map((order) => {
                                    const orderPercent = order.planned_quantity > 0 
                                      ? Math.round((order.completed_quantity / order.planned_quantity) * 100) 
                                      : 0;
                                    return (
                                      <TableRow key={order.order_number} className="bg-muted/30">
                                        <TableCell className="pl-10">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm">{order.order_number}</span>
                                            <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                                              {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">1</TableCell>
                                        <TableCell className="text-right">{order.original_planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.planned_quantity}</TableCell>
                                        <TableCell className="text-right">{order.completed_quantity}</TableCell>
                                        <TableCell className={`text-right ${order.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {order.deviation > 0 ? '+' : ''}{order.deviation}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Progress 
                                              value={Math.min(orderPercent, 100)} 
                                              className={`h-2 w-20 ${orderPercent >= 100 ? '[&>div]:bg-green-500' : orderPercent > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted'}`}
                                            />
                                            <span className={`text-xs font-medium ${orderPercent >= 100 ? 'text-green-600' : orderPercent > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                              {orderPercent}%
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}
          </div>
          ) : (
            <PlanFactByOrderView
              reports={planFactFilteredReports}
              expandedOrders={expandedOrders}
              onToggleOrder={toggleOrder}
              selectedOrderNumber={selectedOrderNumber}
            />
          )
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет данных для отображения
            </CardContent>
          </Card>
        )}

        {/* Hidden print views */}
        <div className="hidden">
          <PlanFactPrintView
            ref={planFactPrintRef}
            reports={planFactFilteredReports}
            startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
            endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            printType={planFactPrintType}
            orientation={printOrientation}
          />
          <PlanFactByOrderPrintView
            ref={planFactByOrderPrintRef}
            reports={planFactFilteredReports}
            startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
            endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            orientation={printOrientation}
          />
          <PlanFactAggregatedPrintView
            ref={planFactAggregatedPrintRef}
            aggregatedProducts={aggregatedByProduct}
            allReports={planFactFilteredReports}
            startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
            endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            showDetails={aggregatedShowDetails}
            completionFilter={completionFilter}
            orientation={printOrientation}
            productTypeFilter={aggregatedProductTypeFilter}
          />
        </div>

        {/* Print Preview Dialog */}
        <PrintPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={getPreviewTitle()}
          onPrint={handlePreviewPrint}
        >
          {previewType === 'plan-fact' && (
            <PlanFactPrintView
              reports={planFactFilteredReports}
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
              printType={planFactPrintType}
              orientation={printOrientation}
            />
          )}
          {previewType === 'by-order' && (
            <PlanFactByOrderPrintView
              reports={planFactFilteredReports}
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
              orientation={printOrientation}
            />
          )}
          {previewType === 'aggregated' && (
            <PlanFactAggregatedPrintView
              aggregatedProducts={aggregatedByProduct}
              allReports={planFactFilteredReports}
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
              showDetails={aggregatedShowDetails}
              completionFilter={completionFilter}
              orientation={printOrientation}
              productTypeFilter={aggregatedProductTypeFilter}
            />
          )}
          {previewType === 'work-centers' && (
            <WorkCenterReportPrintView 
              reports={workCenterReports || []}
              singleWorkCenterId={printWorkCenterId}
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
              orientation={printOrientation}
            />
          )}
        </PrintPreviewDialog>
          </TabsContent>

          <TabsContent value="output" className="space-y-6">
            <ProductionOutputReport
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
          </TabsContent>


          <TabsContent value="work-centers" className="space-y-6">
            <WorkCenterCombinedReport 
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductOperationsReport 
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <TimelineAnalytics 
              startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
              endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
            />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            <OverdueOrdersReport />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ProductionReports = () => {
  return (
    <ProtectedRoute>
      <ProductionReportsContent />
    </ProtectedRoute>
  );
};

export default ProductionReports;
