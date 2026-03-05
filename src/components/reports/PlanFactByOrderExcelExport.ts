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
  finished: 'ГП',
  assembly: 'СБ',
  'semi-finished': 'ПФ',
  material: 'МАТ',
};

interface GroupedOrder {
  parent: ProductionReportData;
  assemblies: ProductionReportData[];
  semiFinished: ProductionReportData[];
  totals: { planned: number; completed: number };
  childCount: number;
}

const groupOrdersByParent = (reports: ProductionReportData[]): GroupedOrder[] => {
  const parentOrders = reports.filter(r => r.product_type === 'finished' && !r.parent_order_id);
  
  return parentOrders.map(parent => {
    const children = reports.filter(r => r.parent_order_id === parent.order_id);
    const assemblies = children.filter(c => c.product_type === 'assembly');
    const semiFinished = children.filter(c => c.product_type === 'semi-finished');
    
    const allRelated = [parent, ...children];
    const totals = allRelated.reduce((acc, r) => ({
      planned: acc.planned + r.planned_quantity,
      completed: acc.completed + r.completed_quantity,
    }), { planned: 0, completed: 0 });
    
    return {
      parent,
      assemblies,
      semiFinished,
      totals,
      childCount: children.length,
    };
  });
};

export const exportPlanFactByOrderToExcel = (
  reports: ProductionReportData[],
  startDate?: string,
  endDate?: string
) => {
  const wb = XLSX.utils.book_new();
  const groupedOrders = groupOrdersByParent(reports);

  // Summary sheet
  const summaryData = [
    ['Отчет план-факт (по заказам)'],
    [''],
    ['Период:', startDate && endDate 
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время'],
    ['Дата формирования:', format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })],
    [''],
    ['Сводка по заказам'],
    ['№ заказа', 'Изделие', 'Код', 'Клиент', 'Компонентов', 'План (общ.)', 'Факт (общ.)', 'Откл.', 'Статус'],
  ];

  groupedOrders.forEach(({ parent, totals, childCount }) => {
    summaryData.push([
      parent.order_number,
      parent.product_name,
      parent.product_code,
      parent.customer_name || '—',
      childCount.toString(),
      totals.planned.toString(),
      totals.completed.toString(),
      (totals.completed - totals.planned).toString(),
      statusLabels[parent.status] || parent.status,
    ]);
  });

  // Overall totals
  const overallTotals = groupedOrders.reduce((acc, g) => ({
    planned: acc.planned + g.totals.planned,
    completed: acc.completed + g.totals.completed,
    children: acc.children + g.childCount,
  }), { planned: 0, completed: 0, children: 0 });

  summaryData.push([]);
  summaryData.push([
    'ИТОГО',
    `${groupedOrders.length} заказов`,
    '',
    '',
    overallTotals.children.toString(),
    overallTotals.planned.toString(),
    overallTotals.completed.toString(),
    (overallTotals.completed - overallTotals.planned).toString(),
    '',
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

  // Detailed sheet with hierarchy
  const detailData = [
    ['Детализация по заказам (с иерархией)'],
    [''],
    ['№ заказа', 'Тип', 'Уровень', 'Код изделия', 'Наименование', 'План', 'Факт', 'Откл.', 'Статус', 'Клиент'],
  ];

  groupedOrders.forEach(({ parent, assemblies, semiFinished }) => {
    // Parent order (level 0)
    detailData.push([
      parent.order_number,
      'ГП',
      '0 (родитель)',
      parent.product_code,
      parent.product_name,
      parent.planned_quantity.toString(),
      parent.completed_quantity.toString(),
      parent.deviation.toString(),
      statusLabels[parent.status] || parent.status,
      parent.customer_name || '—',
    ]);

    // Assemblies (level 1)
    assemblies.forEach(assembly => {
      detailData.push([
        assembly.order_number,
        'СБ',
        '1 (компонент)',
        assembly.product_code,
        `  └ ${assembly.product_name}`,
        assembly.planned_quantity.toString(),
        assembly.completed_quantity.toString(),
        assembly.deviation.toString(),
        statusLabels[assembly.status] || assembly.status,
        '',
      ]);
    });

    // Semi-finished (level 1)
    semiFinished.forEach(sf => {
      detailData.push([
        sf.order_number,
        'ПФ',
        '1 (компонент)',
        sf.product_code,
        `  └ ${sf.product_name}`,
        sf.planned_quantity.toString(),
        sf.completed_quantity.toString(),
        sf.deviation.toString(),
        statusLabels[sf.status] || sf.status,
        '',
      ]);
    });

    // Empty row between orders
    detailData.push([]);
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 18 }, { wch: 6 }, { wch: 14 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Детализация');

  // Create individual sheets for each parent order if needed (up to 10 orders)
  const ordersToExport = groupedOrders.slice(0, 10);
  ordersToExport.forEach(({ parent, assemblies, semiFinished, totals }) => {
    const orderData = [
      [`Заказ: ${parent.order_number}`],
      [''],
      ['Изделие:', parent.product_name],
      ['Код:', parent.product_code],
      ['Клиент:', parent.customer_name || '—'],
      ['Статус:', statusLabels[parent.status] || parent.status],
      [''],
      ['Родительский заказ (ГП)'],
      ['План', 'Факт', 'Отклонение'],
      [parent.planned_quantity.toString(), parent.completed_quantity.toString(), parent.deviation.toString()],
      [''],
    ];

    if (assemblies.length > 0) {
      orderData.push(['Сборочные узлы (СБ)']);
      orderData.push(['№ заказа', 'Код', 'Наименование', 'План', 'Факт', 'Откл.', 'Статус']);
      assemblies.forEach(a => {
        orderData.push([
          a.order_number,
          a.product_code,
          a.product_name,
          a.planned_quantity.toString(),
          a.completed_quantity.toString(),
          a.deviation.toString(),
          statusLabels[a.status] || a.status,
        ]);
      });
      orderData.push([]);
    }

    if (semiFinished.length > 0) {
      orderData.push(['Полуфабрикаты (ПФ)']);
      orderData.push(['№ заказа', 'Код', 'Наименование', 'План', 'Факт', 'Откл.', 'Статус']);
      semiFinished.forEach(sf => {
        orderData.push([
          sf.order_number,
          sf.product_code,
          sf.product_name,
          sf.planned_quantity.toString(),
          sf.completed_quantity.toString(),
          sf.deviation.toString(),
          statusLabels[sf.status] || sf.status,
        ]);
      });
      orderData.push([]);
    }

    orderData.push(['']);
    orderData.push(['Итого по заказу']);
    orderData.push(['План (общ.)', 'Факт (общ.)', 'Отклонение']);
    orderData.push([
      totals.planned.toString(),
      totals.completed.toString(),
      (totals.completed - totals.planned).toString(),
    ]);

    const orderSheet = XLSX.utils.aoa_to_sheet(orderData);
    orderSheet['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
    ];
    
    // Shorten sheet name if needed
    const sheetName = parent.order_number.length > 25 
      ? parent.order_number.substring(0, 25) 
      : parent.order_number;
    XLSX.utils.book_append_sheet(wb, orderSheet, sheetName);
  });

  const filename = `План-факт_по_заказам_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
