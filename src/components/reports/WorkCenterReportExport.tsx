import * as XLSX from 'xlsx';
import { WorkCenterReportData, WorkCenterProductItem } from '@/hooks/useWorkCenterReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const getProductTypeLabel = (type: string): string => {
  switch (type) {
    case 'finished': return 'ГП';
    case 'assembly': return 'СБ';
    case 'semi-finished': return 'ПФ';
    case 'material': return 'МАТ';
    default: return type;
  }
};

const getProductTypeFullLabel = (type: string): string => {
  switch (type) {
    case 'finished': return 'Готовая продукция';
    case 'assembly': return 'Сборочные узлы';
    case 'semi-finished': return 'Полуфабрикаты';
    case 'material': return 'Материалы';
    default: return type;
  }
};

interface GroupedProducts {
  finished: WorkCenterProductItem[];
  assembly: WorkCenterProductItem[];
  'semi-finished': WorkCenterProductItem[];
}

const groupProductsByType = (products: WorkCenterProductItem[]): GroupedProducts => {
  return products.reduce((acc, product) => {
    const type = product.product_type as keyof GroupedProducts;
    if (type in acc) {
      acc[type].push(product);
    }
    return acc;
  }, { finished: [], assembly: [], 'semi-finished': [] } as GroupedProducts);
};

