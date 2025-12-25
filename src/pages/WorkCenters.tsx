import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Factory, Loader2, Edit, Trash2, Wrench, Filter, LayoutGrid, Layers, BarChart3, Package, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useWorkCenters, useDeleteWorkCenter } from "@/hooks/useWorkCenters";
import { useEquipment } from "@/hooks/useEquipment";
import { useRoutingSheets } from "@/hooks/useRoutingSheets";
import { WorkCenterDialog } from "@/components/work-centers/WorkCenterDialog";
import { EquipmentManagement } from "@/components/work-centers/EquipmentManagement";
import { EquipmentPrintExport } from "@/components/work-centers/EquipmentPrintExport";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

type EquipmentStatus = "all" | "active" | "maintenance" | "broken" | "inactive";

const EQUIPMENT_STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Активно" },
  { value: "maintenance", label: "На ТО" },
  { value: "broken", label: "Сломано" },
  { value: "inactive", label: "Неактивно" },
];

const WorkCenters = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<any>(null);
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<EquipmentStatus>("all");
  const [groupByDepartment, setGroupByDepartment] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  const { data: workCenters, isLoading } = useWorkCenters();
  const { data: allEquipment } = useEquipment();
  const { data: routingSheets } = useRoutingSheets();
  const deleteMutation = useDeleteWorkCenter();

  // Get products produced at each work center based on routing operations
  const productsByWorkCenter = useMemo(() => {
    if (!routingSheets) return {};
    
    const result: Record<string, Array<{
      productId: string;
      productCode: string;
      productName: string;
      productType: string;
      operationName: string;
      isLastOperation: boolean;
    }>> = {};
    
    routingSheets.forEach((sheet: any) => {
      if (!sheet.routing_operations || !sheet.products) return;
      
      const operations = [...sheet.routing_operations].sort((a, b) => a.sequence - b.sequence);
      const lastOpIndex = operations.length - 1;
      
      operations.forEach((op: any, index: number) => {
        const wcId = op.work_center_id;
        if (!result[wcId]) {
          result[wcId] = [];
        }
        
        // Check if product already added for this work center
        const existingProduct = result[wcId].find(p => p.productId === sheet.products.id);
        if (!existingProduct) {
          result[wcId].push({
            productId: sheet.products.id,
            productCode: sheet.products.code,
            productName: sheet.products.name,
            productType: sheet.products.product_type,
            operationName: op.name,
            isLastOperation: index === lastOpIndex,
          });
        } else if (index === lastOpIndex) {
          // Mark as last operation if this is the final step
          existingProduct.isLastOperation = true;
        }
      });
    });
    
    return result;
  }, [routingSheets]);

  // Count equipment per work center
  const equipmentCountsByWorkCenter = useMemo(() => {
    if (!allEquipment) return {};
    
    const counts: Record<string, { total: number; byStatus: Record<string, number> }> = {};
    
    allEquipment.forEach((item: any) => {
      const wcId = item.work_center_id;
      if (!counts[wcId]) {
        counts[wcId] = { total: 0, byStatus: {} };
      }
      counts[wcId].total++;
      counts[wcId].byStatus[item.status] = (counts[wcId].byStatus[item.status] || 0) + 1;
    });
    
    return counts;
  }, [allEquipment]);

  // Filter work centers based on equipment status filter
  const filteredCenters = useMemo(() => {
    let centers = (workCenters || []).filter(
      (center: any) =>
        center.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        center.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        center.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by equipment status
    if (equipmentStatusFilter !== "all") {
      centers = centers.filter((center: any) => {
        const counts = equipmentCountsByWorkCenter[center.id];
        return counts && counts.byStatus[equipmentStatusFilter] > 0;
      });
    }

    return centers;
  }, [workCenters, searchQuery, equipmentStatusFilter, equipmentCountsByWorkCenter]);

  // Group centers by department
  const groupedCenters = useMemo(() => {
    if (!groupByDepartment) return null;
    
    const groups: Record<string, any[]> = {};
    filteredCenters.forEach((center: any) => {
      const dept = center.department || "Без цеха";
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(center);
    });
    
    // Sort departments alphabetically
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "ru"))
    );
  }, [filteredCenters, groupByDepartment]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredCenters.map((center: any) => {
      const loadPercent = 0; // TODO: Calculate from production orders
      return {
        name: center.code,
        fullName: center.name,
        capacity: center.capacity_minutes_per_day,
        efficiency: center.efficiency_percent,
        load: loadPercent,
        equipment: equipmentCountsByWorkCenter[center.id]?.total || 0,
      };
    });
  }, [filteredCenters, equipmentCountsByWorkCenter]);

  // Initialize expanded departments
  useMemo(() => {
    if (groupByDepartment && groupedCenters) {
      setExpandedDepartments(new Set(Object.keys(groupedCenters)));
    }
  }, [groupByDepartment, groupedCenters]);

  const toggleDepartment = (dept: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Активен</Badge>;
      case "maintenance":
        return <Badge variant="default">На обслуживании</Badge>;
      case "inactive":
        return <Badge variant="secondary">Неактивен</Badge>;
      default:
        return null;
    }
  };

  const getEquipmentStatusLabel = (status: EquipmentStatus) => {
    return EQUIPMENT_STATUS_OPTIONS.find(o => o.value === status)?.label || "Все статусы";
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

  const renderWorkCenterCard = (center: any) => {
    const loadPercent = 0; // TODO: Calculate from production orders
    const equipmentCounts = equipmentCountsByWorkCenter[center.id] || { total: 0, byStatus: {} };
    const products = productsByWorkCenter[center.id] || [];
    const producedHere = products.filter(p => p.isLastOperation); // Products that "exit" this work center
    const processedHere = products.filter(p => !p.isLastOperation); // Products that pass through
    
    return (
      <Card
        key={center.id}
        className="transition-all hover:border-primary hover:shadow-md"
      >
        <CardContent className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Factory className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{center.code}</h3>
                  {getStatusBadge(center.status)}
                </div>
                <p className="text-sm font-medium text-foreground">{center.name}</p>
                {!groupByDepartment && (
                  <p className="text-xs text-muted-foreground">{center.department || "Без цеха"}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">⋮</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedWorkCenter(center);
                    setEquipmentDialogOpen(true);
                  }}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Оборудование
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedWorkCenter(center);
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Удалить производственный участок?")) {
                      deleteMutation.mutate(center.id);
                    }
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Products Produced Here */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Производимая продукция</span>
              </div>
              <Badge variant="outline" className="font-bold">
                {products.length}
              </Badge>
            </div>
            {products.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-1.5">
                  {producedHere.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Выпуск (последняя операция):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {producedHere.slice(0, 5).map((product) => (
                          <UITooltip key={product.productId}>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                {getProductTypeBadge(product.productType)}
                                <Badge variant="outline" className="text-xs font-normal">
                                  {product.productCode}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">Операция: {product.operationName}</p>
                            </TooltipContent>
                          </UITooltip>
                        ))}
                        {producedHere.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{producedHere.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {processedHere.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Обработка (промежуточные операции):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {processedHere.slice(0, 3).map((product) => (
                          <UITooltip key={product.productId}>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                {getProductTypeBadge(product.productType)}
                                <Badge variant="outline" className="text-xs font-normal bg-muted/50">
                                  {product.productCode}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">Операция: {product.operationName}</p>
                            </TooltipContent>
                          </UITooltip>
                        ))}
                        {processedHere.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{processedHere.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipProvider>
            ) : (
              <p className="text-xs text-muted-foreground italic">Нет привязанных продуктов</p>
            )}
          </div>

          {/* Equipment Count */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Оборудование</span>
              </div>
              <Badge variant="outline" className="font-bold">
                {equipmentCounts.total}
              </Badge>
            </div>
            {equipmentCounts.total > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {equipmentCounts.byStatus.active > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                    {equipmentCounts.byStatus.active} активно
                  </Badge>
                )}
                {equipmentCounts.byStatus.maintenance > 0 && (
                  <Badge variant="default" className="text-xs">
                    {equipmentCounts.byStatus.maintenance} на ТО
                  </Badge>
                )}
                {equipmentCounts.byStatus.broken > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {equipmentCounts.byStatus.broken} сломано
                  </Badge>
                )}
                {equipmentCounts.byStatus.inactive > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {equipmentCounts.byStatus.inactive} неактивно
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Capacity and Load */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Загрузка</span>
              <span className="text-sm font-bold text-green-600">
                {loadPercent.toFixed(0)}%
              </span>
            </div>
            <Progress value={loadPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              0 из {center.capacity_minutes_per_day} мин/день
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Эффективность</p>
              <p className="text-sm font-bold text-foreground">{center.efficiency_percent}%</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Мощность</p>
              <p className="text-sm font-bold text-foreground">{center.capacity_minutes_per_day} мин</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Производственные участки</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Управление производственными участками и оборудованием
            </p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2">
            <EquipmentPrintExport />
            <Button
              className="bg-gradient-to-r from-primary to-primary-glow shadow-lg hover:shadow-xl w-full xs:w-auto"
              onClick={() => {
                setSelectedWorkCenter(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Добавить участок
            </Button>
          </div>
        </div>

        {/* Capacity Chart */}
        {showChart && chartData.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Мощность и эффективность участков
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChart(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          capacity: 'Мощность (мин/день)',
                          efficiency: 'Эффективность (%)',
                          equipment: 'Оборудование (шт)',
                        };
                        return [value, labels[name] || name];
                      }}
                      labelFormatter={(label) => {
                        const item = chartData.find(d => d.name === label);
                        return item?.fullName || label;
                      }}
                    />
                    <Bar dataKey="capacity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="capacity">
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={`hsl(var(--primary) / ${0.5 + (entry.efficiency / 200)})`}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="efficiency" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="efficiency" />
                    <Bar dataKey="equipment" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="equipment" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-xs text-muted-foreground">Мощность</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
                  <span className="text-xs text-muted-foreground">Эффективность</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Оборудование</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!showChart && chartData.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mb-4"
            onClick={() => setShowChart(true)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Показать диаграмму
          </Button>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                placeholder="Поиск по номеру, названию или цеху..."
                value={searchQuery}
                onChange={setSearchQuery}
                containerClassName="flex-1"
              />
              
              {/* Group Toggle */}
              <Button
                variant={groupByDepartment ? "default" : "outline"}
                onClick={() => setGroupByDepartment(!groupByDepartment)}
                className="min-w-[180px]"
              >
                {groupByDepartment ? (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    По цехам
                  </>
                ) : (
                  <>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Все участки
                  </>
                )}
              </Button>
              
              {/* Equipment Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[180px] justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{getEquipmentStatusLabel(equipmentStatusFilter)}</span>
                    </div>
                    {equipmentStatusFilter !== "all" && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        1
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  {EQUIPMENT_STATUS_OPTIONS.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={equipmentStatusFilter === option.value}
                      onCheckedChange={() => setEquipmentStatusFilter(option.value)}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {equipmentStatusFilter !== "all" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEquipmentStatusFilter("all")}>
                        Сбросить фильтр
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Work Centers List */}
        {groupByDepartment && groupedCenters ? (
          <div className="space-y-4">
            {Object.entries(groupedCenters).map(([department, centers]) => (
              <Collapsible
                key={department}
                open={expandedDepartments.has(department)}
                onOpenChange={() => toggleDepartment(department)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-3">
                          <Factory className="h-5 w-5 text-primary" />
                          {department}
                          <Badge variant="secondary">{centers.length}</Badge>
                        </CardTitle>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            expandedDepartments.has(department) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        {centers.map((center: any) => renderWorkCenterCard(center))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCenters.map((center: any) => renderWorkCenterCard(center))}
          </div>
        )}

        {filteredCenters.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Производственные участки не найдены</p>
            </CardContent>
          </Card>
        )}

        <WorkCenterDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          workCenter={selectedWorkCenter}
        />

        <EquipmentManagement
          open={equipmentDialogOpen}
          onOpenChange={setEquipmentDialogOpen}
          workCenter={selectedWorkCenter}
        />
      </main>
    </div>
  );
};

export default WorkCenters;
