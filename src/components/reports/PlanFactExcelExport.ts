import XLSX from "@/lib/excel";
import { ProductionReportData } from '@/hooks/useProductionReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершен',
  cancelled: 'Отменен',
  on_hold: 'Приостановлен',
};

const productTypeLabels: Record<string, string> = {
  finished: 'Готовая продукция',
  assembly: 'Сборочные узлы',
  'semi-finished': 'Полуфабрикаты',
  material: 'Материалы',
};

const statusFilterLabels: Record<string, string> = {
  all: 'Все статусы',
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершен',
};

export const exportPlanFactToExcel = (
  reports: ProductionReportData[],
  startDate?: string,
  endDate?: string,
  statusFilter: 'all' | 'planned' | 'in_progress' | 'completed' = 'all'
) => {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Отчет план-факт производства'],
    [''],
    ['Период:', startDate && endDate 
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время'],
    ['Фильтр по статусу:', statusFilterLabels[statusFilter]],
    ['Дата формирования:', format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })],
    [''],
    ['Сводка по типам продукции'],
    ['Тип', 'Кол-во заказов', 'План (исх.)', 'План (тек.)', 'Факт', 'Отклонение'],
  ];

  const types = ['finished', 'assembly', 'semi-finished'] as const;
  types.forEach(type => {
    const typeReports = reports.filter(r => r.product_type === type);
    if (typeReports.length > 0) {
      const totals = typeReports.reduce((acc, r) => ({
        original: acc.original + r.original_planned_quantity,
        current: acc.current + r.planned_quantity,
        completed: acc.completed + r.completed_quantity,
      }), { original: 0, current: 0, completed: 0 });
      
      summaryData.push([
        productTypeLabels[type],
        typeReports.length.toString(),
        totals.original.toString(),
        totals.current.toString(),
        totals.completed.toString(),
        (totals.completed - totals.current).toString(),
      ]);
    }
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

  // Create sheet for each product type
  types.forEach(type => {
    const typeReports = reports.filter(r => r.product_type === type);
    if (typeReports.length === 0) return;

    const sheetData = [
      [productTypeLabels[type]],
      [''],
      ['Номер заказа', 'Код изделия', 'Наименование', 'План (исх.)', 'План (тек.)', 'Изм. плана', 'Факт', 'Откл.', 'Откл. %', 'Статус', 'Участок'],
    ];

    typeReports.forEach(report => {
      sheetData.push([
        report.order_number,
        report.product_code,
        report.product_name,
        report.original_planned_quantity.toString(),
        report.planned_quantity.toString(),
        report.plan_change.toString(),
        report.completed_quantity.toString(),
        report.deviation.toString(),
        report.deviation_percent.toFixed(1) + '%',
        statusLabels[report.status] || report.status,
        report.work_center_name || '-',
      ]);
    });

    // Add totals
    const totals = typeReports.reduce((acc, r) => ({
      original: acc.original + r.original_planned_quantity,
      current: acc.current + r.planned_quantity,
      planChange: acc.planChange + r.plan_change,
      completed: acc.completed + r.completed_quantity,
      deviation: acc.deviation + r.deviation,
    }), { original: 0, current: 0, planChange: 0, completed: 0, deviation: 0 });

    sheetData.push([]);
    sheetData.push([
      'ИТОГО',
      '',
      '',
      totals.original.toString(),
      totals.current.toString(),
      totals.planChange.toString(),
      totals.completed.toString(),
      totals.deviation.toString(),
      totals.current > 0 ? ((totals.deviation / totals.current) * 100).toFixed(1) + '%' : '0%',
      '',
      '',
    ]);

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    sheet['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }
    ];

    const sheetName = type === 'finished' ? 'ГП' : type === 'assembly' ? 'СБ' : 'ПФ';
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  });

  // All data sheet
  const allData = [
    ['Все заказы'],
    [''],
    ['Номер заказа', 'Код изделия', 'Наименование', 'Тип', 'План (исх.)', 'План (тек.)', 'Изм. плана', 'Факт', 'Откл.', 'Откл. %', 'Статус', 'Участок'],
  ];

  reports.forEach(report => {
    const typeLabel = report.product_type === 'finished' ? 'ГП' 
      : report.product_type === 'assembly' ? 'СБ' 
      : report.product_type === 'semi-finished' ? 'ПФ' 
      : 'МАТ';
    
    allData.push([
      report.order_number,
      report.product_code,
      report.product_name,
      typeLabel,
      report.original_planned_quantity.toString(),
      report.planned_quantity.toString(),
      report.plan_change.toString(),
      report.completed_quantity.toString(),
      report.deviation.toString(),
      report.deviation_percent.toFixed(1) + '%',
      statusLabels[report.status] || report.status,
      report.work_center_name || '-',
    ]);
  });

  const allSheet = XLSX.utils.aoa_to_sheet(allData);
  allSheet['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, allSheet, 'Все заказы');

  const filename = `План-факт_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