export const exportWorkCenterReportsToExcel = (
  reports: WorkCenterReportData[],
  startDate?: string,
  endDate?: string
) => {
  const wb = XLSX.utils.book_new();
  
  // Лист 1: Сводная информация по цехам
  const summaryData: any[] = [
    ['ОТЧЕТ ПО ЦЕХАМ И ПРОИЗВОДСТВЕННЫМ УЧАСТКАМ'],
    [startDate || endDate ? `Период: ${startDate || '—'} — ${endDate || '—'}` : 'Период: Все время'],
    ['Дата формирования: ' + format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })],
    [],
    ['Цех', 'Участок', 'Код участка', 'Продукция', 'План', 'Факт', 'Отклонение', 'Выполнение %'],
  ];

  // Группируем по цехам
  const departmentGroups = reports.reduce((acc, report) => {
    const dept = report.department || 'Без цеха';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(report);
    return acc;
  }, {} as Record<string, WorkCenterReportData[]>);

  const sortedDepts = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b, 'ru'));

  sortedDepts.forEach(dept => {
    const deptReports = departmentGroups[dept];
    const deptTotalPlanned = deptReports.reduce((s, r) => s + r.total_planned, 0);
    const deptTotalCompleted = deptReports.reduce((s, r) => s + r.total_completed, 0);
    const deptDeviation = deptTotalCompleted - deptTotalPlanned;
    const deptCompletionPercent = deptTotalPlanned > 0 ? (deptTotalCompleted / deptTotalPlanned) * 100 : 0;

    // Итого по цеху
    summaryData.push([
      dept,
      'ИТОГО ПО ЦЕХУ',
      '',
      deptReports.reduce((s, r) => s + (r.products?.length || 0), 0),
      deptTotalPlanned,
      deptTotalCompleted,
      deptDeviation,
      deptCompletionPercent.toFixed(1) + '%'
    ]);

    // Участки в цехе
    deptReports.sort((a, b) => a.work_center_name.localeCompare(b.work_center_name, 'ru'));
    deptReports.forEach(report => {
      summaryData.push([
        '',
        report.work_center_name,
        report.work_center_code,
        report.products?.length || 0,
        report.total_planned,
        report.total_completed,
        report.total_deviation,
        report.completion_percent.toFixed(1) + '%'
      ]);
    });
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, 
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

  // Лист 2: Детализация по продукции с группировкой по типам
  const detailData: any[] = [
    ['ДЕТАЛИЗАЦИЯ ПО ПРОДУКЦИИ'],
    [],
    ['Цех', 'Участок', 'Тип', 'Код изделия', 'Наименование', 'План', 'Факт', 'Отклонение', 'Выполнение %'],
  ];

  sortedDepts.forEach(dept => {
    const deptReports = departmentGroups[dept];
    deptReports.forEach(report => {
      if (!report.products || report.products.length === 0) return;
      
      const grouped = groupProductsByType(report.products);
      
      // Добавляем ГП
      if (grouped.finished.length > 0) {
        detailData.push([report.department, report.work_center_name, '— ГОТОВАЯ ПРОДУКЦИЯ —', '', '', '', '', '', '']);
        grouped.finished.forEach(product => {
          detailData.push([
            '',
            '',
            'ГП',
            product.product_code,
            product.product_name,
            product.planned_quantity,
            product.completed_quantity,
            product.deviation,
            product.deviation_percent.toFixed(1) + '%'
          ]);
        });
      }
      
      // Добавляем СБ
      if (grouped.assembly.length > 0) {
        detailData.push([report.department, report.work_center_name, '— СБОРОЧНЫЕ УЗЛЫ —', '', '', '', '', '', '']);
        grouped.assembly.forEach(product => {
          detailData.push([
            '',
            '',
            'СБ',
            product.product_code,
            product.product_name,
            product.planned_quantity,
            product.completed_quantity,
            product.deviation,
            product.deviation_percent.toFixed(1) + '%'
          ]);
        });
      }
      
      // Добавляем ПФ
      if (grouped['semi-finished'].length > 0) {
        detailData.push([report.department, report.work_center_name, '— ПОЛУФАБРИКАТЫ —', '', '', '', '', '', '']);
        grouped['semi-finished'].forEach(product => {
          detailData.push([
            '',
            '',
            'ПФ',
            product.product_code,
            product.product_name,
            product.planned_quantity,
            product.completed_quantity,
            product.deviation,
            product.deviation_percent.toFixed(1) + '%'
          ]);
        });
      }
    });
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, 
    { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Детализация');

  // Лист 3: Сводка по типам продукции
  const typeData: any[] = [
    ['СВОДКА ПО ТИПАМ ПРОДУКЦИИ'],
    [],
    ['Тип продукции', 'Количество позиций', 'План всего', 'Факт всего', 'Отклонение', 'Выполнение %'],
  ];

  const allProducts = reports.flatMap(r => r.products || []);
  const groupedAll = groupProductsByType(allProducts);

  (['finished', 'assembly', 'semi-finished'] as const).forEach(type => {
    const products = groupedAll[type];
    const totalPlanned = products.reduce((s, p) => s + p.planned_quantity, 0);
    const totalCompleted = products.reduce((s, p) => s + p.completed_quantity, 0);
    const deviation = totalCompleted - totalPlanned;
    const completionPercent = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

    typeData.push([
      getProductTypeFullLabel(type),
      products.length,
      totalPlanned,
      totalCompleted,
      deviation,
      completionPercent.toFixed(1) + '%'
    ]);
  });

  const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
  typeSheet['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, typeSheet, 'По типам');

  // Сохраняем файл
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
  XLSX.writeFile(wb, `Отчет_по_цехам_${dateStr}.xlsx`);
};

export const sortProductsByField = (
  products: WorkCenterProductItem[],
  field: 'name' | 'code' | 'type' | 'planned' | 'completed' | 'deviation',
  direction: 'asc' | 'desc'
): WorkCenterProductItem[] => {
  return [...products].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'name':
        comparison = a.product_name.localeCompare(b.product_name, 'ru');
        break;
      case 'code':
        comparison = a.product_code.localeCompare(b.product_code, 'ru');
        break;
      case 'type':
        const typeOrder = { finished: 0, assembly: 1, 'semi-finished': 2 };
        comparison = (typeOrder[a.product_type as keyof typeof typeOrder] || 3) - 
                    (typeOrder[b.product_type as keyof typeof typeOrder] || 3);
        break;
      case 'planned':
        comparison = a.planned_quantity - b.planned_quantity;
        break;
      case 'completed':
        comparison = a.completed_quantity - b.completed_quantity;
        break;
      case 'deviation':
        comparison = a.deviation - b.deviation;
        break;
    }
    
    return direction === 'desc' ? -comparison : comparison;
  });
};
