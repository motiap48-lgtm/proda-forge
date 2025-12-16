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

const ComponentTable = ({ 
  items, 
  badge, 
  badgeColor, 
  title 
}: { 
  items: ProductionReportData[]; 
  badge: string; 
  badgeColor: string; 
  title: string;
}) => {
  if (items.length === 0) return null;

  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        marginBottom: '6px',
        fontSize: '11px',
        fontWeight: '500'
      }}>
        <span style={{
          display: 'inline-block',
          padding: '1px 5px',
          backgroundColor: badgeColor,
          color: 'white',
          borderRadius: '3px',
          fontSize: '9px',
          fontWeight: 'bold'
        }}>{badge}</span>
        {title} ({items.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'left', width: '18%' }}>№ заказа</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'left' }}>Изделие</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right', width: '10%' }}>План</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right', width: '10%' }}>Факт</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right', width: '8%' }}>Откл.</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'center', width: '12%' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.order_number} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px', fontFamily: 'monospace', fontSize: '8px' }}>{item.order_number}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px' }}>
                {item.product_name}
                <span style={{ fontSize: '8px', color: '#6b7280', marginLeft: '4px' }}>({item.product_code})</span>
              </td>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right' }}>{item.planned_quantity}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right' }}>{item.completed_quantity}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'right', color: item.deviation >= 0 ? '#059669' : '#dc2626' }}>
                {item.deviation > 0 ? '+' : ''}{item.deviation}
              </td>
              <td style={{ border: '1px solid #e5e7eb', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                {statusLabels[item.status] || item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OrderCard = ({ order, isCompact }: { order: GroupedOrder; isCompact?: boolean }) => {
  const { parent, assemblies, semiFinished, totals, childCount } = order;
  const deviation = totals.completed - totals.planned;

  return (
    <div style={{ 
      marginBottom: '12px', 
      border: '1px solid #d1d5db', 
      borderRadius: '6px',
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '6px 10px',
        borderBottom: '1px solid #d1d5db',
        borderRadius: '6px 6px 0 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block',
              padding: '1px 6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>ГП</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>
              {parent.order_number}
            </span>
            <span style={{ color: '#6b7280' }}>—</span>
            <span style={{ fontWeight: '500', fontSize: '11px' }}>{parent.product_name}</span>
            {childCount > 0 && (
              <span style={{ color: '#6b7280', fontSize: '10px' }}>
                (+{childCount} комп.)
              </span>
            )}
          </div>
          <div style={{ 
            padding: '1px 6px',
            backgroundColor: parent.status === 'completed' ? '#dcfce7' : parent.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
            color: parent.status === 'completed' ? '#166534' : parent.status === 'in_progress' ? '#1e40af' : '#374151',
            borderRadius: '3px',
            fontSize: '9px'
          }}>
            {statusLabels[parent.status] || parent.status}
          </div>
        </div>
        {parent.customer_name && (
          <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
            Клиент: {parent.customer_name}
          </div>
        )}
      </div>

      {/* Parent order info - compact */}
      <div style={{ padding: '6px 10px', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '10px' }}>
          <div>
            <div style={{ color: '#6b7280', fontSize: '9px' }}>Код</div>
            <div style={{ fontWeight: '500' }}>{parent.product_code}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '9px' }}>План (исх.)</div>
            <div style={{ fontWeight: '500' }}>{parent.original_planned_quantity}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '9px' }}>План (тек.)</div>
            <div style={{ fontWeight: '500' }}>{parent.planned_quantity}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '9px' }}>Факт</div>
            <div style={{ fontWeight: '500' }}>{parent.completed_quantity}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '9px' }}>Откл.</div>
            <div style={{ fontWeight: '500', color: parent.deviation >= 0 ? '#059669' : '#dc2626' }}>
              {parent.deviation > 0 ? '+' : ''}{parent.deviation}
            </div>
          </div>
        </div>
      </div>

      {/* Components */}
      <ComponentTable items={assemblies} badge="СБ" badgeColor="#8b5cf6" title="Сборочные узлы" />
      <ComponentTable items={semiFinished} badge="ПФ" badgeColor="#f97316" title="Полуфабрикаты" />

      {/* Order totals */}
      {childCount > 0 && (
        <div style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', borderRadius: '0 0 6px 6px' }}>
          <div style={{ fontSize: '9px', display: 'flex', gap: '12px' }}>
            <span><strong>Итого:</strong></span>
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
              @page { margin: 8mm; size: A4; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .print-header { page-break-after: avoid; }
              .order-card-small { page-break-inside: avoid; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { page-break-inside: avoid; }
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
        {groupedOrders.map((order, index) => {
          const isSmallOrder = order.childCount <= 5;
          return (
            <div 
              key={order.parent.order_id} 
              className={isSmallOrder ? 'order-card-small' : ''} 
              style={index === 0 ? { pageBreakBefore: 'avoid' } : undefined}
            >
              <OrderCard order={order} />
            </div>
          );
        })}

        {/* Overall summary */}
        <div style={{ 
          marginTop: '16px', 
          padding: '10px', 
          backgroundColor: '#1f2937', 
          color: 'white',
          borderRadius: '6px',
          pageBreakInside: 'avoid'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Общая сводка</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '10px' }}>
            <div>
              <div style={{ color: '#9ca3af', fontSize: '9px' }}>Всего заказов</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{groupedOrders.length}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af', fontSize: '9px' }}>План (общ.)</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{overallTotals.planned}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af', fontSize: '9px' }}>Факт (общ.)</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{overallTotals.completed}</div>
            </div>
            <div>
              <div style={{ color: '#9ca3af', fontSize: '9px' }}>Отклонение</div>
              <div style={{ 
                fontSize: '14px', 
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
