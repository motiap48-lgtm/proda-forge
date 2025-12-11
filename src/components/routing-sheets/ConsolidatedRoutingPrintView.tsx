import { forwardRef } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface FlatOperation {
  productName: string;
  productCode: string;
  productType: string;
  level: number;
  operation: {
    id: string;
    sequence: number;
    name: string;
    operation_type: string;
    setup_time_minutes: number;
    cycle_time_minutes: number;
  };
  workCenterName: string;
  workCenterCode: string;
}

interface ConsolidatedRoutingPrintViewProps {
  productName: string;
  productCode: string;
  totals: {
    totalOperations: number;
    totalSetupTime: number;
    totalCycleTime: number;
    nodesWithoutRouting: number;
  };
  flatOperations: FlatOperation[];
}

const productTypeLabels: Record<string, string> = {
  material: "МАТ",
  "semi-finished": "ПФ",
  assembly: "СБ",
  finished: "ГП",
};

const operationTypeLabels: Record<string, string> = {
  production: "Производство",
  transport: "Транспортировка",
  control: "Контроль",
  setup: "Наладка",
};

export const ConsolidatedRoutingPrintView = forwardRef<HTMLDivElement, ConsolidatedRoutingPrintViewProps>(
  ({ productName, productCode, totals, flatOperations }, ref) => {
    // Group operations by product
    const groupedByProduct: Map<string, FlatOperation[]> = new Map();
    flatOperations.forEach(op => {
      const key = op.productCode;
      if (!groupedByProduct.has(key)) {
        groupedByProduct.set(key, []);
      }
      groupedByProduct.get(key)!.push(op);
    });

    const getWorkCenterDisplay = (op: FlatOperation) => {
      if (op.workCenterCode && op.workCenterName) {
        return `${op.workCenterCode} - ${op.workCenterName}`;
      }
      return op.workCenterName || op.workCenterCode || 'Не указан';
    };

    return (
      <div ref={ref} className="p-8 bg-white text-black print:p-4" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-1">Сводный технологический маршрут</h1>
              <p className="text-lg">{productName}</p>
              <p className="text-sm text-gray-600">{productCode}</p>
            </div>
            <div className="text-right text-sm">
              <p>Дата печати: {format(new Date(), "dd.MM.yyyy", { locale: ru })}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h2 className="text-lg font-bold mb-3">Сводные данные</h2>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Всего операций:</span>
              <span className="ml-2 font-semibold">{totals.totalOperations}</span>
            </div>
            <div>
              <span className="text-gray-600">Время наладки:</span>
              <span className="ml-2 font-semibold">{totals.totalSetupTime.toFixed(1)} мин ({(totals.totalSetupTime / 60).toFixed(1)} ч)</span>
            </div>
            <div>
              <span className="text-gray-600">Время на единицу:</span>
              <span className="ml-2 font-semibold">{totals.totalCycleTime.toFixed(1)} мин ({(totals.totalCycleTime / 60).toFixed(1)} ч)</span>
            </div>
            <div>
              <span className="text-gray-600">Общее время:</span>
              <span className="ml-2 font-semibold">{(totals.totalSetupTime + totals.totalCycleTime).toFixed(1)} мин ({((totals.totalSetupTime + totals.totalCycleTime) / 60).toFixed(1)} ч)</span>
            </div>
          </div>
          {totals.nodesWithoutRouting > 0 && (
            <div className="mt-2 text-sm text-amber-700">
              ⚠ Продуктов без маршрута: {totals.nodesWithoutRouting}
            </div>
          )}
        </div>

        {/* Operations Flow */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4">Поток операций</h2>
          
          {Array.from(groupedByProduct.entries()).map(([productKey, operations], groupIdx) => {
            const firstOp = operations[0];
            return (
              <div key={productKey} className="mb-6">
                {/* Product Header */}
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded font-medium">
                    {productTypeLabels[firstOp.productType] || firstOp.productType}
                  </span>
                  <div>
                    <span className="font-semibold">{firstOp.productName}</span>
                    <span className="text-gray-500 ml-2 text-sm">{firstOp.productCode}</span>
                  </div>
                </div>

                {/* Operations */}
                <div className="ml-4 space-y-2">
                  {operations.map((op, opIdx) => (
                    <div key={`${op.operation.id}-${opIdx}`} className="relative">
                      {/* Vertical line connector */}
                      {opIdx < operations.length - 1 && (
                        <div 
                          className="absolute left-3 top-8 w-0.5 bg-gray-300" 
                          style={{ height: 'calc(100% + 0.5rem)' }}
                        />
                      )}
                      
                      {/* Operation Card */}
                      <div className="flex items-start gap-3 p-3 border rounded bg-white relative">
                        {/* Sequence Number */}
                        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {op.operation.sequence}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 uppercase">
                              {operationTypeLabels[op.operation.operation_type] || op.operation.operation_type}
                            </span>
                          </div>
                          <p className="font-medium">{op.operation.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Участок: {getWorkCenterDisplay(op)}
                          </p>
                        </div>
                        
                        <div className="text-right text-sm shrink-0">
                          <div className="font-medium">
                            {(op.operation.setup_time_minutes || 0) + (op.operation.cycle_time_minutes || 0)} мин
                          </div>
                          {op.operation.setup_time_minutes > 0 && (
                            <div className="text-xs text-gray-500">
                              ПЗ: {op.operation.setup_time_minutes}м | Шт: {op.operation.cycle_time_minutes}м
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {opIdx < operations.length - 1 && (
                        <div className="flex justify-center py-1">
                          <span className="text-gray-400">↓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Product separator */}
                {groupIdx < groupedByProduct.size - 1 && (
                  <div className="mt-4 mb-4 border-t-2 border-dashed border-gray-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mb-6 p-3 bg-gray-50 rounded text-xs">
          <span className="font-semibold mr-4">Типы операций:</span>
          {Object.entries(operationTypeLabels).map(([key, label]) => (
            <span key={key} className="mr-4">{label}</span>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>ERP Vostok Auto</span>
            <span>Сводный техмаршрут: {productCode}</span>
          </div>
        </div>
      </div>
    );
  }
);

ConsolidatedRoutingPrintView.displayName = "ConsolidatedRoutingPrintView";
