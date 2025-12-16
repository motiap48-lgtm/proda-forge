import { forwardRef, useMemo } from 'react';
import { ProductionReportData } from '@/hooks/useProductionReports';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PlanFactByOrderPrintViewProps {
  reports: ProductionReportData[];
  startDate?: string;
  endDate?: string;
}

const statusLabels: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершен',
  cancelled: 'Отменен',
  on_hold: 'Приостановлен',
};

interface GroupedOrder {
  parent: ProductionReportData;
  assemblies: ProductionReportData[];
  semiFinished: ProductionReportData[];
  totals: { planned: number; completed: number };
  childCount: number;
}

const OrderCard = ({ order }: { order: GroupedOrder }) => {
  const { parent, assemblies, semiFinished, totals, childCount } = order;
  const deviation = totals.completed - totals.planned;

  return (
    <div style={{ 
      marginBottom: '20px', 
      border: '1px solid #d1d5db', 
      borderRadius: '8px',
      pageBreakInside: 'avoid'
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '10px 12px',
        borderBottom: '1px solid #d1d5db',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>ГП</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>
              {parent.order_number}
            </span>
            <span style={{ color: '#6b7280' }}>—</span>
            <span style={{ fontWeight: '500' }}>{parent.product_name}</span>
            {childCount > 0 && (
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                (+{childCount} компонентов)
              </span>
            )}
          </div>
          <div style={{ 
            padding: '2px 8px',
            backgroundColor: parent.status === 'completed' ? '#dcfce7' : parent.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
            color: parent.status === 'completed' ? '#166534' : parent.status === 'in_progress' ? '#1e40af' : '#374151',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {statusLabels[parent.status] || parent.status}
          </div>
        </div>
        {parent.customer_name && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            Клиент: {parent.customer_name}
          </div>
        )}
      </div>

      {/* Parent order info */}
      <div style={{ padding: '10px 12px', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px' }}>
          <div>
            <div style={{ color: '#6b7280' }}>Изделие</div>
            <div style={{ fontWeight: '500' }}>{parent.product_code}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>План</div>
            <div style={{ fontWeight: '500' }}>{parent.planned_quantity}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>Факт</div>
            <div style={{ fontWeight: '500' }}>{parent.completed_quantity}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280' }}>Отклонение</div>
            <div style={{ fontWeight: '500', color: parent.deviation >= 0 ? '#059669' : '#dc2626' }}>
              {parent.deviation > 0 ? '+' : ''}{parent.deviation}
            </div>
          </div>
        </div>
      </div>

      {/* Assemblies */}
      {assemblies.length > 0 && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            <span style={{
              display: 'inline-block',
              padding: '1px 6px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>СБ</span>
            Сборочные узлы ({assemblies.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'left' }}>№ заказа</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'left' }}>Изделие</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>План</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>Факт</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>Откл.</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {assemblies.map((a, idx) => (
                <tr key={a.order_number} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', fontFamily: 'monospace' }}>{a.order_number}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                    {a.product_name}
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>{a.product_code}</div>
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>{a.planned_quantity}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>{a.completed_quantity}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right', color: a.deviation >= 0 ? '#059669' : '#dc2626' }}>
                    {a.deviation > 0 ? '+' : ''}{a.deviation}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center' }}>
                    {statusLabels[a.status] || a.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Semi-finished */}
      {semiFinished.length > 0 && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            <span style={{
              display: 'inline-block',
              padding: '1px 6px',
              backgroundColor: '#f97316',
              color: 'white',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>ПФ</span>
            Полуфабрикаты ({semiFinished.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'left' }}>№ заказа</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'left' }}>Изделие</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>План</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>Факт</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>Откл.</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center' }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {semiFinished.map((sf, idx) => (
                <tr key={sf.order_number} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', fontFamily: 'monospace' }}>{sf.order_number}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}>
                    {sf.product_name}
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>{sf.product_code}</div>
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>{sf.planned_quantity}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right' }}>{sf.completed_quantity}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'right', color: sf.deviation >= 0 ? '#059669' : '#dc2626' }}>
                    {sf.deviation > 0 ? '+' : ''}{sf.deviation}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center' }}>
                    {statusLabels[sf.status] || sf.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order totals */}
      {childCount > 0 && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', borderRadius: '0 0 8px 8px' }}>
          <div style={{ fontSize: '11px', display: 'flex', gap: '16px' }}>
            <span><strong>Итого по заказу:</strong></span>
            <span>План: {totals.planned}</span>
            <span>Факт: {totals.completed}</span>
            <span style={{ color: deviation >= 0 ? '#059669' : '#dc2626' }}>
              Откл.: {deviation > 0 ? '+' : ''}{deviation}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const PlanFactByOrderPrintView = forwardRef<HTMLDivElement, PlanFactByOrderPrintViewProps>(
  ({ reports, startDate, endDate }, ref) => {
    const groupedOrders = useMemo(() => {
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
    }, [reports]);

    const dateRange = startDate && endDate
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время';

    const overallTotals = groupedOrders.reduce((acc, g) => ({
      planned: acc.planned + g.totals.planned,
      completed: acc.completed + g.totals.completed,
    }), { planned: 0, completed: 0 });

    if (groupedOrders.length === 0) {
      return (
        <div ref={ref} style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <style>
            {`
              @media print {
                @page { margin: 10mm; size: A4; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            `}
          </style>
          
          <div style={{ marginBottom: '12px', borderBottom: '2px solid #1f2937', paddingBottom: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              Отчет план-факт (по заказам)
            </h1>
            <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#4b5563' }}>
              <span>Период: {dateRange}</span>
              <span>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Нет данных для отображения
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            @media print {
              @page { margin: 10mm; size: A4; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .print-header { page-break-after: avoid; }
              .order-card { page-break-inside: avoid; }
            }
          `}
        </style>
        
        {/* Header */}
        <div className="print-header" style={{ marginBottom: '12px', borderBottom: '2px solid #1f2937', paddingBottom: '6px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            Отчет план-факт (по заказам)
          </h1>
          <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#4b5563' }}>
            <span>Период: {dateRange}</span>
            <span>Заказов: {groupedOrders.length}</span>
            <span>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
          </div>
        </div>

        {/* Orders */}
        {groupedOrders.map((order, index) => (
          <div key={order.parent.order_id} className="order-card" style={index === 0 ? { pageBreakBefore: 'avoid' } : undefined}>
            <OrderCard order={order} />
          </div>
        ))}

        {/* Overall summary */}
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: '#1f2937', 
          color: 'white',
          borderRadius: '8px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Общая сводка</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '11px' }}>
            <div>
              <div style={{ color: '#9ca3af' }}>Всего заказов</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{groupedOrders.length}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af' }}>План (общ.)</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{overallTotals.planned}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af' }}>Факт (общ.)</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{overallTotals.completed}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af' }}>Отклонение</div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: overallTotals.completed - overallTotals.planned >= 0 ? '#4ade80' : '#f87171'
              }}>
                {overallTotals.completed - overallTotals.planned > 0 ? '+' : ''}
                {overallTotals.completed - overallTotals.planned}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PlanFactByOrderPrintView.displayName = 'PlanFactByOrderPrintView';
