import { useState } from "react";
import { useProductOperationsReport, ProductReportItem, ProductOperationInfo } from "@/hooks/useProductOperationsReport";
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
} from "lucide-react";

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

export const ProductOperationsReport = ({ startDate, endDate }: ProductOperationsReportProps) => {
  const { data: products, isLoading } = useProductOperationsReport(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Фильтрация по поиску
  const filteredProducts = products?.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.product_name.toLowerCase().includes(query) ||
      product.product_code.toLowerCase().includes(query) ||
      product.routing_sheet_name.toLowerCase().includes(query) ||
      product.departments.some(d => d.toLowerCase().includes(query)) ||
      product.work_centers.some(wc => wc.toLowerCase().includes(query)) ||
      product.operations.some(op => 
        op.operation_name.toLowerCase().includes(query) ||
        op.work_center_name.toLowerCase().includes(query) ||
        (op.department && op.department.toLowerCase().includes(query))
      )
    );
  }) || [];

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
    if (filteredProducts) {
      setExpandedProducts(new Set(filteredProducts.map(p => p.product_id)));
    }
  };

  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  // Группировка по типам
  const groupedProducts = {
    finished: filteredProducts.filter(p => p.product_type === 'finished'),
    assembly: filteredProducts.filter(p => p.product_type === 'assembly'),
    'semi-finished': filteredProducts.filter(p => p.product_type === 'semi-finished'),
  };

  const typeLabels = {
    finished: { label: 'Готовая продукция', color: 'bg-blue-50 border-blue-200' },
    assembly: { label: 'Сборочные узлы', color: 'bg-purple-50 border-purple-200' },
    'semi-finished': { label: 'Полуфабрикаты', color: 'bg-orange-50 border-orange-200' },
  };

  return (
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
            {/* Поиск */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по изделию, участку, цеху..."
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
        {filteredProducts.length > 0 && (
          <div className="text-sm text-muted-foreground mt-2">
            Найдено изделий: {filteredProducts.length}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-6">
            {(['finished', 'assembly', 'semi-finished'] as const).map(type => {
              const typeProducts = groupedProducts[type];
              if (typeProducts.length === 0) return null;

              const typeInfo = typeLabels[type];

              return (
                <div key={type} className={`rounded-lg border ${typeInfo.color} overflow-hidden`}>
                  <div className="p-3 bg-background/50 border-b flex items-center gap-2">
                    {getProductTypeBadge(type)}
                    <span className="font-semibold">{typeInfo.label}</span>
                    <Badge variant="secondary">{typeProducts.length}</Badge>
                  </div>
                  
                  <div className="divide-y">
                    {typeProducts.map(product => (
                      <Collapsible
                        key={product.product_id}
                        open={expandedProducts.has(product.product_id)}
                        onOpenChange={() => toggleProduct(product.product_id)}
                      >
                        <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronDown 
                                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                  expandedProducts.has(product.product_id) ? 'rotate-0' : '-rotate-90'
                                }`}
                              />
                              <div className="text-left">
                                <div className="font-medium">{product.product_name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-mono">{product.product_code}</span>
                                  {product.routing_sheet_code && (
                                    <>
                                      <span>•</span>
                                      <span>Маршрут: {product.routing_sheet_code}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              {/* Показываем путь: цехи и участки */}
                              {product.operations.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-md truncate">
                                  {product.operations
                                    .filter(op => op.operation_type === 'production')
                                    .map((op, idx, arr) => (
                                      <span key={op.operation_id} className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                                          {op.work_center_code || op.work_center_name}
                                        </Badge>
                                        {idx < arr.length - 1 && <ArrowRight className="h-3 w-3" />}
                                      </span>
                                    ))}
                                </div>
                              )}
                              <div className="text-right min-w-[100px]">
                                <div className="font-medium">План: {product.planned_quantity}</div>
                                <div className={`text-xs ${product.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Факт: {product.completed_quantity}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-2">
                            {product.operations.length > 0 ? (
                              <div className="space-y-3">
                                {/* Сводка по цехам и участкам */}
                                <div className="flex flex-wrap gap-2 mb-3">
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
                                    <div className="flex items-center gap-1.5 text-sm ml-4">
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

                                {/* Таблица операций */}
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {searchQuery ? (
              <p>По запросу "{searchQuery}" ничего не найдено</p>
            ) : (
              <p>Нет данных для отображения</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
