import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Layers } from "lucide-react";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useProducts } from "@/hooks/useProducts";

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

  // Рекурсивная функция для полной раскладки спецификации
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

  const flattenedMaterials = specification?.specification_materials
    ? flattenSpecification(specification.specification_materials)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    : [];

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
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{specification?.code}</p>
                <p className="text-sm text-muted-foreground">
                  {specification?.products?.name} ({specification?.products?.code})
                </p>
              </div>
              <Badge variant="outline">
                {flattenedMaterials.length} компонентов
              </Badge>
            </div>
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
                {flattenedMaterials.map((mat, idx) => (
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
                ))}
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
          <Button onClick={handlePrint} disabled={flattenedMaterials.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
