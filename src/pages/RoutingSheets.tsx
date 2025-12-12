import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, GitBranch, Clock, Settings, Loader2, X, Edit, Trash2, ChevronDown, Package, AlertTriangle, Copy, Printer, FileSpreadsheet, HelpCircle, CheckCircle2, ArrowRight, Wand2, Layers, ArrowUp, ArrowDown, GripVertical, ChevronsDown, ChevronsUp, FolderOpen, ChevronRight, Sparkles, History } from "lucide-react";
import { useRoutingSheets, useCreateRoutingSheet, useUpdateRoutingSheet, useDeleteRoutingSheet, useReorderRoutingSheets } from "@/hooks/useRoutingSheets";
import { useSpecifications } from "@/hooks/useSpecifications";
import { RoutingSheetDialog } from "@/components/routing-sheets/RoutingSheetDialog";
import { RoutingFlowDiagram } from "@/components/routing-sheets/RoutingFlowDiagram";
import { RoutingSheetPrintView } from "@/components/routing-sheets/RoutingSheetPrintView";
import { StandardOperationsDialog } from "@/components/routing-sheets/StandardOperationsDialog";
import { ConsolidatedRoutingDialog } from "@/components/routing-sheets/ConsolidatedRoutingDialog";
import { BulkDistributionDialog } from "@/components/routing-sheets/BulkDistributionDialog";
import { BulkClearDistributionDialog } from "@/components/routing-sheets/BulkClearDistributionDialog";
import { DistributionHistoryDialog } from "@/components/routing-sheets/DistributionHistoryDialog";
import { useDistributionHistory } from "@/hooks/useDistributionHistory";
import { DistributionStrategy } from "@/hooks/useSmartDistribution";
import { supabase } from "@/integrations/supabase/client";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GroupingMode = 'none' | 'product' | 'department';

