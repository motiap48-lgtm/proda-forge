import * as XLSX from 'xlsx';
import { ProductionReportData } from '@/hooks/useProductionReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface AggregatedProduct {
  product_code: string;
  product_name: string;
  product_type: string;
  original_planned_quantity: number;
  planned_quantity: number;
  completed_quantity: number;
  deviation: number;
  order_count: number;
}

const productTypeLabels: Record<string, string> = {
  finished: 'Готовая продукция',
  assembly: 'Сборочные узлы',
  'semi-finished': 'Полуфабрикаты',
};

const completionFilterLabels: Record<string, string> = {
  all: '',
  not_completed: 'Невыполненные (0%)',
  partially: 'Частично выполненные (1-99%)',
  completed: 'Выполненные (100%)',
};

export const exportPlanFactAggregatedToExcel = (
  aggregatedProducts: AggregatedProduct[],
  allReports: ProductionReportData[],
  startDate?: string,
  endDate?: string,
  completionFilter?: 'all' | 'not_completed' | 'partially' | 'completed',
  productTypeFilter?: ('finished' | 'assembly' | 'semi-finished')[]
) => {
  const allTypes = ['finished', 'assembly', 'semi-finished'] as const;
  const typesToExport = productTypeFilter && productTypeFilter.length > 0 ? productTypeFilter : allTypes;
  
  // Filter products by selected types
  const filteredProducts = aggregatedProducts.filter(p => 
    typesToExport.includes(p.product_type as typeof typesToExport[number])
  );
  const wb = XLSX.utils.book_new();

  const filterLabel = completionFilter && completionFilter !== 'all' 
    ? completionFilterLabels[completionFilter] 
    : '';

  // Title based on types
  const typeNames = typesToExport.map(t => t === 'finished' ? 'ГП' : t === 'assembly' ? 'СБ' : 'ПФ');
  const titleSuffix = typesToExport.length === 3 ? '' : ` (${typeNames.join(', ')})`;

  // Summary sheet
  const summaryData: (string | number)[][] = [
    [`Отчет план-факт${titleSuffix}`],
    [''],
    ['Период:', startDate && endDate 
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время'],
    ...(filterLabel ? [['Фильтр:', filterLabel]] : []),
    ['Дата формирования:', format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })],
    [''],
    ['Сводка по типам продукции'],
    ['Тип', 'Кол-во изделий', 'Кол-во заказов', 'План (исх.)', 'План (тек.)', 'Факт', 'Отклонение'],
  ];

  typesToExport.forEach(type => {
    const typeProducts = filteredProducts.filter(p => p.product_type === type);
    if (typeProducts.length > 0) {
      const totals = typeProducts.reduce((acc, p) => ({
        original: acc.original + p.original_planned_quantity,
        current: acc.current + p.planned_quantity,
        completed: acc.completed + p.completed_quantity,
        orders: acc.orders + p.order_count,
      }), { original: 0, current: 0, completed: 0, orders: 0 });
      
      summaryData.push([
        productTypeLabels[type],
        typeProducts.length.toString(),
        totals.orders.toString(),
        totals.original.toString(),
        totals.current.toString(),
        totals.completed.toString(),
        (totals.completed - totals.current).toString(),
      ]);
    }
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

  // Create sheet for each product type with aggregated data
  typesToExport.forEach(type => {
    const typeProducts = filteredProducts.filter(p => p.product_type === type);
    if (typeProducts.length === 0) return;

    const sheetData = [
      [productTypeLabels[type] + ' (суммарно)'],
      [''],
      ['Код изделия', 'Наименование', 'Заказов', 'План (исх.)', 'План (тек.)', 'Факт', 'Откл.', 'Выполнение %'],
    ];

    typeProducts.forEach(product => {
      const completionPercent = product.planned_quantity > 0 
        ? ((product.completed_quantity / product.planned_quantity) * 100).toFixed(1) 
        : '0';
      
      sheetData.push([
        product.product_code,
        product.product_name,
        product.order_count.toString(),
        product.original_planned_quantity.toString(),
        product.planned_quantity.toString(),
        product.completed_quantity.toString(),
        product.deviation.toString(),
        completionPercent + '%',
      ]);
    });

    // Add totals
    const totals = typeProducts.reduce((acc, p) => ({
      original: acc.original + p.original_planned_quantity,
      current: acc.current + p.planned_quantity,
      completed: acc.completed + p.completed_quantity,
      deviation: acc.deviation + p.deviation,
      orders: acc.orders + p.order_count,
    }), { original: 0, current: 0, completed: 0, deviation: 0, orders: 0 });

    sheetData.push([]);
    sheetData.push([
      'ИТОГО',
      `${typeProducts.length} изделий`,
      totals.orders.toString(),
      totals.original.toString(),
      totals.current.toString(),
      totals.completed.toString(),
      totals.deviation.toString(),
      totals.current > 0 ? ((totals.completed / totals.current) * 100).toFixed(1) + '%' : '0%',
    ]);

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    sheet['!cols'] = [
      { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
    ];

    const sheetName = type === 'finished' ? 'ГП' : type === 'assembly' ? 'СБ' : 'ПФ';
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  });

  // Detail sheet with all orders grouped by product
  const detailData = [
    ['Детализация по заказам'],
    [''],
  ];

  typesToExport.forEach(type => {
    const typeProducts = filteredProducts.filter(p => p.product_type === type);
    if (typeProducts.length === 0) return;

    detailData.push([productTypeLabels[type]]);
    detailData.push(['Код', 'Наименование', 'Заказ', 'План (исх.)', 'План (тек.)', 'Факт', 'Откл.', 'Статус']);

    typeProducts.forEach(product => {
      const productOrders = allReports.filter(r => r.product_code === product.product_code);
      
      productOrders.forEach((order, idx) => {
        detailData.push([
          idx === 0 ? product.product_code : '',
          idx === 0 ? product.product_name : '',
          order.order_number,
          order.original_planned_quantity.toString(),
          order.planned_quantity.toString(),
          order.completed_quantity.toString(),
          order.deviation.toString(),
          order.status,
        ]);
      });

      // Product subtotal
      if (productOrders.length > 1) {
        detailData.push([
          '',
          `Итого по ${product.product_name}:`,
          `${product.order_count} заказов`,
          product.original_planned_quantity.toString(),
          product.planned_quantity.toString(),
          product.completed_quantity.toString(),
          product.deviation.toString(),
          '',
        ]);
      }
    });

    detailData.push([]);
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Детализация');

  const filename = `План-факт${titleSuffix.replace(/[()]/g, '').replace(/, /g, '_').replace(' ', '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
