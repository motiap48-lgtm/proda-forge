import { useState, useEffect, useRef, DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trash2, Wand2, ArrowUp, ArrowDown, Factory, Clock, 
  Truck, ClipboardCheck, Settings, Eye, Edit, GripVertical, AlertTriangle, Sparkles, ChevronDown
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts } from "@/hooks/useProducts";
import { useActiveWorkCenters } from "@/hooks/useWorkCenters";
import { useSpecifications } from "@/hooks/useSpecifications";
import { toast } from "sonner";
import { RoutingFlowDiagram } from "./RoutingFlowDiagram";
import { OperationMaterialsSection } from "./OperationMaterialsSection";
import { cn } from "@/lib/utils";

type OperationType = "production" | "transport" | "control" | "setup";

interface OperationMaterial {
  product_id: string;
  quantity_per_operation?: number | null;
}

interface Operation {
  id?: string;
  sequence: number;
  name: string;
  work_center_id: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: OperationType;
  materials?: OperationMaterial[];
}

interface RoutingSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routingSheet?: any;
  onSave: (data: {
    code: string;
    name: string;
    product_id: string;
    is_active: boolean;
    operations: Operation[];
  }) => Promise<void>;
  isLoading?: boolean;
}

const operationTypeOptions: { value: OperationType; label: string; icon: typeof Factory }[] = [
  { value: "production", label: "Производство", icon: Factory },
  { value: "transport", label: "Транспортировка", icon: Truck },
  { value: "control", label: "Контроль", icon: ClipboardCheck },
  { value: "setup", label: "Наладка", icon: Settings },
];

const operationTypeColors: Record<OperationType, string> = {
  production: "border-l-blue-500",
  transport: "border-l-amber-500",
  control: "border-l-green-500",
  setup: "border-l-purple-500",
};