const RoutingSheets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const [sheetToPrint, setSheetToPrint] = useState<any>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [standardOpsDialogOpen, setStandardOpsDialogOpen] = useState(false);
  const [consolidatedRoutingOpen, setConsolidatedRoutingOpen] = useState(false);
  const [consolidatedRoutingProduct, setConsolidatedRoutingProduct] = useState<{id: string; name: string; code: string} | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');
  const [expectedSheetCount, setExpectedSheetCount] = useState<number | null>(null);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
  const [useInternalOperationOnly, setUseInternalOperationOnly] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSheetIds, setSelectedSheetIds] = useState<Set<string>>(new Set());
  const [bulkDistributionOpen, setBulkDistributionOpen] = useState(false);
  const [bulkDistributionLoading, setBulkDistributionLoading] = useState(false);
  const [bulkClearOpen, setBulkClearOpen] = useState(false);
  const [bulkClearLoading, setBulkClearLoading] = useState(false);
  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historySheetId, setHistorySheetId] = useState<string | undefined>();
  const [historySheetName, setHistorySheetName] = useState<string | undefined>();
  
  const printRef = useRef<HTMLDivElement>(null);
  const bottomButtonRef = useRef<HTMLDivElement>(null);
  
  const { data: routingSheets, isLoading, refetch: refetchSheets } = useRoutingSheets();
  const { data: specifications } = useSpecifications();
  const { addHistoryRecord } = useDistributionHistory();
  const createMutation = useCreateRoutingSheet();
  const updateMutation = useUpdateRoutingSheet();
  const deleteMutation = useDeleteRoutingSheet();
  const reorderMutation = useReorderRoutingSheets();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: sheetToPrint ? `Техмаршрут_${sheetToPrint.code}` : "Техмаршрут",
    onAfterPrint: () => setSheetToPrint(null),
  });

  // Helper to get specification for a product and calculate linked components stats
  const getSheetComponentStats = (sheet: any) => {
    const spec = specifications?.find(
      (s) => s.product_id === sheet.product_id && s.is_active && !s.has_no_specification
    );
    const specMaterialIds = new Set(
      spec?.specification_materials?.map((m: any) => m.material_id) || []
    );
    const totalSpecComponents = specMaterialIds.size;

    // Collect all linked component IDs from all operations
    const linkedComponentIds = new Set<string>();
    const operations = sheet.routing_operations || [];
    
    // Count production operations and those with materials
    const productionOps = operations.filter((op: any) => op.operation_type === "production");
    const productionOpsWithMaterials = productionOps.filter((op: any) => 
      op.routing_operation_materials && op.routing_operation_materials.length > 0
    ).length;
    const totalProductionOps = productionOps.length;
    
    operations.forEach((op: any) => {
      op.routing_operation_materials?.forEach((m: any) => {
        linkedComponentIds.add(m.product_id);
      });
    });

    const linkedCount = linkedComponentIds.size;
    const unlinkedCount = totalSpecComponents - [...specMaterialIds].filter(id => linkedComponentIds.has(id)).length;

    return {
      totalSpecComponents,
      linkedCount,
      unlinkedCount,
      hasSpec: !!spec,
      linkedComponentIds,
      productionOpsWithMaterials,
      totalProductionOps,
      allOpsHaveMaterials: productionOpsWithMaterials === totalProductionOps,
    };
  };

  // Sort sheets by sort_order for display
  const sortedSheets = [...(routingSheets || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const filteredSheets = sortedSheets.filter((sheet) => {
    // Text search filter
    const matchesSearch = 
      sheet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.products?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Incomplete distribution filter
    if (showIncompleteOnly) {
      const stats = getSheetComponentStats(sheet);
      // Show if has unlinked components OR not all production ops have materials
      const hasIssues = stats.unlinkedCount > 0 || 
        (stats.totalProductionOps > 0 && !stats.allOpsHaveMaterials);
      return hasIssues;
    }
    
    return true;
  });

  // Count incomplete sheets for badge
  const incompleteCount = useMemo(() => {
    return sortedSheets.filter(sheet => {
      const stats = getSheetComponentStats(sheet);
      return stats.unlinkedCount > 0 || 
        (stats.totalProductionOps > 0 && !stats.allOpsHaveMaterials);
    }).length;
  }, [sortedSheets, specifications]);

  // Grouping logic
  const groupedSheets = useMemo(() => {
    if (groupingMode === 'none') return null;
    
    const groups: Record<string, { name: string; sheets: typeof filteredSheets }> = {};
    
    filteredSheets.forEach(sheet => {
      let groupKey: string;
      let groupName: string;
      
      if (groupingMode === 'product') {
        groupKey = sheet.product_id || 'no-product';
        groupName = sheet.products ? `${sheet.products.code} — ${sheet.products.name}` : 'Без продукта';
      } else {
        // Department grouping
        const operations = sheet.routing_operations || [];
        const sortedOps = [...operations].sort((a: any, b: any) => b.sequence - a.sequence);
        
        let targetOp;
        if (useInternalOperationOnly) {
          // Find last internal operation (non-external) with a work center
          targetOp = sortedOps.find((op: any) => !op.is_external && op.work_center_id);
        } else {
          // Use last operation regardless of type
          targetOp = sortedOps[0];
        }
        
        // For external operations without work center, use contractor name
        if (targetOp?.is_external && !targetOp.work_center_id) {
          const contractorName = targetOp.contractors?.name || targetOp.external_contractor || 'Внешняя операция';
          groupKey = `external-${contractorName}`;
          groupName = `Внешние: ${contractorName}`;
        } else {
          const department = targetOp?.work_centers?.department;
          groupKey = department || 'no-department';
          groupName = department || 'Без отдела';
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupName, sheets: [] };
      }
      groups[groupKey].sheets.push(sheet);
    });
    
    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
  }, [filteredSheets, groupingMode, useInternalOperationOnly]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    if (groupedSheets) {
      setExpandedGroups(new Set(groupedSheets.map(([key]) => key)));
    }
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const handleMoveUp = (sheet: any) => {
    const currentIndex = sortedSheets.findIndex(s => s.id === sheet.id);
    if (currentIndex <= 0) return;
    
    const prevSheet = sortedSheets[currentIndex - 1];
    const updates = [
      { id: sheet.id, sort_order: prevSheet.sort_order || currentIndex - 1 },
      { id: prevSheet.id, sort_order: sheet.sort_order || currentIndex }
    ];
    reorderMutation.mutate(updates);
  };

  const handleMoveDown = (sheet: any) => {
    const currentIndex = sortedSheets.findIndex(s => s.id === sheet.id);
    if (currentIndex >= sortedSheets.length - 1) return;
    
    const nextSheet = sortedSheets[currentIndex + 1];
    const updates = [
      { id: sheet.id, sort_order: nextSheet.sort_order || currentIndex + 1 },
      { id: nextSheet.id, sort_order: sheet.sort_order || currentIndex }
    ];
    reorderMutation.mutate(updates);
  };

  const handleInsertBefore = (sheet: any) => {
    setSelectedSheet(null);
    setDialogOpen(true);
    // After creation, the new sheet will get the next sort_order, then we'll need to reorder
    toast.info(`Создайте новый техмаршрут. После сохранения используйте стрелки для перемещения.`);
  };

  // Auto-scroll during drag
  const scrollIntervalRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const startAutoScroll = useCallback((direction: 'up' | 'down') => {
    if (scrollIntervalRef.current) return;
    const scrollSpeed = direction === 'up' ? -15 : 15;
    scrollIntervalRef.current = window.setInterval(() => {
      window.scrollBy({ top: scrollSpeed, behavior: 'auto' });
    }, 16);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Global drag event for auto-scroll
  useEffect(() => {
    const handleGlobalDrag = (e: DragEvent) => {
      if (!isDraggingRef.current) return;
      
      const scrollThreshold = 100;
      const mouseY = e.clientY;
      const windowHeight = window.innerHeight;

      if (mouseY < scrollThreshold) {
        startAutoScroll('up');
      } else if (mouseY > windowHeight - scrollThreshold) {
        startAutoScroll('down');
      } else {
        stopAutoScroll();
      }
    };

    const handleGlobalDragEnd = () => {
      stopAutoScroll();
      isDraggingRef.current = false;
    };

    document.addEventListener('drag', handleGlobalDrag);
    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('drag', handleGlobalDrag);
      document.removeEventListener('dragend', handleGlobalDragEnd);
      stopAutoScroll();
    };
  }, [startAutoScroll, stopAutoScroll]);

  // Track scroll position to show/hide scroll button and determine direction
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - scrollTop - windowHeight;
      const distanceFromTop = scrollTop;
      
      // Show button if page is scrollable enough
      const showButton = documentHeight > windowHeight + 500;
      setShowScrollButton(showButton);
      
      // Determine direction based on position
      if (distanceFromBottom < 200) {
        setScrollDirection('up');
      } else if (distanceFromTop < 200) {
        setScrollDirection('down');
      } else {
        // In the middle - prefer down if closer to top, up if closer to bottom
        setScrollDirection(scrollTop < documentHeight / 2 ? 'down' : 'up');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to scroll to bottom after new sheet is added
  useEffect(() => {
    if (expectedSheetCount !== null && routingSheets && routingSheets.length >= expectedSheetCount) {
      // Data has loaded with new sheet - scroll to bottom
      setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        setExpectedSheetCount(null);
      }, 150);
    }
  }, [expectedSheetCount, routingSheets]);

  const handleScrollButton = () => {
    if (scrollDirection === 'down') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    stopAutoScroll();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the sheets
    const newSheets = [...sortedSheets];
    const [draggedSheet] = newSheets.splice(draggedIndex, 1);
    newSheets.splice(targetIndex, 0, draggedSheet);

    // Create updates with new sort_order values
    const updates = newSheets.map((sheet, idx) => ({
      id: sheet.id,
      sort_order: idx + 1
    }));

    reorderMutation.mutate(updates);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    stopAutoScroll();
    isDraggingRef.current = false;
  };

  const handleSave = async (data: any) => {
    // Use selectedSheet.id to determine if this is an update or create
    // When copying, id is set to undefined, so we should create a new sheet
    const isCreating = !selectedSheet?.id;
    if (selectedSheet?.id) {
      await updateMutation.mutateAsync({ id: selectedSheet.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
    setSelectedSheet(null);
    
    // Set expected count to trigger scroll after data reloads
    if (isCreating) {
      setExpectedSheetCount((routingSheets?.length || 0) + 1);
    }
  };

  const handleEdit = (sheet: any) => {
    setSelectedSheet(sheet);
    setDialogOpen(true);
  };

  const handleDelete = (sheet: any) => {
    if (confirm(`Удалить техмаршрут "${sheet.code}"? Это действие необратимо.`)) {
      deleteMutation.mutate(sheet.id);
    }
  };

  const handleCopy = (sheet: any) => {
    // Create a copy of the sheet for editing - set code to AUTO for new generation
    const copiedSheet = {
      ...sheet,
      id: undefined,
      code: "AUTO",
      name: `${sheet.name} (копия)`,
      routing_operations: sheet.routing_operations?.map((op: any) => ({
        ...op,
        id: undefined,
        routing_operation_materials: op.routing_operation_materials?.map((m: any) => ({
          ...m,
          id: undefined,
        })),
      })),
    };
    setSelectedSheet(copiedSheet);
    setDialogOpen(true);
    toast.info("Создание копии техмаршрута");
  };

  const handlePrintSheet = (sheet: any) => {
    setSheetToPrint(sheet);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleExportToExcel = (sheet: any) => {
    const operations = sheet.routing_operations || [];
    const operationTypeLabels: Record<string, string> = {
      production: "Производство",
      transport: "Транспортировка",
      control: "Контроль",
      setup: "Наладка",
    };

    // Sheet 1: General info and operations
    const operationsData = operations.map((op: any) => ({
      "№": op.sequence,
      "Операция": op.name,
      "Тип": operationTypeLabels[op.operation_type] || op.operation_type,
      "Участок (код)": op.work_centers?.code || "",
      "Участок (название)": op.work_centers?.name || "",
      "ПЗ, мин": op.setup_time_minutes || 0,
      "Шт, мин": op.cycle_time_minutes || 0,
    }));

    // Sheet 2: Components by operations
    const componentsData: any[] = [];
    operations.forEach((op: any) => {
      const materials = op.routing_operation_materials || [];
      materials.forEach((m: any) => {
        componentsData.push({
          "Операция №": op.sequence,
          "Операция": op.name,
          "Код компонента": m.products?.code || "",
          "Наименование": m.products?.name || "",
          "Тип": m.products?.product_type || "",
          "Количество": m.quantity_per_operation ?? "",
          "Ед. изм.": m.products?.unit || "",
        });
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Info sheet
    const infoData = [
      ["Технологический маршрут", sheet.code],
      ["Название", sheet.name],
      ["Продукт", `${sheet.products?.code || ""} — ${sheet.products?.name || ""}`],
      ["Статус", sheet.is_active ? "Активен" : "Неактивен"],
      ["Количество операций", operations.length],
      ["Общее время наладки", operations.reduce((s: number, o: any) => s + (o.setup_time_minutes || 0), 0) + " мин"],
      ["Общее время на единицу", operations.reduce((s: number, o: any) => s + (o.cycle_time_minutes || 0), 0) + " мин"],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Информация");

    // Operations sheet
    if (operationsData.length > 0) {
      const wsOps = XLSX.utils.json_to_sheet(operationsData);
      XLSX.utils.book_append_sheet(wb, wsOps, "Операции");
    }

    // Components sheet
    if (componentsData.length > 0) {
      const wsComps = XLSX.utils.json_to_sheet(componentsData);
      XLSX.utils.book_append_sheet(wb, wsComps, "Компоненты");
    }

    // Download
    XLSX.writeFile(wb, `Техмаршрут_${sheet.code}.xlsx`);
    toast.success("Экспорт в Excel выполнен");
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case "finished":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">ГП</Badge>;
      case "assembly":
        return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">СБ</Badge>;
      case "semi-finished":
        return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20 text-xs">ПФ</Badge>;
      default:
        return null;
    }
  };

  // Bulk selection handlers
  const toggleSheetSelection = (sheetId: string) => {
    setSelectedSheetIds(prev => {
      const next = new Set(prev);
      if (next.has(sheetId)) {
        next.delete(sheetId);
      } else {
        next.add(sheetId);
      }
      return next;
    });
  };

  const selectAllIncomplete = () => {
    const incompleteIds = sortedSheets
      .filter(sheet => {
        const stats = getSheetComponentStats(sheet);
        return stats.unlinkedCount > 0 && stats.totalProductionOps > 0;
      })
      .map(s => s.id);
    setSelectedSheetIds(new Set(incompleteIds));
  };

  const selectAllWithLinked = () => {
    const linkedIds = sortedSheets
      .filter(sheet => {
        const stats = getSheetComponentStats(sheet);
        return stats.linkedCount > 0;
      })
      .map(s => s.id);
    setSelectedSheetIds(new Set(linkedIds));
  };

  const clearSelection = () => {
    setSelectedSheetIds(new Set());
    setSelectionMode(false);
  };

  const getSelectedSheetsForBulk = () => {
    return sortedSheets
      .filter(s => selectedSheetIds.has(s.id))
      .map(sheet => {
        const stats = getSheetComponentStats(sheet);
        return {
          id: sheet.id,
          code: sheet.code,
          name: sheet.name,
          productName: sheet.products?.name,
          unlinkedCount: stats.unlinkedCount,
          productionOpsCount: stats.totalProductionOps,
        };
      });
  };

  const getSelectedSheetsForClear = () => {
    return sortedSheets
      .filter(s => selectedSheetIds.has(s.id))
      .map(sheet => {
        const stats = getSheetComponentStats(sheet);
        return {
          id: sheet.id,
          code: sheet.code,
          name: sheet.name,
          linkedCount: stats.linkedCount,
          productionOpsCount: stats.totalProductionOps,
        };
      });
  };

  // Bulk distribution logic
  const handleBulkDistribution = async (strategy: DistributionStrategy): Promise<{ success: number; failed: number }> => {
    setBulkDistributionLoading(true);
    let successCount = 0;
    let failedCount = 0;

    const selectedSheets = sortedSheets.filter(s => selectedSheetIds.has(s.id));

    for (const sheet of selectedSheets) {
      try {
        const stats = getSheetComponentStats(sheet);
        if (stats.unlinkedCount === 0 || stats.totalProductionOps === 0) continue;

        // Get specification materials
        const spec = specifications?.find(
          (s) => s.product_id === sheet.product_id && s.is_active && !s.has_no_specification
        );
        if (!spec?.specification_materials) continue;

        const specMaterials = spec.specification_materials;
        const operations = sheet.routing_operations || [];
        const productionOps = operations
          .filter((op: any) => op.operation_type === "production")
          .sort((a: any, b: any) => a.sequence - b.sequence);

        if (productionOps.length === 0) continue;

        // Calculate linked IDs
        const linkedIds = new Set<string>();
        operations.forEach((op: any) => {
          op.routing_operation_materials?.forEach((m: any) => {
            linkedIds.add(m.product_id);
          });
        });

        // Get unlinked materials
        const unlinkedMats = specMaterials.filter((m: any) => !linkedIds.has(m.material_id));
        if (unlinkedMats.length === 0) continue;

        // Prepare distribution based on strategy
        const materialAssignments: { operation_id: string; materials: { product_id: string; quantity: number }[] }[] = [];

        if (strategy === "smart") {
          const rawMaterials = unlinkedMats.filter((m: any) => m.products?.product_type === "material");
          const components = unlinkedMats.filter((m: any) => 
            m.products?.product_type === "semi-finished" || m.products?.product_type === "assembly"
          );
          const other = unlinkedMats.filter((m: any) => 
            m.products?.product_type === "finished" || !m.products?.product_type
          );

          const firstOp = productionOps[0];
          const lastOp = productionOps[productionOps.length - 1];
          const middleOp = productionOps.length >= 3 ? productionOps[Math.floor(productionOps.length / 2)] : null;

          if (rawMaterials.length > 0) {
            materialAssignments.push({
              operation_id: firstOp.id,
              materials: rawMaterials.map((m: any) => ({ product_id: m.material_id, quantity: m.quantity }))
            });
          }
          if (middleOp && components.length > 0) {
            materialAssignments.push({
              operation_id: middleOp.id,
              materials: components.map((m: any) => ({ product_id: m.material_id, quantity: m.quantity }))
            });
          }
          const lastMaterials = [...other, ...(middleOp ? [] : components)];
          if (lastMaterials.length > 0) {
            materialAssignments.push({
              operation_id: lastOp.id,
              materials: lastMaterials.map((m: any) => ({ product_id: m.material_id, quantity: m.quantity }))
            });
          }
        } else if (strategy === "all_operations") {
          productionOps.forEach((op: any) => {
            materialAssignments.push({
              operation_id: op.id,
              materials: unlinkedMats.map((m: any) => ({ product_id: m.material_id, quantity: m.quantity }))
            });
          });
        } else if (strategy === "even") {
          unlinkedMats.forEach((m: any, idx: number) => {
            const targetOp = productionOps[idx % productionOps.length];
            let assignment = materialAssignments.find(a => a.operation_id === targetOp.id);
            if (!assignment) {
              assignment = { operation_id: targetOp.id, materials: [] };
              materialAssignments.push(assignment);
            }
            assignment.materials.push({ product_id: m.material_id, quantity: m.quantity });
          });
        }

        // Insert materials to DB
        let totalMaterialsAdded = 0;
        let operationsAffected = 0;
        for (const assignment of materialAssignments) {
          const materialsToInsert = assignment.materials.map(m => ({
            routing_operation_id: assignment.operation_id,
            product_id: m.product_id,
            quantity_per_operation: m.quantity,
          }));

          if (materialsToInsert.length > 0) {
            const { error } = await supabase
              .from("routing_operation_materials")
              .insert(materialsToInsert);
            
            if (!error) {
              totalMaterialsAdded += materialsToInsert.length;
              operationsAffected++;
            }
          }
        }

        // Record history
        if (totalMaterialsAdded > 0) {
          await addHistoryRecord.mutateAsync({
            routing_sheet_id: sheet.id,
            strategy: strategy,
            components_distributed: totalMaterialsAdded,
            operations_affected: operationsAffected,
            notes: `Массовое распределение`,
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to distribute for sheet ${sheet.id}:`, error);
        failedCount++;
      }
    }

    setBulkDistributionLoading(false);
    await refetchSheets();
    clearSelection();
    
    if (successCount > 0) {
      toast.success(`Распределение завершено: ${successCount} техмаршрутов`);
    }

    return { success: successCount, failed: failedCount };
  };

  // Bulk clear distribution logic
  const handleBulkClearDistribution = async (): Promise<{ success: number; failed: number }> => {
    setBulkClearLoading(true);
    let successCount = 0;
    let failedCount = 0;

    const selectedSheets = sortedSheets.filter(s => selectedSheetIds.has(s.id));

    for (const sheet of selectedSheets) {
      try {
        const stats = getSheetComponentStats(sheet);
        if (stats.linkedCount === 0) continue;

        const operations = sheet.routing_operations || [];
        const operationIds = operations.map((op: any) => op.id);

        if (operationIds.length === 0) continue;

        // Delete all materials for all operations of this sheet
        const { error } = await supabase
          .from("routing_operation_materials")
          .delete()
          .in("routing_operation_id", operationIds);

        if (error) {
          console.error(`Failed to clear distribution for sheet ${sheet.id}:`, error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to clear distribution for sheet ${sheet.id}:`, error);
        failedCount++;
      }
    }

    setBulkClearLoading(false);
    await refetchSheets();
    clearSelection();

    if (successCount > 0) {
      toast.success(`Очищено: ${successCount} техмаршрутов`);
    }

    return { success: successCount, failed: failedCount };
  };

  const openHistoryDialog = (sheetId?: string, sheetName?: string) => {
    setHistorySheetId(sheetId);
    setHistorySheetName(sheetName);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Технологические маршруты</h1>
            <p className="text-muted-foreground">
              Последовательность операций для производства продукции
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStandardOpsDialogOpen(true)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Справочник операций
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
              onClick={() => {
                setSelectedSheet(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Создать техмаршрут
            </Button>
          </div>
        </div>

        {/* Guide/Memo - collapsed by default */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mb-6">
          <Card className="border-primary/20">
            <CollapsibleTrigger asChild>
              <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">Как создать техмаршрут? Пошаговая инструкция</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${guideOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-6 px-6">
                <div className="border-t pt-4 space-y-6">
                  {/* Prerequisites */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">0</span>
                      Подготовка (обязательно)
                    </h4>
                    <div className="ml-8 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span><strong>Создайте продукт</strong> (ГП, СБ или ПФ) в разделе "Продукты"</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span><strong>Создайте спецификацию</strong> для продукта с перечнем компонентов (материалы, ПФ, СБ)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span><strong>Создайте производственные участки</strong> в разделе "Производственные участки"</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Создание техмаршрута
                    </h4>
                    <div className="ml-8 space-y-2 text-sm text-muted-foreground">
                      <p>Нажмите кнопку <strong>"Создать техмаршрут"</strong>. Укажите:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><strong>Название</strong> — описательное название маршрута</li>
                        <li><strong>Продукт</strong> — выберите продукт, для которого создаётся маршрут</li>
                        <li>Код генерируется автоматически (RS-XXX)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Добавление операций
                    </h4>
                    <div className="ml-8 space-y-2 text-sm text-muted-foreground">
                      <p>Добавьте операции в нужной последовательности. Типы операций:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li><strong>Производство</strong> — основные производственные операции (обработка, сборка)</li>
                        <li><strong>Транспортировка</strong> — перемещение между участками</li>
                        <li><strong>Контроль</strong> — проверка качества</li>
                      </ul>
                      <p className="mt-2">Для каждой операции укажите:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Название операции</li>
                        <li>Производственный участок</li>
                        <li>Время наладки (ПЗ) и время на единицу (Шт)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                      Привязка компонентов к операциям
                    </h4>
                    <div className="ml-8 space-y-2 text-sm text-muted-foreground">
                      <p>Для каждой производственной операции раскройте секцию <strong>"Компоненты операции"</strong> и выберите какие компоненты из спецификации потребляются на этой операции.</p>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 mt-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-amber-700 dark:text-amber-400 font-medium">Предупреждение о непривязанных компонентах</p>
                            <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                              Если не все компоненты спецификации привязаны к операциям, появится предупреждение. 
                              Используйте кнопку <strong>"Авто"</strong> для автоматического распределения всех компонентов по производственным операциям.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                      Проверка и сохранение
                    </h4>
                    <div className="ml-8 space-y-2 text-sm text-muted-foreground">
                      <p>Перейдите на вкладку <strong>"Визуализация"</strong> для проверки последовательности операций. Убедитесь, что:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>Операции расположены в правильном порядке</li>
                        <li>Все компоненты привязаны к операциям</li>
                        <li>Указаны производственные участки</li>
                      </ul>
                      <p className="mt-2">Нажмите <strong>"Сохранить"</strong> для создания техмаршрута.</p>
                    </div>
                  </div>

                  {/* Additional features */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-foreground mb-3">Дополнительные возможности</h4>
                    <div className="grid gap-3 md:grid-cols-3 text-sm">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Copy className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span><strong>Копирование</strong> — создайте копию существующего маршрута через меню ⋮</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Printer className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span><strong>Печать</strong> — распечатайте маршрут с детальной информацией</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <FileSpreadsheet className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span><strong>Excel</strong> — экспортируйте маршрут в Excel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Search and Grouping */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Top row: Search + Main action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="h-6 w-px bg-border" />

                {/* Selection mode toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectionMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectionMode) {
                            clearSelection();
                          } else {
                            setSelectionMode(true);
                          }
                        }}
                        className="gap-1.5 h-9"
                      >
                        <Sparkles className="h-4 w-4" />
                        Массовое
                        {selectedSheetIds.size > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {selectedSheetIds.size}
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Массовое распределение/очистка компонентов</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {selectionMode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllIncomplete}
                      className="gap-1.5 h-9"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Неполные
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllWithLinked}
                      className="gap-1.5 h-9"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      С привязками
                    </Button>
                    {selectedSheetIds.size > 0 && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setBulkDistributionOpen(true)}
                          className="gap-1.5 h-9 bg-gradient-to-r from-primary to-primary-glow"
                        >
                          <Sparkles className="h-4 w-4" />
                          Распределить ({selectedSheetIds.size})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkClearOpen(true)}
                          className="gap-1.5 h-9 text-destructive hover:text-destructive border-destructive/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          Очистить
                        </Button>
                      </>
                    )}
                  </>
                )}

                <div className="h-6 w-px bg-border" />

                {/* History button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openHistoryDialog()}
                  className="gap-1.5 h-9"
                >
                  <History className="h-4 w-4" />
                  История
                </Button>
              </div>

              {/* Second row: Filters and grouping */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Incomplete filter button */}
                <Button
                  variant={showIncompleteOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                  className="gap-1.5 h-9"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Неполные
                  {incompleteCount > 0 && (
                    <Badge variant={showIncompleteOnly ? "secondary" : "destructive"} className="h-5 px-1.5">
                      {incompleteCount}
                    </Badge>
                  )}
                </Button>

                <div className="h-6 w-px bg-border" />

                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <Select value={groupingMode} onValueChange={(v) => setGroupingMode(v as GroupingMode)}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Группировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без группировки</SelectItem>
                    <SelectItem value="product">По продуктам</SelectItem>
                    <SelectItem value="department">По отделам</SelectItem>
                  </SelectContent>
                </Select>
                {groupingMode === 'department' && (
                  <Select 
                    value={useInternalOperationOnly ? 'internal' : 'any'} 
                    onValueChange={(v) => setUseInternalOperationOnly(v === 'internal')}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Внутренние операции</SelectItem>
                      <SelectItem value="any">Все операции</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {groupingMode !== 'none' && groupedSheets && groupedSheets.length > 0 && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={expandAllGroups} className="h-9 w-9 p-0">
                      <ChevronsDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={collapseAllGroups} className="h-9 w-9 p-0">
                      <ChevronsUp className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Routing Sheets List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Загрузка техмаршрутов...</p>
            </CardContent>
          </Card>
        ) : filteredSheets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Технологические маршруты не найдены" : "Нет созданных техмаршрутов"}
              </p>
              {!searchQuery && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedSheet(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать первый техмаршрут
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
          {groupingMode !== 'none' && groupedSheets ? (
            // Grouped view
            <div className="space-y-4">
              {groupedSheets.map(([groupKey, group]) => {
                const isExpanded = expandedGroups.has(groupKey);
                return (
                  <div key={groupKey} className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-4 py-3 h-auto bg-muted/50 hover:bg-muted"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {group.sheets.length}
                        </Badge>
                      </div>
                    </Button>
                    {isExpanded && (
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20 ml-2">
                        {group.sheets.map((sheet) => {
                          const operations = sheet.routing_operations || [];
                          const totalTime = operations.reduce(
                            (sum: number, op: any) => sum + (op.setup_time_minutes || 0) + (op.cycle_time_minutes || 0),
                            0
                          );
                          return (
                            <Card
                              key={sheet.id}
                              className="transition-all hover:border-primary hover:shadow-md"
                            >
                              <CardContent className="p-6">
                                <div className="mb-4 flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    {selectionMode && (
                                      <Checkbox
                                        checked={selectedSheetIds.has(sheet.id)}
                                        onCheckedChange={() => toggleSheetSelection(sheet.id)}
                                        className="mt-1"
                                      />
                                    )}
                                    <div className="rounded-lg bg-primary/10 p-3">
                                      <GitBranch className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-foreground">{sheet.code}</h3>
                                        {sheet.is_active && (
                                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                            Активен
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {sheet.products && getProductTypeBadge(sheet.products.product_type)}
                                        <p className="text-xs text-muted-foreground">
                                          {sheet.products?.code} — {sheet.products?.name || "Не указан"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">⋮</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(sheet)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Редактировать
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleCopy(sheet)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Копировать
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handlePrintSheet(sheet)}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Печать
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleExportToExcel(sheet)}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Экспорт в Excel
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => {
                                        setConsolidatedRoutingProduct({
                                          id: sheet.product_id,
                                          name: sheet.products?.name || '',
                                          code: sheet.products?.code || '',
                                        });
                                        setConsolidatedRoutingOpen(true);
                                      }}>
                                        <Layers className="mr-2 h-4 w-4" />
                                        Сводный маршрут
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openHistoryDialog(sheet.id, sheet.code)}>
                                        <History className="mr-2 h-4 w-4" />
                                        История распределений
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDelete(sheet)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Удалить
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3 mb-4">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Settings className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Операций:</span>
                                    <span className="font-medium text-foreground">{operations.length}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Общее время:</span>
                                    <span className="font-medium text-foreground">
                                      {totalTime.toFixed(1)} мин ({(totalTime / 60).toFixed(1)} ч)
                                    </span>
                                  </div>
                                  {(() => {
                                    const stats = getSheetComponentStats(sheet);
                                    if (!stats.hasSpec || stats.totalSpecComponents === 0) return null;
                                    return (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 text-sm">
                                              <Package className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-muted-foreground">Компоненты:</span>
                                              <span className="font-medium text-foreground">
                                                {stats.linkedCount}/{stats.totalSpecComponents}
                                              </span>
                                              {stats.unlinkedCount > 0 && (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                                  {stats.unlinkedCount} не привязано
                                                </Badge>
                                              )}
                                              {stats.totalProductionOps > 0 && !stats.allOpsHaveMaterials && stats.unlinkedCount === 0 && (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                                  не на всех операциях ({stats.productionOpsWithMaterials}/{stats.totalProductionOps})
                                                </Badge>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <div className="space-y-1">
                                              <p>
                                                {stats.linkedCount} из {stats.totalSpecComponents} компонентов спецификации привязаны к операциям
                                              </p>
                                              {stats.totalProductionOps > 0 && (
                                                <p>
                                                  Операции с компонентами: {stats.productionOpsWithMaterials} из {stats.totalProductionOps}
                                                </p>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })()}
                                </div>

                                {operations.length > 0 && (
                                  <Collapsible className="mt-4 border-t pt-4 group">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                                        <span className="text-sm font-medium text-foreground">Маршрут:</span>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 -rotate-90 group-data-[state=open]:rotate-0" />
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3">
                                      <RoutingFlowDiagram
                                        operations={operations.map((op: any) => ({
                                          sequence: op.sequence,
                                          name: op.name,
                                          work_center_id: op.work_center_id,
                                          work_center_name: op.work_centers?.name,
                                          work_center_code: op.work_centers?.code,
                                          setup_time_minutes: op.setup_time_minutes || 0,
                                          cycle_time_minutes: op.cycle_time_minutes || 0,
                                          operation_type: op.operation_type || "production",
                                          is_external: op.is_external,
                                          external_contractor: op.contractors?.name || op.external_contractor,
                                          external_lead_time_days: op.external_lead_time_days,
                                          materials: op.routing_operation_materials?.map((m: any) => ({
                                            product_id: m.product_id,
                                            product_name: m.products?.name,
                                            product_code: m.products?.code,
                                            product_type: m.products?.product_type,
                                            quantity: m.quantity_per_operation,
                                            unit: m.products?.unit,
                                          })) || [],
                                        }))}
                                      />
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Non-grouped view
            <div className="space-y-4">
            {filteredSheets.map((sheet, index) => {
              const operations = sheet.routing_operations || [];
              const totalTime = operations.reduce(
                (sum: number, op: any) => sum + (op.setup_time_minutes || 0) + (op.cycle_time_minutes || 0),
                0
              );
              const isFirst = index === 0;
              const isLast = index === filteredSheets.length - 1;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const canDrag = !searchQuery;

              return (
                <Card
                  key={sheet.id}
                  className={`transition-all hover:border-primary hover:shadow-md ${
                    isDragging ? 'opacity-50 scale-[0.98] border-primary border-dashed' : ''
                  } ${
                    isDragOver ? 'border-primary border-2 shadow-lg' : ''
                  } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, index) : undefined}
                  onDragOver={canDrag ? (e) => handleDragOver(e, index) : undefined}
                  onDragLeave={canDrag ? handleDragLeave : undefined}
                  onDrop={canDrag ? (e) => handleDrop(e, index) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Reorder controls */}
                        {!searchQuery && (
                          <div className="flex flex-col items-center gap-0.5 mr-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-1 cursor-grab">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p>Перетащите для изменения порядка</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                          </div>
                        )}
                        {selectionMode && (
                          <Checkbox
                            checked={selectedSheetIds.has(sheet.id)}
                            onCheckedChange={() => toggleSheetSelection(sheet.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="rounded-lg bg-primary/10 p-3">
                          <GitBranch className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{sheet.code}</h3>
                            {sheet.is_active && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                                Активен
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {sheet.products && getProductTypeBadge(sheet.products.product_type)}
                            <p className="text-xs text-muted-foreground">
                              {sheet.products?.code} — {sheet.products?.name || "Не указан"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sheet)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(sheet)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Копировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleMoveUp(sheet)}
                            disabled={isFirst || reorderMutation.isPending}
                          >
                            <ArrowUp className="mr-2 h-4 w-4" />
                            Поднять вверх
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleMoveDown(sheet)}
                            disabled={isLast || reorderMutation.isPending}
                          >
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Опустить вниз
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handlePrintSheet(sheet)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Печать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportToExcel(sheet)}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Экспорт в Excel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setConsolidatedRoutingProduct({
                              id: sheet.product_id,
                              name: sheet.products?.name || '',
                              code: sheet.products?.code || '',
                            });
                            setConsolidatedRoutingOpen(true);
                          }}>
                            <Layers className="mr-2 h-4 w-4" />
                            Сводный маршрут
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openHistoryDialog(sheet.id, sheet.code)}>
                            <History className="mr-2 h-4 w-4" />
                            История распределений
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(sheet)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Операций:</span>
                        <span className="font-medium text-foreground">{operations.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Общее время:</span>
                        <span className="font-medium text-foreground">
                          {totalTime.toFixed(1)} мин ({(totalTime / 60).toFixed(1)} ч)
                        </span>
                      </div>
                      {(() => {
                        const stats = getSheetComponentStats(sheet);
                        if (!stats.hasSpec || stats.totalSpecComponents === 0) return null;
                        return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 text-sm">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Компоненты:</span>
                                <span className="font-medium text-foreground">
                                  {stats.linkedCount}/{stats.totalSpecComponents}
                                </span>
                                {stats.unlinkedCount > 0 && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {stats.unlinkedCount} не привязано
                                  </Badge>
                                )}
                                {stats.totalProductionOps > 0 && !stats.allOpsHaveMaterials && stats.unlinkedCount === 0 && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    не на всех операциях ({stats.productionOpsWithMaterials}/{stats.totalProductionOps})
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p>
                                  {stats.linkedCount} из {stats.totalSpecComponents} компонентов спецификации привязаны к операциям
                                </p>
                                {stats.totalProductionOps > 0 && (
                                  <p>
                                    Операции с компонентами: {stats.productionOpsWithMaterials} из {stats.totalProductionOps}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </div>

                  {operations.length > 0 && (
                    <Collapsible className="mt-4 border-t pt-4 group">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                          <span className="text-sm font-medium text-foreground">Маршрут:</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 -rotate-90 group-data-[state=open]:rotate-0" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <RoutingFlowDiagram
                            operations={operations.map((op: any) => ({
                              sequence: op.sequence,
                              name: op.name,
                              work_center_id: op.work_center_id,
                              work_center_name: op.work_centers?.name,
                              work_center_code: op.work_centers?.code,
                              setup_time_minutes: op.setup_time_minutes || 0,
                              cycle_time_minutes: op.cycle_time_minutes || 0,
                              operation_type: op.operation_type || "production",
                              is_external: op.is_external,
                              external_contractor: op.contractors?.name || op.external_contractor,
                              external_lead_time_days: op.external_lead_time_days,
                              materials: op.routing_operation_materials?.map((m: any) => ({
                                product_id: m.product_id,
                                product_name: m.products?.name,
                                product_code: m.products?.code,
                                product_type: m.products?.product_type,
                                quantity: m.quantity_per_operation,
                                unit: m.products?.unit,
                              })) || [],
                            }))}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
          {/* Bottom create button when more than 5 sheets */}
          {filteredSheets.length > 5 && (
            <div ref={bottomButtonRef} className="flex justify-center pt-6">
              <Button onClick={() => {
                setSelectedSheet(null);
                setDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Создать техмаршрут
              </Button>
            </div>
          )}
        </>
        )}
      </main>

      <RoutingSheetDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedSheet(null);
        }}
        routingSheet={selectedSheet}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <StandardOperationsDialog
        open={standardOpsDialogOpen}
        onOpenChange={setStandardOpsDialogOpen}
      />

      {consolidatedRoutingProduct && (
        <ConsolidatedRoutingDialog
          open={consolidatedRoutingOpen}
          onOpenChange={setConsolidatedRoutingOpen}
          productId={consolidatedRoutingProduct.id}
          productName={consolidatedRoutingProduct.name}
          productCode={consolidatedRoutingProduct.code}
        />
      )}

      {/* Hidden print view */}
      <div style={{ display: "none" }}>
        {sheetToPrint && (
          <RoutingSheetPrintView
            ref={printRef}
            sheet={sheetToPrint}
            operations={(sheetToPrint.routing_operations || []).map((op: any) => ({
              sequence: op.sequence,
              name: op.name,
              work_center_code: op.work_centers?.code,
              work_center_name: op.work_centers?.name,
              setup_time_minutes: op.setup_time_minutes || 0,
              cycle_time_minutes: op.cycle_time_minutes || 0,
              operation_type: op.operation_type || "production",
              materials: op.routing_operation_materials?.map((m: any) => ({
                product_id: m.product_id,
                product_name: m.products?.name,
                product_code: m.products?.code,
                product_type: m.products?.product_type,
                quantity: m.quantity_per_operation,
                unit: m.products?.unit,
              })) || [],
            }))}
          />
        )}
      </div>

      {/* Scroll button */}
      {showScrollButton && filteredSheets.length > 5 && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl bg-background/95 backdrop-blur transition-transform"
          onClick={handleScrollButton}
        >
          {scrollDirection === 'down' ? (
            <ChevronsDown className="h-5 w-5" />
          ) : (
            <ChevronsUp className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Bulk Distribution Dialog */}
      <BulkDistributionDialog
        open={bulkDistributionOpen}
        onOpenChange={setBulkDistributionOpen}
        selectedSheets={getSelectedSheetsForBulk()}
        onDistribute={handleBulkDistribution}
        isLoading={bulkDistributionLoading}
      />

      {/* Distribution History Dialog */}
      <DistributionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        routingSheetId={historySheetId}
        routingSheetName={historySheetName}
      />

      {/* Bulk Clear Distribution Dialog */}
      <BulkClearDistributionDialog
        open={bulkClearOpen}
        onOpenChange={setBulkClearOpen}
        selectedSheets={getSelectedSheetsForClear()}
        onClear={handleBulkClearDistribution}
        isLoading={bulkClearLoading}
      />
    </div>
  );
};

export default RoutingSheets;
