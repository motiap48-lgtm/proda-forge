import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Loader2, GitBranch, ArrowUp, Trash2, CheckSquare, Square, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUpIcon, MoreHorizontal, Play, Pause, XCircle, CheckCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { OrderHistoryPopover } from "@/components/production/OrderHistoryPopover";

const statusConfig = {
  planned: { label: "Запланировано", variant: "secondary" as const },
  released: { label: "Запущен", variant: "default" as const },
  in_progress: { label: "В производстве", variant: "default" as const },
  on_hold: { label: "Приостановлен", variant: "outline" as const },
  completed: { label: "Завершено", variant: "outline" as const },
  cancelled: { label: "Отменено", variant: "destructive" as const },
};

const priorityConfig = {
  low: { label: "Низкий", variant: "outline" as const },
  normal: { label: "Обычный", variant: "secondary" as const },
  high: { label: "Высокий", variant: "default" as const },
  urgent: { label: "Срочный", variant: "destructive" as const },
};

type HierarchyFilter = "all" | "parent" | "child" | "standalone";
type DateFilter = "all" | "today" | "week" | "month";
type SortField = "date" | "status" | "priority" | "order_number" | "updated";
type SortDirection = "asc" | "desc";

const dateFilterConfig = {
  all: { label: "Все даты" },
  today: { label: "Сегодня" },
  week: { label: "За неделю" },
  month: { label: "За месяц" },
};

const statusOrder = { planned: 0, released: 1, in_progress: 2, on_hold: 3, completed: 4, cancelled: 5 };
const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

const sortConfig: Record<SortField, { label: string }> = {
  date: { label: "По дате" },
  status: { label: "По статусу" },
  priority: { label: "По приоритету" },
  order_number: { label: "По номеру" },
  updated: { label: "По изменению" },
};

const ITEMS_PER_PAGE = 20;
const STORAGE_KEY = "production-orders-settings";

// Load settings from localStorage
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
  return {
    statusFilter: "all",
    hierarchyFilter: "all",
    dateFilter: "all",
    sortField: "date",
    sortDirection: "desc",
  };
};

