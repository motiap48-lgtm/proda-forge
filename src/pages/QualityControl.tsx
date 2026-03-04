import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, ClipboardCheck, AlertTriangle, Trash2, Pencil, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { useQualityInspections, type QualityInspection, type DefectType } from "@/hooks/useQualityInspections";
import { QualityInspectionDialog } from "@/components/quality/QualityInspectionDialog";
import { DefectTypeDialog } from "@/components/quality/DefectTypeDialog";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useTabPersistence } from "@/hooks/useTabPersistence";

const resultBadge = (result: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Ожидает", variant: "secondary" },
    passed: { label: "Годен", variant: "default" },
    rejected: { label: "Брак", variant: "destructive" },
    rework: { label: "Доработка", variant: "outline" },
    conditional: { label: "Условно годен", variant: "secondary" },
  };
  const r = map[result] || { label: result, variant: "secondary" as const };
  return <Badge variant={r.variant}>{r.label}</Badge>;
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    pending: { label: "Черновик", variant: "secondary" },
    in_progress: { label: "В работе", variant: "outline" },
    completed: { label: "Завершён", variant: "default" },
  };
  const s = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

const severityBadge = (severity: string) => {
  const map: Record<string, { label: string; className: string }> = {
    minor: { label: "Незначительный", className: "bg-muted text-muted-foreground" },
    major: { label: "Значительный", className: "bg-warning/20 text-warning" },
    critical: { label: "Критический", className: "bg-destructive/20 text-destructive" },
  };
  const s = map[severity] || { label: severity, className: "" };
  return <Badge className={s.className}>{s.label}</Badge>;
};

const QualityControl = () => {
  const [activeTab, setActiveTab] = useTabPersistence("inspections", "tab");
  const [search, setSearch] = useState("");
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [editingDefectType, setEditingDefectType] = useState<DefectType | null>(null);
  const [defaultInspNum, setDefaultInspNum] = useState("");

  const { hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("production_manager");

  const {
    inspections, isLoadingInspections,
    defectTypes, isLoadingDefectTypes,
    createInspection, updateInspection, deleteInspection,
    createDefectType, updateDefectType, deleteDefectType,
    generateInspectionNumber,
  } = useQualityInspections();

  const { data: orders } = useProductionOrders();
  const productionOrdersList = (orders || []).map(o => ({ id: o.id, order_number: o.order_number }));

  const filteredInspections = inspections.filter(i =>
    i.inspection_number.toLowerCase().includes(search.toLowerCase()) ||
    i.production_order?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.defect_description?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDefectTypes = defectTypes.filter(d =>
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewInspection = async () => {
    const num = await generateInspectionNumber();
    setDefaultInspNum(num);
    setEditingInspection(null);
    setInspectionDialogOpen(true);
  };

  const handleInspectionSubmit = (data: Partial<QualityInspection>) => {
    if (data.id) {
      updateInspection.mutate(data as any, { onSuccess: () => setInspectionDialogOpen(false) });
    } else {
      createInspection.mutate(data, { onSuccess: () => setInspectionDialogOpen(false) });
    }
  };

  const handleDefectSubmit = (data: Partial<DefectType>) => {
    if (data.id) {
      updateDefectType.mutate(data as any, { onSuccess: () => setDefectDialogOpen(false) });
    } else {
      createDefectType.mutate(data, { onSuccess: () => setDefectDialogOpen(false) });
    }
  };

  // Stats
  const totalInspections = inspections.length;
  const passedCount = inspections.filter(i => i.result === "passed").length;
  const rejectedCount = inspections.filter(i => i.result === "rejected").length;
  const reworkCount = inspections.filter(i => i.result === "rework").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Управление качеством (ОТК)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Акты контроля, типы дефектов, статистика качества</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Всего актов</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalInspections}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">Годных</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-accent">{passedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Брак</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-destructive">{rejectedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Доработка</span>
              </div>
              <p className="text-2xl font-bold mt-1">{reworkCount}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="inspections">Акты ОТК</TabsTrigger>
              <TabsTrigger value="defect-types">Типы дефектов</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              {activeTab === "inspections" && canManage && (
                <Button onClick={handleNewInspection} size="sm"><Plus className="h-4 w-4 mr-1" />Акт</Button>
              )}
              {activeTab === "defect-types" && canManage && (
                <Button onClick={() => { setEditingDefectType(null); setDefectDialogOpen(true); }} size="sm"><Plus className="h-4 w-4 mr-1" />Тип</Button>
              )}
            </div>
          </div>

          <TabsContent value="inspections" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Номер</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Заказ</TableHead>
                        <TableHead className="text-center">Проверено</TableHead>
                        <TableHead className="text-center">Годных</TableHead>
                        <TableHead className="text-center">Брак</TableHead>
                        <TableHead>Результат</TableHead>
                        <TableHead>Статус</TableHead>
                        {canManage && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingInspections ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell></TableRow>
                      ) : filteredInspections.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Нет актов контроля качества</TableCell></TableRow>
                      ) : filteredInspections.map(i => (
                        <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { if (canManage) { setEditingInspection(i); setInspectionDialogOpen(true); } }}>
                          <TableCell className="font-medium">{i.inspection_number}</TableCell>
                          <TableCell>{format(new Date(i.inspection_date), "dd.MM.yyyy", { locale: ru })}</TableCell>
                          <TableCell>{i.production_order?.order_number || "—"}</TableCell>
                          <TableCell className="text-center">{i.inspected_quantity}</TableCell>
                          <TableCell className="text-center">{i.passed_quantity}</TableCell>
                          <TableCell className="text-center">{i.rejected_quantity}</TableCell>
                          <TableCell>{resultBadge(i.result)}</TableCell>
                          <TableCell>{statusBadge(i.status)}</TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditingInspection(i); setInspectionDialogOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteInspection.mutate(i.id); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defect-types" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Код</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Серьёзность</TableHead>
                        <TableHead>Статус</TableHead>
                        {canManage && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingDefectTypes ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell></TableRow>
                      ) : filteredDefectTypes.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Нет типов дефектов</TableCell></TableRow>
                      ) : filteredDefectTypes.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono font-medium">{d.code}</TableCell>
                          <TableCell>{d.name}</TableCell>
                          <TableCell className="text-muted-foreground">{d.category}</TableCell>
                          <TableCell>{severityBadge(d.severity)}</TableCell>
                          <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Активен" : "Неактивен"}</Badge></TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingDefectType(d); setDefectDialogOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDefectType.mutate(d.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <QualityInspectionDialog
        open={inspectionDialogOpen}
        onOpenChange={setInspectionDialogOpen}
        onSubmit={handleInspectionSubmit}
        inspection={editingInspection}
        defectTypes={defectTypes}
        productionOrders={productionOrdersList}
        isLoading={createInspection.isPending || updateInspection.isPending}
        defaultInspectionNumber={defaultInspNum}
      />

      <DefectTypeDialog
        open={defectDialogOpen}
        onOpenChange={setDefectDialogOpen}
        onSubmit={handleDefectSubmit}
        defectType={editingDefectType}
        isLoading={createDefectType.isPending || updateDefectType.isPending}
      />
    </div>
  );
};

export default QualityControl;
