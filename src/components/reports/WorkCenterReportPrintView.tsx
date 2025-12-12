import React, { forwardRef } from 'react';
import { WorkCenterReportData, WorkCenterProductItem } from '@/hooks/useWorkCenterReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WorkCenterReportPrintViewProps {
  reports: WorkCenterReportData[];
  singleWorkCenterId?: string;
  startDate?: string;
  endDate?: string;
}

const getProductTypeLabel = (type: string): string => {
  switch (type) {
    case 'finished': return 'ГП';
    case 'assembly': return 'СБ';
    case 'semi-finished': return 'ПФ';
    case 'material': return 'МАТ';
    default: return type;
  }
};

const getProductTypeBgColor = (type: string): string => {
  switch (type) {
    case 'finished': return '#dbeafe';
    case 'assembly': return '#f3e8ff';
    case 'semi-finished': return '#ffedd5';
    case 'material': return '#dcfce7';
    default: return '#f3f4f6';
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

export const WorkCenterReportPrintView = forwardRef<HTMLDivElement, WorkCenterReportPrintViewProps>(
  ({ reports, singleWorkCenterId, startDate, endDate }, ref) => {
    const filteredReports = singleWorkCenterId 
      ? reports.filter(r => r.work_center_id === singleWorkCenterId)
      : reports;

    // Группируем по цехам
    const departmentGroups = filteredReports.reduce((acc, report) => {
      const dept = report.department || 'Без цеха';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(report);
      return acc;
    }, {} as Record<string, WorkCenterReportData[]>);

    const sortedDepts = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b, 'ru'));

    return (
      <div ref={ref} className="p-8 bg-white text-black print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Заголовок отчета */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            ОТЧЕТ ПО ЦЕХАМ И ПРОИЗВОДСТВЕННЫМ УЧАСТКАМ
          </h1>
          <p style={{ fontSize: '12px', color: '#666' }}>
            {startDate || endDate 
              ? `Период: ${startDate || '—'} — ${endDate || '—'}`
              : 'Период: Все время'}
          </p>
          <p style={{ fontSize: '11px', color: '#999' }}>
            Дата формирования: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}
          </p>
        </div>

        {/* Сводка по типам продукции */}
        <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Сводка по типам продукции</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Тип</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Позиций</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>План</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Факт</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>Откл.</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allProducts = filteredReports.flatMap(r => r.products || []);
                const grouped = groupProductsByType(allProducts);
                
                return (['finished', 'assembly', 'semi-finished'] as const).map(type => {
                  const products = grouped[type];
                  const totalPlanned = products.reduce((s, p) => s + p.planned_quantity, 0);
                  const totalCompleted = products.reduce((s, p) => s + p.completed_quantity, 0);
                  const deviation = totalCompleted - totalPlanned;
                  const completionPercent = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

                  const labels = {
                    finished: 'Готовая продукция (ГП)',
                    assembly: 'Сборочные узлы (СБ)',
                    'semi-finished': 'Полуфабрикаты (ПФ)'
                  };

                  return (
                    <tr key={type}>
                      <td style={{ border: '1px solid #ddd', padding: '6px', backgroundColor: getProductTypeBgColor(type) }}>
                        {labels[type]}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{products.length}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{totalPlanned}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>{totalCompleted}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: deviation >= 0 ? '#16a34a' : '#dc2626' }}>
                        {deviation > 0 ? '+' : ''}{deviation}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right' }}>
                        {completionPercent.toFixed(1)}%
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Детализация по цехам */}
        {sortedDepts.map(dept => {
          const deptReports = departmentGroups[dept];
          const deptTotalPlanned = deptReports.reduce((s, r) => s + r.total_planned, 0);
          const deptTotalCompleted = deptReports.reduce((s, r) => s + r.total_completed, 0);
          const deptDeviation = deptTotalCompleted - deptTotalPlanned;
          const deptCompletionPercent = deptTotalPlanned > 0 ? (deptTotalCompleted / deptTotalPlanned) * 100 : 0;

          return (
            <div key={dept} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
              {/* Заголовок цеха */}
              <div style={{ backgroundColor: '#e5e7eb', padding: '8px 12px', borderRadius: '4px 4px 0 0', marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{dept}</h2>
                  <div style={{ fontSize: '12px', display: 'flex', gap: '16px' }}>
                    <span>План: <strong>{deptTotalPlanned}</strong></span>
                    <span>Факт: <strong>{deptTotalCompleted}</strong></span>
                    <span style={{ color: deptDeviation >= 0 ? '#16a34a' : '#dc2626' }}>
                      Откл.: <strong>{deptDeviation > 0 ? '+' : ''}{deptDeviation}</strong>
                    </span>
                    <span>Выполнение: <strong>{deptCompletionPercent.toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Участки */}
              {deptReports.sort((a, b) => a.work_center_name.localeCompare(b.work_center_name, 'ru')).map(report => {
                const grouped = groupProductsByType(report.products || []);
                
                return (
                  <div key={report.work_center_id} style={{ border: '1px solid #ddd', marginTop: '-1px', padding: '12px' }}>
                    {/* Заголовок участка */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{report.work_center_name}</span>
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>({report.work_center_code})</span>
                      </div>
                      <div style={{ fontSize: '11px', display: 'flex', gap: '12px' }}>
                        <span>План: <strong>{report.total_planned}</strong></span>
                        <span>Факт: <strong>{report.total_completed}</strong></span>
                        <span style={{ color: report.total_deviation >= 0 ? '#16a34a' : '#dc2626' }}>
                          Откл.: <strong>{report.total_deviation > 0 ? '+' : ''}{report.total_deviation}</strong>
                        </span>
                        <span>Выполнение: <strong>{report.completion_percent.toFixed(1)}%</strong></span>
                      </div>
                    </div>

                    {/* Таблица продукции по группам */}
                    {(['finished', 'assembly', 'semi-finished'] as const).map(type => {
                      const products = grouped[type];
                      if (products.length === 0) return null;

                      const labels = {
                        finished: 'Готовая продукция',
                        assembly: 'Сборочные узлы',
                        'semi-finished': 'Полуфабрикаты'
                      };

                      return (
                        <div key={type} style={{ marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#555' }}>
                            {labels[type]} ({products.length})
                          </h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ backgroundColor: getProductTypeBgColor(type) }}>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'left' }}>Код</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'left' }}>Наименование</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>План</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>Факт</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>Откл.</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.map(product => (
                                <tr key={product.product_id}>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px' }}>{product.product_code}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px' }}>{product.product_name}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>{product.planned_quantity}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>{product.completed_quantity}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right', color: product.deviation >= 0 ? '#16a34a' : '#dc2626' }}>
                                    {product.deviation > 0 ? '+' : ''}{product.deviation}
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>
                                    {product.deviation_percent.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    
                    {(!report.products || report.products.length === 0) && (
                      <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>Нет продукции на данном участке</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Подпись */}
        <div style={{ marginTop: '32px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
          <p>ERP Vostok Auto — Отчет по цехам</p>
        </div>
      </div>
    );
  }
);

WorkCenterReportPrintView.displayName = 'WorkCenterReportPrintView';