export function RoutingSheetDialog({
  open,
  onOpenChange,
  routingSheet,
  onSave,
  isLoading,
}: RoutingSheetDialogProps) {
  const { data: products } = useProducts();
  const { data: workCenters } = useActiveWorkCenters();
  const { data: specifications } = useSpecifications();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [activeTab, setActiveTab] = useState("edit");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isEditing = !!routingSheet;

  useEffect(() => {
    if (routingSheet) {
      setCode(routingSheet.code || "");
      setName(routingSheet.name || "");
      setProductId(routingSheet.product_id || "");
      setIsActive(routingSheet.is_active ?? true);
      
      const existingOps = routingSheet.routing_operations?.map((op: any) => ({
        id: op.id,
        sequence: op.sequence,
        name: op.name,
        work_center_id: op.work_center_id || op.work_centers?.id,
        setup_time_minutes: op.setup_time_minutes || 0,
        cycle_time_minutes: op.cycle_time_minutes || 0,
        operation_type: op.operation_type || "production",
        materials: op.routing_operation_materials?.map((m: any) => ({
          product_id: m.product_id,
          quantity_per_operation: m.quantity_per_operation,
        })) || [],
      })) || [];
      
      setOperations(existingOps.sort((a: Operation, b: Operation) => a.sequence - b.sequence));
    } else {
      setCode("AUTO");
      setName("");
      setProductId("");
      setIsActive(true);
      setOperations([]);
    }
    setActiveTab("edit");
  }, [routingSheet, open]);

  const eligibleProducts = products?.filter(
    (p) => p.product_type !== "material" && p.is_active
  ) || [];

  const productOptions = eligibleProducts.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name}`,
    searchText: `${p.code} ${p.name}`,
  }));

  const workCenterOptions = workCenters?.map((wc) => ({
    value: wc.id,
    label: `${wc.code} — ${wc.name}`,
    searchText: `${wc.code} ${wc.name}`,
  })) || [];

  const operationsEndRef = useRef<HTMLDivElement>(null);

  const addOperation = (type: OperationType = "production") => {
    const newSequence = operations.length > 0 
      ? Math.max(...operations.map(o => o.sequence)) + 1 
      : 1;
    
    const defaultNames: Record<OperationType, string> = {
      production: "",
      transport: "Транспортировка между участками",
      control: "Контроль качества",
      setup: "Наладка оборудования",
    };
    
    setOperations([
      ...operations,
      {
        sequence: newSequence,
        name: defaultNames[type],
        work_center_id: "",
        setup_time_minutes: 0,
        cycle_time_minutes: type === "transport" ? 15 : 0,
        operation_type: type,
        materials: [],
      },
    ]);

    setTimeout(() => {
      operationsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 150);
  };

  const removeOperation = (index: number) => {
    const newOps = operations.filter((_, i) => i !== index);
    setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
  };

  const updateOperation = (index: number, updates: Partial<Operation>) => {
    setOperations(
      operations.map((op, i) => (i === index ? { ...op, ...updates } : op))
    );
  };

  const moveOperation = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === operations.length - 1)
    ) {
      return;
    }

    const newOps = [...operations];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newOps[index], newOps[targetIndex]] = [newOps[targetIndex], newOps[index]];
    setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOps = [...operations];
    const [draggedOp] = newOps.splice(draggedIndex, 1);
    newOps.splice(targetIndex, 0, draggedOp);
    
    setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!productId) {
      toast.error("Выберите продукт");
      return;
    }
    if (!name.trim()) {
      toast.error("Введите название техмаршрута");
      return;
    }
    if (operations.length === 0) {
      toast.error("Добавьте хотя бы одну операцию");
      return;
    }
    
    const invalidOps = operations.filter(
      (op) => !op.name.trim() || !op.work_center_id
    );
    if (invalidOps.length > 0) {
      toast.error("Заполните все поля операций (название и участок)");
      return;
    }

    await onSave({
      code: code === "AUTO" ? "" : code,
      name: name.trim(),
      product_id: productId,
      is_active: isActive,
      operations,
    });
  };

  const totalSetupTime = operations.reduce((sum, op) => sum + (op.setup_time_minutes || 0), 0);
  const totalCycleTime = operations.reduce((sum, op) => sum + (op.cycle_time_minutes || 0), 0);
  const selectedProduct = products?.find(p => p.id === productId);

  // Get specification materials for the selected product
  const productSpecification = specifications?.find(
    (s) => s.product_id === productId && s.is_active && !s.has_no_specification
  );
  const specificationMaterials = productSpecification?.specification_materials || [];

  // Calculate unlinked specification components
  const specMaterialIds = new Set(specificationMaterials.map((m: any) => m.material_id));
  const linkedMaterialIds = new Set<string>();
  operations.forEach(op => {
    op.materials?.forEach(m => linkedMaterialIds.add(m.product_id));
  });
  const unlinkedMaterials = specificationMaterials.filter(
    (m: any) => !linkedMaterialIds.has(m.material_id)
  );
  const hasUnlinkedComponents = unlinkedMaterials.length > 0 && specificationMaterials.length > 0;

  // Get production operations for menu
  const productionOps = operations.filter(op => op.operation_type === "production");

  // Helper to get unlinked materials
  const getUnlinkedMaterials = () => {
    const alreadyLinkedIds = new Set<string>();
    operations.forEach(op => {
      op.materials?.forEach(m => alreadyLinkedIds.add(m.product_id));
    });
    return specificationMaterials.filter(
      (m: any) => !alreadyLinkedIds.has(m.material_id)
    );
  };

  // Auto-distribute to specific operation
  const distributeToOperation = (targetSequence: number) => {
    const unlinkedMats = getUnlinkedMaterials();
    
    if (unlinkedMats.length === 0) {
      toast.info("Все компоненты уже распределены по операциям");
      return;
    }

    const targetOp = operations.find(op => op.sequence === targetSequence);
    const updatedOperations = operations.map(op => {
      if (op.sequence === targetSequence) {
        const existingMaterials = op.materials || [];
        const newMaterials = unlinkedMats.map((m: any) => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
        
        return {
          ...op,
          materials: [...existingMaterials, ...newMaterials],
        };
      }
      return op;
    });

    setOperations(updatedOperations);
    toast.success(`${unlinkedMats.length} компонент(ов) распределено на операцию "${targetOp?.name || targetSequence}"`);
  };

  // Smart distribution by product type
  const distributeByProductType = () => {
    const unlinkedMats = getUnlinkedMaterials();
    
    if (unlinkedMats.length === 0) {
      toast.info("Все компоненты уже распределены по операциям");
      return;
    }

    if (productionOps.length === 0) {
      toast.error("Добавьте производственные операции для распределения");
      return;
    }

    // Get product info for each material
    const materialsWithInfo = unlinkedMats.map((m: any) => ({
      ...m,
      productInfo: products?.find(p => p.id === m.material_id),
    }));

    // Separate by type: materials go to first production op, assemblies/semi-finished to last
    const rawMaterials = materialsWithInfo.filter((m: any) => m.productInfo?.product_type === "material");
    const components = materialsWithInfo.filter((m: any) => 
      m.productInfo?.product_type === "semi-finished" || m.productInfo?.product_type === "assembly"
    );
    const finishedGoods = materialsWithInfo.filter((m: any) => m.productInfo?.product_type === "finished");
    const unknown = materialsWithInfo.filter((m: any) => !m.productInfo);

    const firstProductionSeq = productionOps[0].sequence;
    const lastProductionSeq = productionOps[productionOps.length - 1].sequence;
    // Middle operation if available
    const middleIdx = Math.floor(productionOps.length / 2);
    const middleProductionSeq = productionOps.length > 2 ? productionOps[middleIdx].sequence : lastProductionSeq;

    const updatedOperations = operations.map(op => {
      let materialsToAdd: any[] = [];

      if (op.sequence === firstProductionSeq) {
        // Raw materials go to first operation
        materialsToAdd = rawMaterials.map((m: any) => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
      }

      if (productionOps.length > 2 && op.sequence === middleProductionSeq) {
        // Semi-finished products go to middle operation
        materialsToAdd = components.map((m: any) => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
      } else if (productionOps.length <= 2 && op.sequence === lastProductionSeq) {
        // If only 1-2 operations, components go to last
        materialsToAdd = [
          ...components.map((m: any) => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          })),
        ];
      }

      if (op.sequence === lastProductionSeq) {
        // Finished goods and unknown go to last operation
        materialsToAdd = [
          ...materialsToAdd,
          ...finishedGoods.map((m: any) => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          })),
          ...unknown.map((m: any) => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          })),
        ];
        // If only 1-2 ops and components weren't added to middle
        if (productionOps.length <= 2) {
          materialsToAdd = [
            ...materialsToAdd,
            ...components.map((m: any) => ({
              product_id: m.material_id,
              quantity_per_operation: m.quantity,
            })),
          ];
        }
      }

      if (materialsToAdd.length > 0) {
        const existingMaterials = op.materials || [];
        // Dedupe by product_id
        const existingIds = new Set(existingMaterials.map(m => m.product_id));
        const newMaterials = materialsToAdd.filter(m => !existingIds.has(m.product_id));
        
        return {
          ...op,
          materials: [...existingMaterials, ...newMaterials],
        };
      }
      return op;
    });

    setOperations(updatedOperations);
    
    const distributed = {
      materials: rawMaterials.length,
      components: components.length,
      other: finishedGoods.length + unknown.length,
    };
    toast.success(
      `Распределено: ${distributed.materials} материалов на первую операцию, ${distributed.components} ПФ/СБ ${productionOps.length > 2 ? 'на среднюю' : 'на последнюю'}, ${distributed.other} прочих на последнюю`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редактирование техмаршрута" : "Создание техмаршрута"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="edit" className="gap-2">
              <Edit className="h-4 w-4" />
              Редактирование
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2" disabled={operations.length === 0}>
              <Eye className="h-4 w-4" />
              Визуализация
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Код</Label>
                  <div className="relative">
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Авто"
                      disabled={code === "AUTO"}
                      className="pr-10"
                    />
                    {code === "AUTO" && (
                      <Wand2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Код генерируется автоматически (RS-XXX)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Маршрут сборки изделия"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Продукт *</Label>
                  <SearchableSelect
                    options={productOptions}
                    value={productId}
                    onValueChange={setProductId}
                    placeholder="Выберите продукт"
                    searchPlaceholder="Поиск по коду или названию..."
                    emptyText="Продукт не найден"
                  />
                  <p className="text-xs text-muted-foreground">
                    Только ГП, СБ и ПФ (не материалы)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Статус</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <span className="text-sm">
                      {isActive ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning for unlinked components with auto-distribute button */}
              {hasUnlinkedComponents && operations.length > 0 && (
                <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-medium">{unlinkedMaterials.length} компонент{unlinkedMaterials.length === 1 ? '' : unlinkedMaterials.length < 5 ? 'а' : 'ов'}</span> из спецификации не привязан{unlinkedMaterials.length === 1 ? '' : 'о'} к операциям:
                      <span className="ml-1 text-muted-foreground">
                        {unlinkedMaterials.slice(0, 3).map((m: any) => m.products?.code || m.products?.name).join(", ")}
                        {unlinkedMaterials.length > 3 && ` и ещё ${unlinkedMaterials.length - 3}...`}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="shrink-0 gap-1.5"
                        >
                          <Sparkles className="h-4 w-4" />
                          Авто
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={distributeByProductType} className="gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span>Умное распределение</span>
                            <span className="text-xs text-muted-foreground">Материалы → первая, ПФ/СБ → последняя</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="gap-2">
                            <Factory className="h-4 w-4" />
                            Выбрать операцию
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {productionOps.length === 0 ? (
                              <DropdownMenuItem disabled>
                                Нет производственных операций
                              </DropdownMenuItem>
                            ) : (
                              productionOps.map(op => (
                                <DropdownMenuItem 
                                  key={op.sequence} 
                                  onClick={() => distributeToOperation(op.sequence)}
                                  className="gap-2"
                                >
                                  <span className="text-xs text-muted-foreground w-4">{op.sequence}.</span>
                                  {op.name || "Без названия"}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-medium">Операции</h3>
                    <p className="text-sm text-muted-foreground">
                      Последовательность операций маршрута
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => addOperation("production")} variant="outline" size="sm" className="gap-1.5">
                      <Factory className="h-4 w-4" />
                      Производство
                    </Button>
                    <Button onClick={() => addOperation("transport")} variant="outline" size="sm" className="gap-1.5">
                      <Truck className="h-4 w-4" />
                      Транспортировка
                    </Button>
                    <Button onClick={() => addOperation("control")} variant="outline" size="sm" className="gap-1.5">
                      <ClipboardCheck className="h-4 w-4" />
                      Контроль
                    </Button>
                  </div>
                </div>

                {operations.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">
                        Добавьте операции для создания техмаршрута
                      </p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        <Button onClick={() => addOperation("production")} variant="outline">
                          <Factory className="mr-2 h-4 w-4" />
                          Производственная
                        </Button>
                        <Button onClick={() => addOperation("transport")} variant="outline">
                          <Truck className="mr-2 h-4 w-4" />
                          Транспортировка
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {operations.map((op, index) => {
                      const typeConfig = operationTypeOptions.find(t => t.value === op.operation_type);
                      const TypeIcon = typeConfig?.icon || Factory;
                      
                      return (
                        <Card 
                          key={index} 
                          className={cn(
                            "border-l-4 transition-all duration-200",
                            operationTypeColors[op.operation_type],
                            draggedIndex === index && "opacity-50 scale-[0.98]",
                            dragOverIndex === index && "ring-2 ring-primary ring-offset-2"
                          )}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-1 pt-2">
                                <div 
                                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                                  title="Перетащите для изменения порядка"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <Badge variant="secondary" className="font-mono text-lg px-3">
                                  {op.sequence}
                                </Badge>
                                <div className="flex flex-col gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveOperation(index, "up")}
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveOperation(index, "down")}
                                    disabled={index === operations.length - 1}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {operationTypeOptions.map(typeOpt => {
                                    const Icon = typeOpt.icon;
                                    const isSelected = op.operation_type === typeOpt.value;
                                    return (
                                      <Button
                                        key={typeOpt.value}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => updateOperation(index, { operation_type: typeOpt.value })}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                        {typeOpt.label}
                                      </Button>
                                    );
                                  })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Название операции *</Label>
                                    <Input
                                      value={op.name}
                                      onChange={(e) =>
                                        updateOperation(index, { name: e.target.value })
                                      }
                                      placeholder={
                                        op.operation_type === "transport" 
                                          ? "Транспортировка в цех 2" 
                                          : "Например: Токарная обработка"
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Производственный участок *</Label>
                                    <SearchableSelect
                                      options={workCenterOptions}
                                      value={op.work_center_id}
                                      onValueChange={(v) =>
                                        updateOperation(index, { work_center_id: v })
                                      }
                                      placeholder={
                                        op.operation_type === "transport"
                                          ? "Участок назначения"
                                          : "Выберите участок"
                                      }
                                      searchPlaceholder="Поиск..."
                                      emptyText="Участок не найден"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Время наладки (ПЗ), мин</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={op.setup_time_minutes}
                                      onChange={(e) =>
                                        updateOperation(index, {
                                          setup_time_minutes: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>
                                      {op.operation_type === "transport" ? "Время транспортировки, мин" : "Штучное время, мин"}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={op.cycle_time_minutes}
                                      onChange={(e) =>
                                        updateOperation(index, {
                                          cycle_time_minutes: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                {specificationMaterials.length > 0 && (
                                  <OperationMaterialsSection
                                    operationIndex={index}
                                    operationName={op.name}
                                    specificationMaterials={specificationMaterials}
                                    selectedMaterials={op.materials || []}
                                    onMaterialsChange={(materials) =>
                                      updateOperation(index, { materials })
                                    }
                                  />
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeOperation(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Итого:</span>
                          </div>
                          <div className="flex gap-6 text-sm flex-wrap">
                            <div>
                              <span className="text-muted-foreground">Наладка: </span>
                              <span className="font-medium">{totalSetupTime} мин</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Штучное: </span>
                              <span className="font-medium">{totalCycleTime} мин</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Всего: </span>
                              <span className="font-bold">{totalSetupTime + totalCycleTime} мин</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div ref={operationsEndRef} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view">
            <div className="space-y-6">
              {selectedProduct && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Factory className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.code}</p>
                  </div>
                </div>
              )}

              <RoutingFlowDiagram 
                operations={operations}
                workCenters={workCenters || []}
                editable
                onReorder={(fromIndex, toIndex) => {
                  const newOps = [...operations];
                  const [draggedOp] = newOps.splice(fromIndex, 1);
                  newOps.splice(toIndex, 0, draggedOp);
                  setOperations(newOps.map((op, i) => ({ ...op, sequence: i + 1 })));
                }}
              />

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Общее время:</span>
                    </div>
                    <div className="flex gap-6 text-sm flex-wrap">
                      <div>
                        <span className="text-muted-foreground">Операций: </span>
                        <span className="font-medium">{operations.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Наладка: </span>
                        <span className="font-medium">{totalSetupTime} мин</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Обработка: </span>
                        <span className="font-medium">{totalCycleTime} мин</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Всего: </span>
                        <span className="font-bold">{totalSetupTime + totalCycleTime} мин</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setActiveTab("edit")}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
