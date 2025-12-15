import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  PurchaseRequirement, 
  ProductionRequirement, 
  WorkCenterReport 
} from "@/hooks/useMRPPlanning";

const getProductTypeLabel = (type: string) => {
  switch (type) {
    case "material": return "Материал";
    case "semi-finished": return "Полуфабрикат";
    case "assembly": return "Сборочный узел";
    case "finished": return "Готовая продукция";
    default: return type;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "shortage": return "Дефицит";
    case "warning": return "Внимание";
    case "ok": return "В норме";
    default: return status;
  }
};

interface ExportOptions {
  purchaseRequirements: PurchaseRequirement[];
  productionRequirements: ProductionRequirement[];
  workCenterReports: WorkCenterReport[];
  planningHorizon: number;
  startDate: string;
}

export const exportMRPToExcel = (options: ExportOptions) => {
  const { 
    purchaseRequirements, 
    productionRequirements, 
    workCenterReports, 
    planningHorizon, 
    startDate 
  } = options;

  const workbook = XLSX.utils.book_new();

  // Calculate totals for plan changes
  const purchaseIncreaseTotal = purchaseRequirements.reduce((sum, r) => sum + r.plan_increase_requirement, 0);
  const purchaseDecreaseTotal = purchaseRequirements.reduce((sum, r) => sum + r.plan_decrease_amount, 0);
  const productionIncreaseTotal = productionRequirements.reduce((sum, r) => sum + r.plan_increase_requirement, 0);
  const productionDecreaseTotal = productionRequirements.reduce((sum, r) => sum + r.plan_decrease_amount, 0);

  // Sheet 1: Информация
  const infoData = [
    ["MRP РАСЧЕТ"],
    [],
    ["Параметры расчета"],
    ["Горизонт планирования (дней)", planningHorizon],
    ["Дата начала", format(new Date(startDate), "dd.MM.yyyy", { locale: ru })],
    ["Дата формирования", format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })],
    [],
    ["Сводка"],
    ["Позиций к закупке", purchaseRequirements.length],
    ["Позиций к производству", productionRequirements.length],
    ["Дефицит (закупка)", purchaseRequirements.filter(r => r.status === "shortage").length],
    ["Дефицит (производство)", productionRequirements.filter(r => r.status === "shortage").length],
    ["Рабочих центров", workCenterReports.length],
    [],
    ["Изменения плана"],
    ["Закупка - позиций с увеличением", purchaseRequirements.filter(r => r.plan_increase_requirement > 0).length],
    ["Закупка - сумма увеличения", purchaseIncreaseTotal > 0 ? `+${purchaseIncreaseTotal.toFixed(2)}` : "—"],
    ["Закупка - позиций с уменьшением", purchaseRequirements.filter(r => r.plan_decrease_amount > 0).length],
    ["Закупка - сумма уменьшения", purchaseDecreaseTotal > 0 ? `-${purchaseDecreaseTotal.toFixed(2)}` : "—"],
    ["Производство - позиций с увеличением", productionRequirements.filter(r => r.plan_increase_requirement > 0).length],
    ["Производство - сумма увеличения", productionIncreaseTotal > 0 ? `+${productionIncreaseTotal.toFixed(2)}` : "—"],
    ["Производство - позиций с уменьшением", productionRequirements.filter(r => r.plan_decrease_amount > 0).length],
    ["Производство - сумма уменьшения", productionDecreaseTotal > 0 ? `-${productionDecreaseTotal.toFixed(2)}` : "—"],
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
  infoSheet["!cols"] = [{ wch: 35 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Информация");

  // Sheet 2: Потребность к закупке
  const purchaseData = [
    [
      "Тип", 
      "Код", 
      "Наименование", 
      "Ед. изм.", 
      "Валовая потребность", 
      "Увеличение плана (+)", 
      "Уменьшение плана (-)", 
      "На складе", 
      "Зарезервировано", 
      "Доступно", 
      "Чистая потребность", 
      "Статус"
    ],
    ...purchaseRequirements.map(item => [
      getProductTypeLabel(item.product_type),
      item.product_code,
      item.product_name,
      item.unit,
      item.gross_requirement,
      item.plan_increase_requirement > 0 ? item.plan_increase_requirement : "",
      item.plan_decrease_amount > 0 ? item.plan_decrease_amount : "",
      item.on_hand,
      item.reserved,
      item.available,
      item.net_requirement,
      getStatusLabel(item.status),
    ]),
  ];
  const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
  purchaseSheet["!cols"] = [
    { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, 
    { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, 
    { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, purchaseSheet, "К закупке");

  // Sheet 3: Потребность к производству
  const productionData = [
    [
      "Тип", 
      "Код", 
      "Наименование", 
      "Участок", 
      "Ед. изм.", 
      "Валовая потребность", 
      "Увеличение плана (+)", 
      "Уменьшение плана (-)", 
      "На складе", 
      "Зарезервировано", 
      "Доступно", 
      "Чистая потребность", 
      "Статус",
      "Из заказов"
    ],
    ...productionRequirements.map(item => [
      getProductTypeLabel(item.product_type),
      item.product_code,
      item.product_name,
      item.work_center_name || "—",
      item.unit,
      item.gross_requirement,
      item.plan_increase_requirement > 0 ? item.plan_increase_requirement : "",
      item.plan_decrease_amount > 0 ? item.plan_decrease_amount : "",
      item.on_hand,
      item.reserved,
      item.available,
      item.net_requirement,
      getStatusLabel(item.status),
      item.source_orders?.join(", ") || "",
    ]),
  ];
  const productionSheet = XLSX.utils.aoa_to_sheet(productionData);
  productionSheet["!cols"] = [
    { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 8 },
    { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, 
    { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(workbook, productionSheet, "К производству");

  // Sheet 4: Рапорты по участкам
  const workCenterData: any[][] = [
    ["Участок", "Код участка", "Цех", "Тип продукции", "Код продукции", "Наименование", "Количество", "Ед. изм."]
  ];
  
  workCenterReports.forEach(report => {
    report.items.forEach(item => {
      workCenterData.push([
        report.work_center_name,
        report.work_center_code,
        report.department || "—",
        getProductTypeLabel(item.product_type),
        item.product_code,
        item.product_name,
        item.quantity,
        item.unit,
      ]);
    });
  });
  
  const workCenterSheet = XLSX.utils.aoa_to_sheet(workCenterData);
  workCenterSheet["!cols"] = [
    { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, 
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 8 }
  ];
  XLSX.utils.book_append_sheet(workbook, workCenterSheet, "По участкам");

  // Генерируем файл
  const fileName = `MRP_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