const ProductionOrdersContent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const savedSettings = loadSettings();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(savedSettings.statusFilter);
  const [hierarchyFilter, setHierarchyFilter] = useState<HierarchyFilter>(savedSettings.hierarchyFilter);
  const [dateFilter, setDateFilter] = useState<DateFilter>(savedSettings.dateFilter || "all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteSelectedDialog, setShowDeleteSelectedDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<{ id: string; orderNumber: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(savedSettings.sortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(savedSettings.sortDirection);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const { data: orders, isLoading } = useProductionOrders();

  // Save settings to localStorage
  useEffect(() => {
    const settings = { statusFilter, hierarchyFilter, dateFilter, sortField, sortDirection };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [statusFilter, hierarchyFilter, dateFilter, sortField, sortDirection]);

  // Count orders by hierarchy type
  const hierarchyCounts = useMemo(() => {
    if (!orders) return { parent: 0, child: 0, standalone: 0 };
    
    const parentIds = new Set(orders.filter(o => o.parent_order_id).map(o => o.parent_order_id));
    
    return {
      parent: orders.filter(o => parentIds.has(o.id)).length,
      child: orders.filter(o => o.parent_order_id).length,
      standalone: orders.filter(o => !o.parent_order_id && !parentIds.has(o.id)).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    const parentIds = new Set(orders.filter(o => o.parent_order_id).map(o => o.parent_order_id));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const filtered = orders.filter((order) => {
      const productName = order.products?.name || "";
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      // Date filter (by updated_at)
      let matchesDate = true;
      if (dateFilter !== "all") {
        const updatedAt = new Date(order.updated_at);
        if (dateFilter === "today") {
          matchesDate = updatedAt >= todayStart;
        } else if (dateFilter === "week") {
          matchesDate = updatedAt >= weekAgo;
        } else if (dateFilter === "month") {
          matchesDate = updatedAt >= monthAgo;
        }
      }
      
      // Hierarchy filter
      let matchesHierarchy = true;
      if (hierarchyFilter === "parent") {
        matchesHierarchy = parentIds.has(order.id);
      } else if (hierarchyFilter === "child") {
        matchesHierarchy = !!order.parent_order_id;
      } else if (hierarchyFilter === "standalone") {
        matchesHierarchy = !order.parent_order_id && !parentIds.has(order.id);
      }
      
      return matchesSearch && matchesStatus && matchesHierarchy && matchesDate;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "date":
          comparison = new Date(a.planned_end_date).getTime() - new Date(b.planned_end_date).getTime();
          break;
        case "updated":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "status":
          comparison = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
          break;
        case "priority":
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case "order_number":
          comparison = a.order_number.localeCompare(b.order_number);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [orders, searchQuery, statusFilter, hierarchyFilter, dateFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, hierarchyFilter, dateFilter, sortField, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  // Quick action to update order status with history recording
  const updateOrderStatus = async (orderId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;
    
    const oldStatus = order.status;
    
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase
        .from("production_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Record history entry
      if (user) {
        await supabase.from("production_order_history").insert({
          production_order_id: orderId,
          user_id: user.id,
          change_type: "status_changed",
          old_value: oldStatus,
          new_value: newStatus,
          description: `Статус изменён с "${statusConfig[oldStatus as keyof typeof statusConfig]?.label || oldStatus}" на "${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}"`,
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success(`Статус изменён на "${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}"`);
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error("Ошибка при изменении статуса: " + error.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Open cancel confirmation dialog
  const handleCancelClick = (orderId: string, orderNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderToCancel({ id: orderId, orderNumber });
    setShowCancelDialog(true);
  };

  // Confirm and execute cancellation
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    
    const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
    await updateOrderStatus(orderToCancel.id, "cancelled", fakeEvent);
    setShowCancelDialog(false);
    setOrderToCancel(null);
  };

  // Helper to check if an order is a parent
  const isParentOrder = (orderId: string) => {
    return orders?.some(o => o.parent_order_id === orderId);
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(filteredOrders.map(o => o.id));
    setSelectedOrders(newSelected);
  };

  const deselectAll = () => {
    setSelectedOrders(new Set());
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedOrders(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const deleteOrdersByIds = async (orderIds: string[]) => {
    // Delete related data for these orders
    for (const orderId of orderIds) {
      await supabase.from("production_order_operations").delete().eq("production_order_id", orderId);
      await supabase.from("production_order_history").delete().eq("production_order_id", orderId);
      await supabase.from("material_reservations").delete().eq("production_order_id", orderId);
      
      // Get material issues for this order
      const { data: issues } = await supabase
        .from("material_issues")
        .select("id")
        .eq("production_order_id", orderId);
      
      if (issues) {
        for (const issue of issues) {
          await supabase.from("material_issue_lines").delete().eq("material_issue_id", issue.id);
        }
      }
      await supabase.from("material_issues").delete().eq("production_order_id", orderId);
    }
    
    // Delete the orders themselves
    const { error } = await supabase
      .from("production_orders")
      .delete()
      .in("id", orderIds);
    
    if (error) throw error;
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return;
    
    setIsDeleting(true);
    try {
      await deleteOrdersByIds(Array.from(selectedOrders));
      
      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success(`Удалено ${selectedOrders.size} заказов`);
      setSelectedOrders(new Set());
      setSelectionMode(false);
    } catch (error: any) {
      console.error("Error deleting orders:", error);
      toast.error("Ошибка при удалении заказов: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteSelectedDialog(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!orders || orders.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete in correct order: first related data, then orders
      await supabase.from("production_order_operations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("production_order_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("material_reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("material_issue_lines").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("material_issues").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      const { error } = await supabase.from("production_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      toast.success("Все производственные заказы удалены");
    } catch (error: any) {
      console.error("Error deleting orders:", error);
      toast.error("Ошибка при удалении заказов: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExportToExcel = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }

    const parentIds = new Set(orders?.filter(o => o.parent_order_id).map(o => o.parent_order_id) || []);

    const exportData = filteredOrders.map(order => ({
      "Номер заказа": order.order_number,
      "Продукт": order.products?.name || "N/A",
      "Код продукта": order.products?.code || "N/A",
      "Спецификация": order.specifications?.code || "N/A",
      "Количество план": order.quantity,
      "Количество факт": order.completed_quantity,
      "Прогресс %": ((order.completed_quantity / order.quantity) * 100).toFixed(1),
      "Статус": statusConfig[order.status as keyof typeof statusConfig]?.label || order.status,
      "Приоритет": priorityConfig[order.priority as keyof typeof priorityConfig]?.label || order.priority,
      "Дата начала план": new Date(order.planned_start_date).toLocaleDateString(),
      "Дата окончания план": new Date(order.planned_end_date).toLocaleDateString(),
      "Дата начала факт": order.actual_start_date ? new Date(order.actual_start_date).toLocaleDateString() : "",
      "Дата окончания факт": order.actual_end_date ? new Date(order.actual_end_date).toLocaleDateString() : "",
      "Производственный участок": order.work_centers?.name || "N/A",
      "Ответственный": order.responsible_person || "Не назначен",
      "Тип": order.parent_order_id ? "Дочерний" : parentIds.has(order.id) ? "Родительский" : "Одиночный",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Производственные заказы");
    
    // Auto-width columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row] || "").length)) + 2
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `Производственные_заказы_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Экспорт завершён");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Производственные заказы</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Управление и контроль производственных заказов</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {orders && orders.length > 0 && (
              <>
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="default"
                  onClick={toggleSelectionMode}
                >
                  {selectionMode ? <CheckSquare className="mr-2 h-5 w-5" /> : <Square className="mr-2 h-5 w-5" />}
                  {selectionMode ? "Отмена" : "Выбор"}
                </Button>
                {selectionMode && selectedOrders.size > 0 && (
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={() => setShowDeleteSelectedDialog(true)}
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Удалить ({selectedOrders.size})
                  </Button>
                )}
                {!selectionMode && (
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Удалить все
                  </Button>
                )}
              </>
            )}
            <Button
              size="default"
              className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl"
              onClick={() => navigate("/production-orders/new")}
            >
              <Plus className="mr-2 h-5 w-5" />
              Создать заказ
            </Button>
          </div>
        </div>

        {/* Selection Controls */}
        {selectionMode && (
          <Card className="mb-4">
            <CardContent className="p-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Выбрано: {selectedOrders.size} из {filteredOrders.length}
              </span>
              <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                Выбрать все
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Снять выбор
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру или продукту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Все
                </Button>
                <Button
                  variant={statusFilter === "planned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("planned")}
                >
                  Запланировано
                </Button>
                <Button
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  В работе
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Завершено
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={hierarchyFilter !== "all" ? "default" : "outline"} size="sm">
                      <GitBranch className="mr-2 h-4 w-4" />
                      {hierarchyFilter === "all" ? "Иерархия" : 
                       hierarchyFilter === "parent" ? "Родительские" :
                       hierarchyFilter === "child" ? "Дочерние" : "Одиночные"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setHierarchyFilter("all")}>
                      Все заказы
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setHierarchyFilter("parent")}>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Родительские ({hierarchyCounts.parent})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHierarchyFilter("child")}>
                      <GitBranch className="mr-2 h-4 w-4" />
                      Дочерние ({hierarchyCounts.child})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHierarchyFilter("standalone")}>
                      Одиночные ({hierarchyCounts.standalone})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={dateFilter !== "all" ? "default" : "outline"} size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilterConfig[dateFilter].label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDateFilter("all")}>
                      Все даты
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDateFilter("today")}>
                      Изменены сегодня
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter("week")}>
                      Изменены за неделю
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter("month")}>
                      Изменены за месяц
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {sortConfig[sortField].label}
                      {sortDirection === "asc" ? (
                        <ArrowUpIcon className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortField("date")}>
                      По дате окончания
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortField("updated")}>
                      По дате изменения
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortField("status")}>
                      По статусу
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortField("priority")}>
                      По приоритету
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortField("order_number")}>
                      По номеру заказа
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleSortDirection}>
                      {sortDirection === "asc" ? "По убыванию ↓" : "По возрастанию ↑"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Экспорт в Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3 sm:space-y-4">
          {paginatedOrders.map((order) => {
            const progress = (order.completed_quantity / order.quantity) * 100;
            const isSelected = selectedOrders.has(order.id);
            const isRecentlyUpdated = Date.now() - new Date(order.updated_at).getTime() < 24 * 60 * 60 * 1000;

            const cardStateClass = [
              isRecentlyUpdated ? "border-primary/40 bg-primary/5" : "",
              isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "",
            ]
              .filter(Boolean)
              .join(" ");
            
            return (
              <Card
                key={order.id}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${cardStateClass}`}
                onClick={() => {
                  if (selectionMode) {
                    toggleOrderSelection(order.id);
                  } else {
                    navigate(`/production-orders/${order.order_number}`);
                  }
                }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-4">
                    {selectionMode && (
                      <div className="flex items-start pt-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div className="flex-1 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Order Info */}
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">{order.order_number}</h3>
                          <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                            {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                          </Badge>
                          <Badge variant={priorityConfig[order.priority as keyof typeof priorityConfig]?.variant || "secondary"} className="text-xs">
                            {priorityConfig[order.priority as keyof typeof priorityConfig]?.label || order.priority}
                          </Badge>
                          {order.parent_order_id && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              <GitBranch className="h-3 w-3 mr-1" />
                              Дочерний
                            </Badge>
                          )}
                          {isParentOrder(order.id) && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              Родительский
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{order.products?.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Спецификация: {order.specifications?.code || "N/A"}
                        </p>
                      </div>

                      {/* Production Info */}
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Производство</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.completed_quantity} / {order.quantity} шт
                        </p>
                        {order.status === "in_progress" && (
                          <div className="mt-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Сроки</p>
                        <p className="text-sm text-foreground">
                          Начало: {new Date(order.planned_start_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-foreground">
                          Окончание: {new Date(order.planned_end_date).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Responsible */}
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Исполнение</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.work_centers?.name || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.responsible_person || "Не назначен"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-start gap-1">
                      {/* History Popover */}
                      <OrderHistoryPopover orderId={order.id} orderNumber={order.order_number} />
                      
                      {/* Quick Actions */}
                      {!selectionMode && order.status !== "completed" && order.status !== "cancelled" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingOrderId === order.id}>
                              {updatingOrderId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {order.status === "planned" && (
                              <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "released", e as any)}>
                                <Play className="mr-2 h-4 w-4 text-green-600" />
                                Запустить
                              </DropdownMenuItem>
                            )}
                            {order.status === "released" && (
                              <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "in_progress", e as any)}>
                                <Play className="mr-2 h-4 w-4 text-green-600" />
                                Начать производство
                              </DropdownMenuItem>
                            )}
                            {order.status === "in_progress" && (
                              <>
                                <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "completed", e as any)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Завершить
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "on_hold", e as any)}>
                                  <Pause className="mr-2 h-4 w-4 text-amber-600" />
                                  Приостановить
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "on_hold" && (
                              <DropdownMenuItem onClick={(e) => updateOrderStatus(order.id, "in_progress", e as any)}>
                                <Play className="mr-2 h-4 w-4 text-green-600" />
                                Возобновить
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleCancelClick(order.id, order.order_number, e as any)}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Отменить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Показано {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} из {filteredOrders.length}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* First page */}
                    {currentPage > 2 && (
                      <>
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {currentPage > 3 && <PaginationEllipsis />}
                      </>
                    )}

                    {/* Pages around current */}
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i;
                      if (page > totalPages) return null;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            isActive={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {/* Last page */}
                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && <PaginationEllipsis />}
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Заказы не найдены</p>
            </CardContent>
          </Card>
        )}

        {/* Delete All Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить все заказы?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить все {orders?.length || 0} производственных заказов? 
                Это действие необратимо и удалит также все связанные данные: операции, историю изменений, 
                резервирования материалов и акты выдачи.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить все
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Selected Confirmation Dialog */}
        <AlertDialog open={showDeleteSelectedDialog} onOpenChange={setShowDeleteSelectedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить выбранные заказы?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить {selectedOrders.size} выбранных заказов? 
                Это действие необратимо и удалит также все связанные данные.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить ({selectedOrders.size})
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Order Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Отменить заказ?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите отменить заказ {orderToCancel?.orderNumber}? 
                Это действие изменит статус заказа на "Отменено".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToCancel(null)}>Нет</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancel}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Отменить заказ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

const ProductionOrders = () => {
  return (
    <ProtectedRoute>
      <ProductionOrdersContent />
    </ProtectedRoute>
  );
};

export default ProductionOrders;
