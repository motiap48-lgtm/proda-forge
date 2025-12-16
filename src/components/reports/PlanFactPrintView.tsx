import { forwardRef } from 'react';
import { ProductionReportData } from '@/hooks/useProductionReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PlanFactPrintViewProps {
  reports: ProductionReportData[];
  startDate?: string;
  endDate?: string;
  printType: 'all' | 'finished' | 'assembly' | 'semi-finished';
}

const statusLabels: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершен',
  cancelled: 'Отменен',
  on_hold: 'Приостановлен',
};

const productTypeConfig: Record<string, { label: string; badge: string; color: string }> = {
  finished: { label: 'Готовая продукция', badge: 'ГП', color: '#3b82f6' },
  assembly: { label: 'Сборочные узлы', badge: 'СБ', color: '#8b5cf6' },
  'semi-finished': { label: 'Полуфабрикаты', badge: 'ПФ', color: '#f97316' },
};

interface ProductTypeTableProps {
  reports: ProductionReportData[];
  type: string;
  config: { label: string; badge: string; color: string };
}

const ProductTypeTable = ({ reports, type, config }: ProductTypeTableProps) => {
  const typeReports = reports.filter(r => r.product_type === type);
  if (typeReports.length === 0) return null;

  const totals = typeReports.reduce((acc, r) => ({
    original: acc.original + r.original_planned_quantity,
    current: acc.current + r.planned_quantity,
    planChange: acc.planChange + r.plan_change,
    completed: acc.completed + r.completed_quantity,
    deviation: acc.deviation + r.deviation,
  }), { original: 0, current: 0, planChange: 0, completed: 0, deviation: 0 });

  return (
    <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '8px'
      }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          backgroundColor: config.color,
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {config.badge}
        </span>
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{config.label}</span>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>({typeReports.length} заказов)</span>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'left' }}>№ заказа</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'left' }}>Изделие</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>План (исх.)</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>План (тек.)</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Изм.</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Факт</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Откл.</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {typeReports.map((report, idx) => (
            <tr key={report.order_number} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
              <td style={{ border: '1px solid #d1d5db', padding: '6px', fontFamily: 'monospace' }}>
                {report.order_number}
              </td>
              <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>
                <div style={{ fontWeight: '500' }}>{report.product_name}</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>{report.product_code}</div>
              </td>
              <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                {report.original_planned_quantity}
              </td>
              <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                {report.planned_quantity}
              </td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '6px', 
                textAlign: 'right',
                color: report.plan_change > 0 ? '#d97706' : report.plan_change < 0 ? '#059669' : 'inherit'
              }}>
                {report.plan_change > 0 ? '+' : ''}{report.plan_change}
              </td>
              <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                {report.completed_quantity}
              </td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '6px', 
                textAlign: 'right',
                color: report.deviation >= 0 ? '#059669' : '#dc2626',
                fontWeight: '500'
              }}>
                {report.deviation > 0 ? '+' : ''}{report.deviation}
              </td>
              <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center' }}>
                {statusLabels[report.status] || report.status}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
            <td style={{ border: '1px solid #d1d5db', padding: '6px' }} colSpan={2}>ИТОГО</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.original}</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.current}</td>
            <td style={{ 
              border: '1px solid #d1d5db', 
              padding: '6px', 
              textAlign: 'right',
              color: totals.planChange > 0 ? '#d97706' : totals.planChange < 0 ? '#059669' : 'inherit'
            }}>
              {totals.planChange > 0 ? '+' : ''}{totals.planChange}
            </td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.completed}</td>
            <td style={{ 
              border: '1px solid #d1d5db', 
              padding: '6px', 
              textAlign: 'right',
              color: totals.deviation >= 0 ? '#059669' : '#dc2626'
            }}>
              {totals.deviation > 0 ? '+' : ''}{totals.deviation}
            </td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px' }}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export const PlanFactPrintView = forwardRef<HTMLDivElement, PlanFactPrintViewProps>(
  ({ reports, startDate, endDate, printType }, ref) => {
    const typesToPrint = printType === 'all' 
      ? ['finished', 'assembly', 'semi-finished'] 
      : [printType];

    const dateRange = startDate && endDate
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время';

    const title = printType === 'all'
      ? 'Отчет план-факт производства'
      : `Отчет план-факт: ${productTypeConfig[printType]?.label || printType}`;

    return (
      <div ref={ref} style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            @media print {
              @page { margin: 15mm; size: A4 landscape; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}
        </style>
        
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #1f2937', paddingBottom: '12px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {title}
          </h1>
          <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#4b5563' }}>
            <span>Период: {dateRange}</span>
            <span>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
          </div>
        </div>

        {typesToPrint.map(type => (
          <ProductTypeTable
            key={type}
            reports={reports}
            type={type}
            config={productTypeConfig[type]}
          />
        ))}

        {printType === 'all' && (
          <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Общая сводка</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#6b7280' }}>Всего заказов</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{reports.length}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>План (исх.)</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {reports.reduce((sum, r) => sum + r.original_planned_quantity, 0)}
                </div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>Факт</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {reports.reduce((sum, r) => sum + r.completed_quantity, 0)}
                </div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>Отклонение</div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: reports.reduce((sum, r) => sum + r.deviation, 0) >= 0 ? '#059669' : '#dc2626'
                }}>
                  {reports.reduce((sum, r) => sum + r.deviation, 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PlanFactPrintView.displayName = 'PlanFactPrintView';
