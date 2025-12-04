import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Printer, Layers, FileSpreadsheet, Search, X } from "lucide-react";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useProducts } from "@/hooks/useProducts";
import * as XLSX from "xlsx";

interface FlattenedSpecificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specification: any;
}

interface FlattenedMaterial {
  material_id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  product_type: string;
  level: number; // Уровень вложенности
}

const getProductTypeLabel = (type: string) => {
  switch (type) {
    case 'material': return 'МАТ';
    case 'semi-finished': return 'ПФ';
    case 'assembly': return 'СБ';
    case 'finished': return 'ГП';
    default: return type;
  }
};

const getProductTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'material': return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'semi-finished': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
    case 'assembly': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    case 'finished': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    default: return '';
  }
};

export const FlattenedSpecificationDialog = ({ 
  open, 
  onOpenChange, 
  specification 
}: FlattenedSpecificationDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: allSpecifications } = useSpecifications();
  const { data: products } = useProducts();
  
  // Фильтры по типам
  const [showMaterials, setShowMaterials] = useState(true);
  const [showSemiFinished, setShowSemiFinished] = useState(true);
  const [showAssemblies, setShowAssemblies] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByType, setGroupByType] = useState(false);
  const [aggregateSame, setAggregateSame] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Пресеты фильтров
  const filterPresets = [
    { id: 'all', label: 'Все', materials: true, semi: true, assembly: true },
    { id: 'materials-only', label: 'Только МАТ', materials: true, semi: false, assembly: false },
    { id: 'production', label: 'К производству', materials: false, semi: true, assembly: true },
    { id: 'semi-only', label: 'Только ПФ', materials: false, semi: true, assembly: false },
  ];

  const applyPreset = (presetId: string) => {
    const preset = filterPresets.find(p => p.id === presetId);
    if (preset) {
      setShowMaterials(preset.materials);
      setShowSemiFinished(preset.semi);
      setShowAssemblies(preset.assembly);
      setActivePreset(presetId);
    }
  };

  const resetFilters = () => {
    setShowMaterials(true);
    setShowSemiFinished(true);
    setShowAssemblies(true);
    setSearchQuery("");
    setGroupByType(false);
    setAggregateSame(false);
    setActivePreset(null);
  };

  const flattenSpecification = (
    specMaterials: any[],
    multiplier: number = 1,
    level: number = 1,
    visited: Set<string> = new Set()
  ): FlattenedMaterial[] => {
    const result: FlattenedMaterial[] = [];

    for (const material of specMaterials) {
      const materialProduct = products?.find(p => p.id === material.material_id);
      if (!materialProduct) continue;

      // Учитываем процент отходов
      const wasteMultiplier = 1 + (Number(material.waste_rate) || 0) / 100;
      const effectiveQuantity = Number(material.quantity) * multiplier * wasteMultiplier;

      // Добавляем текущий компонент в результат
      result.push({
        material_id: material.material_id,
        name: materialProduct.name,
        code: materialProduct.code,
        unit: materialProduct.unit,
        quantity: effectiveQuantity,
        product_type: materialProduct.product_type,
        level: level,
      });

      // Если это ПФ или СБ - ищем их спецификацию и раскладываем дальше
      if (materialProduct.product_type !== "material") {
        if (visited.has(material.material_id)) {
          // Предотвращаем бесконечную рекурсию
          continue;
        }
        
        const childSpec = allSpecifications?.find(
          s => s.product_id === material.material_id && s.is_active && !s.has_no_specification
        );
        
        if (childSpec && childSpec.specification_materials?.length > 0) {
          visited.add(material.material_id);
          const childMaterials = flattenSpecification(
            childSpec.specification_materials,
            effectiveQuantity,
            level + 1,
            visited
          );
          
          result.push(...childMaterials);
        }
      }
    }

    return result;
  };

  const allFlattenedMaterials = useMemo(() => {
    if (!specification?.specification_materials) return [];
    return flattenSpecification(specification.specification_materials);
  }, [specification, products, allSpecifications]);

  // Подсчёт по типам
  const summary = useMemo(() => {
    const counts = { material: 0, 'semi-finished': 0, assembly: 0 };
    allFlattenedMaterials.forEach(mat => {
      if (counts[mat.product_type as keyof typeof counts] !== undefined) {
        counts[mat.product_type as keyof typeof counts]++;
      }
    });
    return counts;
  }, [allFlattenedMaterials]);

  // Фильтрованный список
  const flattenedMaterials = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = allFlattenedMaterials.filter(mat => {
      // Фильтр по типу
      if (mat.product_type === 'material' && !showMaterials) return false;
      if (mat.product_type === 'semi-finished' && !showSemiFinished) return false;
      if (mat.product_type === 'assembly' && !showAssemblies) return false;
      // Фильтр по поиску
      if (query && !mat.name.toLowerCase().includes(query) && !mat.code.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    // Агрегация одинаковых компонентов
    if (aggregateSame) {
      const aggregated = new Map<string, FlattenedMaterial>();
      filtered.forEach(mat => {
        const existing = aggregated.get(mat.material_id);
        if (existing) {
          existing.quantity += mat.quantity;
          // Сохраняем минимальный уровень
          existing.level = Math.min(existing.level, mat.level);
        } else {
          aggregated.set(mat.material_id, { ...mat });
        }
      });
      filtered = Array.from(aggregated.values());
    }

    return filtered;
  }, [allFlattenedMaterials, showMaterials, showSemiFinished, showAssemblies, searchQuery, aggregateSame]);

  // Группированный список по типу
  const groupedMaterials = useMemo(() => {
    if (!groupByType) return null;
    
    const groups: Record<string, { items: FlattenedMaterial[]; totalQty: number }> = {};
    const typeOrder = ['assembly', 'semi-finished', 'material'];
    
    typeOrder.forEach(type => {
      const items = flattenedMaterials.filter(m => m.product_type === type);
      if (items.length > 0) {
        groups[type] = {
          items,
          totalQty: items.reduce((sum, m) => sum + m.quantity, 0)
        };
      }
    });
    
    return groups;
  }, [flattenedMaterials, groupByType]);

  // Экспорт в Excel
  const handleExportExcel = () => {
    const data = flattenedMaterials.map((mat, idx) => ({
      '№': idx + 1,
      'Тип': getProductTypeLabel(mat.product_type),
      'Код': mat.code,
      'Наименование': mat.name,
      'Ед. изм.': mat.unit,
      'Уровень': mat.level,
      'Количество': mat.quantity,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Спецификация');
    
    // Установка ширины колонок
    ws['!cols'] = [
      { wch: 5 },   // №
      { wch: 8 },   // Тип
      { wch: 15 },  // Код
      { wch: 40 },  // Наименование
      { wch: 10 },  // Ед. изм.
      { wch: 10 },  // Уровень
      { wch: 15 },  // Количество
    ];

    XLSX.writeFile(wb, `Спецификация_${specification?.code || 'export'}.xlsx`);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Одноуровневая спецификация - ${specification?.code}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              font-size: 12px;
            }
            h1 { font-size: 16px; margin-bottom: 5px; }
            h2 { font-size: 14px; margin-bottom: 15px; color: #666; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background: #f5f5f5; 
              font-weight: bold;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .footer { 
              margin-top: 20px; 
              font-size: 10px; 
              color: #999; 
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Одноуровневая спецификация: ${specification?.code}</h1>
          <h2>Продукт: ${specification?.products?.name} (${specification?.products?.code})</h2>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип</th>
                <th>Код</th>
                <th>Наименование</th>
                <th>Ед. изм.</th>
                <th class="text-center">Уровень</th>
                <th class="text-right">Количество</th>
              </tr>
            </thead>
            <tbody>
              ${flattenedMaterials.map((mat, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${getProductTypeLabel(mat.product_type)}</td>
                  <td>${mat.code}</td>
                  <td>${'&nbsp;'.repeat((mat.level - 1) * 4)}${mat.name}</td>
                  <td>${mat.unit}</td>
                  <td class="text-center">${mat.level}</td>
                  <td class="text-right">${mat.quantity.toFixed(4)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Дата формирования: ${new Date().toLocaleString('ru-RU')}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Одноуровневая спецификация
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{specification?.code}</p>
                <p className="text-sm text-muted-foreground">
                  {specification?.products?.name} ({specification?.products?.code})
                </p>
              </div>
            </div>
            
            {/* Сводка по типам */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                <span className="text-sm font-medium text-green-700">МАТ:</span>
                <span className="text-sm font-bold text-green-700">{summary.material}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                <span className="text-sm font-medium text-orange-700">ПФ:</span>
                <span className="text-sm font-bold text-orange-700">{summary['semi-finished']}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                <span className="text-sm font-medium text-purple-700">СБ:</span>
                <span className="text-sm font-bold text-purple-700">{summary.assembly}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border">
                <span className="text-sm font-medium">Всего:</span>
                <span className="text-sm font-bold">{allFlattenedMaterials.length}</span>
              </div>
            </div>

            {/* Пресеты фильтров */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground mr-1">Пресеты:</span>
              {filterPresets.map(preset => (
                <Button
                  key={preset.id}
                  variant={activePreset === preset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset.id)}
                  className="h-7 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs ml-auto text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Сбросить
              </Button>
            </div>

            {/* Фильтры */}
            <div className="flex flex-wrap gap-4 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-materials" 
                  checked={showMaterials}
                  onCheckedChange={(checked) => {
                    setShowMaterials(checked as boolean);
                    setActivePreset(null);
                  }}
                />
                <Label htmlFor="filter-materials" className="text-sm cursor-pointer">
                  Материалы ({summary.material})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-semi" 
                  checked={showSemiFinished}
                  onCheckedChange={(checked) => {
                    setShowSemiFinished(checked as boolean);
                    setActivePreset(null);
                  }}
                />
                <Label htmlFor="filter-semi" className="text-sm cursor-pointer">
                  Полуфабрикаты ({summary['semi-finished']})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-assembly" 
                  checked={showAssemblies}
                  onCheckedChange={(checked) => {
                    setShowAssemblies(checked as boolean);
                    setActivePreset(null);
                  }}
                />
                <Label htmlFor="filter-assembly" className="text-sm cursor-pointer">
                  Сборочные узлы ({summary.assembly})
                </Label>
              </div>
              <div className="flex items-center space-x-2 ml-auto gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="aggregate-same" 
                    checked={aggregateSame}
                    onCheckedChange={(checked) => setAggregateSame(checked as boolean)}
                  />
                  <Label htmlFor="aggregate-same" className="text-sm cursor-pointer font-medium">
                    Суммировать одинаковые
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="group-by-type" 
                    checked={groupByType}
                    onCheckedChange={(checked) => setGroupByType(checked as boolean)}
                  />
                  <Label htmlFor="group-by-type" className="text-sm cursor-pointer font-medium">
                    Группировать
                  </Label>
                </div>
              </div>
            </div>

            {/* Поиск */}
            <div className="relative pt-2 border-t">
              <Search className="absolute left-3 top-[calc(50%+4px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по наименованию или коду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-[calc(50%+4px)] -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-2">
            Показано: {flattenedMaterials.length} из {allFlattenedMaterials.length}
          </div>

          {flattenedMaterials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead className="w-16">Тип</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Ед. изм.</TableHead>
                  <TableHead className="text-center w-20">Уровень</TableHead>
                  <TableHead className="text-right">Количество</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupByType && groupedMaterials ? (
                  // Группированный вид
                  Object.entries(groupedMaterials).map(([type, group]) => (
                    <>
                      <TableRow key={`header-${type}`} className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={6} className="font-semibold">
                          <Badge variant="outline" className={`mr-2 ${getProductTypeBadgeClass(type)}`}>
                            {getProductTypeLabel(type)}
                          </Badge>
                          {type === 'material' && 'Материалы'}
                          {type === 'semi-finished' && 'Полуфабрикаты'}
                          {type === 'assembly' && 'Сборочные узлы'}
                          <span className="text-muted-foreground ml-2">({group.items.length} поз.)</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold font-mono">
                          Σ {group.totalQty.toFixed(4)}
                        </TableCell>
                      </TableRow>
                      {group.items.map((mat, idx) => (
                        <TableRow key={`${type}-${mat.material_id}-${mat.level}-${idx}`}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getProductTypeBadgeClass(mat.product_type)}>
                              {getProductTypeLabel(mat.product_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{mat.code}</TableCell>
                          <TableCell>{mat.name}</TableCell>
                          <TableCell>{mat.unit}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {mat.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {mat.quantity.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))
                ) : (
                  // Обычный вид
                  flattenedMaterials.map((mat, idx) => (
                    <TableRow key={`${mat.material_id}-${mat.level}-${idx}`}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getProductTypeBadgeClass(mat.product_type)}>
                          {getProductTypeLabel(mat.product_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{mat.code}</TableCell>
                      <TableCell style={{ paddingLeft: `${(mat.level - 1) * 16 + 16}px` }}>
                        {mat.name}
                      </TableCell>
                      <TableCell>{mat.unit}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {mat.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {mat.quantity.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет материалов для отображения
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={flattenedMaterials.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handlePrint} disabled={flattenedMaterials.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
