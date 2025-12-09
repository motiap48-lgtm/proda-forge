import { forwardRef } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface OperationMaterial {
  product_id: string;
  product_name?: string;
  product_code?: string;
  product_type?: string;
  quantity?: number | null;
  unit?: string;
}

interface Operation {
  sequence: number;
  name: string;
  work_center_code?: string;
  work_center_name?: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: string;
  materials?: OperationMaterial[];
}

interface RoutingSheetPrintViewProps {
  sheet: {
    code: string;
    name: string;
    is_active: boolean;
    products?: {
      code: string;
      name: string;
      product_type: string;
    };
  };
  operations: Operation[];
}

const operationTypeLabels: Record<string, string> = {
  production: "Производство",
  transport: "Транспортировка",
  control: "Контроль",
  setup: "Наладка",
};

const productTypeLabels: Record<string, string> = {
  material: "МАТ",
  "semi-finished": "ПФ",
  assembly: "СБ",
  finished: "ГП",
};

export const RoutingSheetPrintView = forwardRef<HTMLDivElement, RoutingSheetPrintViewProps>(
  ({ sheet, operations }, ref) => {
    const totalSetupTime = operations.reduce((sum, op) => sum + (op.setup_time_minutes || 0), 0);
    const totalCycleTime = operations.reduce((sum, op) => sum + (op.cycle_time_minutes || 0), 0);

    return (
      <div ref={ref} className="p-8 bg-white text-black print:p-4" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-1">Технологический маршрут</h1>
              <p className="text-lg font-semibold">{sheet.code}</p>
            </div>
            <div className="text-right text-sm">
              <p>Дата печати: {format(new Date(), "dd.MM.yyyy", { locale: ru })}</p>
              <p className="mt-1">
                Статус: <span className={sheet.is_active ? "font-semibold" : ""}>{sheet.is_active ? "Активен" : "Неактивен"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* General Info */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Общая информация</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-4 text-gray-600 w-40">Название:</td>
                <td className="py-1 font-medium">{sheet.name}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-600">Продукт:</td>
                <td className="py-1">
                  <span className="font-medium">{sheet.products?.code}</span> — {sheet.products?.name}
                  <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                    {productTypeLabels[sheet.products?.product_type || ""] || sheet.products?.product_type}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-600">Количество операций:</td>
                <td className="py-1">{operations.length}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-600">Общее время наладки:</td>
                <td className="py-1">{totalSetupTime} мин</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-gray-600">Общее время на единицу:</td>
                <td className="py-1">{totalCycleTime} мин</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Operations Table */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Операции</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left w-12">№</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Операция</th>
                <th className="border border-gray-300 px-2 py-2 text-left w-28">Тип</th>
                <th className="border border-gray-300 px-2 py-2 text-left w-36">Участок</th>
                <th className="border border-gray-300 px-2 py-2 text-center w-20">ПЗ, мин</th>
                <th className="border border-gray-300 px-2 py-2 text-center w-20">Шт, мин</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-center font-mono">{op.sequence}</td>
                  <td className="border border-gray-300 px-2 py-2">{op.name}</td>
                  <td className="border border-gray-300 px-2 py-2">{operationTypeLabels[op.operation_type] || op.operation_type}</td>
                  <td className="border border-gray-300 px-2 py-2">{op.work_center_code || op.work_center_name}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{op.setup_time_minutes}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{op.cycle_time_minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Materials by Operation */}
        {operations.some(op => op.materials && op.materials.length > 0) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Компоненты по операциям</h2>
            {operations.filter(op => op.materials && op.materials.length > 0).map((op, idx) => (
              <div key={idx} className="mb-4">
                <h3 className="text-sm font-semibold mb-2 bg-gray-100 px-2 py-1">
                  Операция {op.sequence}: {op.name}
                </h3>
                <table className="w-full text-sm border-collapse ml-4" style={{ width: "calc(100% - 1rem)" }}>
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left">Код</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Наименование</th>
                      <th className="border border-gray-300 px-2 py-1 text-left w-16">Тип</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-24">Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.materials?.map((m, mIdx) => (
                      <tr key={mIdx}>
                        <td className="border border-gray-300 px-2 py-1 font-mono text-xs">{m.product_code}</td>
                        <td className="border border-gray-300 px-2 py-1">{m.product_name}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs">
                          {productTypeLabels[m.product_type || ""] || m.product_type}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {m.quantity ?? "—"} {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>ERP Vostok Auto</span>
            <span>Технологический маршрут {sheet.code}</span>
          </div>
        </div>
      </div>
    );
  }
);

RoutingSheetPrintView.displayName = "RoutingSheetPrintView";
