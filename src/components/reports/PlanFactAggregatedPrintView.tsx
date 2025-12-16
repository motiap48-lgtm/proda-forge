import { forwardRef } from 'react';
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

interface PlanFactAggregatedPrintViewProps {
  aggregatedProducts: AggregatedProduct[];
  allReports: ProductionReportData[];
  startDate?: string;
  endDate?: string;
  showDetails?: boolean;
  completionFilter?: 'all' | 'not_completed' | 'partially' | 'completed';
}

const completionFilterLabels: Record<string, string> = {
  all: '',
  not_completed: 'Невыполненные (0%)',
  partially: 'Частично выполненные (1-99%)',
  completed: 'Выполненные (100%)',
};

const productTypeConfig: Record<string, { label: string; badge: string; color: string }> = {
  finished: { label: 'Готовая продукция', badge: 'ГП', color: '#3b82f6' },
  assembly: { label: 'Сборочные узлы', badge: 'СБ', color: '#8b5cf6' },
  'semi-finished': { label: 'Полуфабрикаты', badge: 'ПФ', color: '#f97316' },
};

const statusLabels: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершен',
  cancelled: 'Отменен',
  on_hold: 'Приостановлен',
};

interface ProductTypeTableProps {
  products: AggregatedProduct[];
  allReports: ProductionReportData[];
  type: string;
  config: { label: string; badge: string; color: string };
  showDetails?: boolean;
}

const ProductTypeTable = ({ products, allReports, type, config, showDetails }: ProductTypeTableProps) => {
  const typeProducts = products.filter(p => p.product_type === type);
  if (typeProducts.length === 0) return null;

  const totals = typeProducts.reduce((acc, p) => ({
    original: acc.original + p.original_planned_quantity,
    current: acc.current + p.planned_quantity,
    completed: acc.completed + p.completed_quantity,
    deviation: acc.deviation + p.deviation,
    orders: acc.orders + p.order_count,
  }), { original: 0, current: 0, completed: 0, deviation: 0, orders: 0 });

  return (
    <div style={{ marginBottom: '24px' }}>
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
        <span style={{ color: '#6b7280', fontSize: '14px' }}>({typeProducts.length} изд., {totals.orders} заказов)</span>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'left' }}>Изделие</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Заказов</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>План (исх.)</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>План (тек.)</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Факт</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Откл.</th>
            <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>Выполн.</th>
          </tr>
        </thead>
        <tbody>
          {typeProducts.map((product, idx) => {
            const productOrders = allReports.filter(r => r.product_code === product.product_code);
            const completionPercent = product.planned_quantity > 0 
              ? ((product.completed_quantity / product.planned_quantity) * 100).toFixed(0) 
              : '0';

            return (
              <>
                <tr key={product.product_code} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>
                    <div style={{ fontWeight: '500' }}>{product.product_name}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{product.product_code}</div>
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right', color: '#6b7280' }}>
                    {product.order_count}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                    {product.original_planned_quantity}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                    {product.planned_quantity}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                    {product.completed_quantity}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px', 
                    textAlign: 'right',
                    color: product.deviation >= 0 ? '#059669' : '#dc2626',
                    fontWeight: '500'
                  }}>
                    {product.deviation > 0 ? '+' : ''}{product.deviation}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                    {completionPercent}%
                  </td>
                </tr>
                {showDetails && productOrders.length > 0 && (
                  <tr key={`${product.product_code}-details`}>
                    <td colSpan={7} style={{ border: '1px solid #d1d5db', padding: '4px 6px 4px 24px', backgroundColor: '#fafafa' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        {productOrders.map((order, i) => (
                          <span key={order.order_number}>
                            {order.order_number}: {order.planned_quantity} → {order.completed_quantity} ({statusLabels[order.status]})
                            {i < productOrders.length - 1 && ' | '}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
            <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>ИТОГО ({typeProducts.length} изд.)</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.orders}</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.original}</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.current}</td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{totals.completed}</td>
            <td style={{ 
              border: '1px solid #d1d5db', 
              padding: '6px', 
              textAlign: 'right',
              color: totals.deviation >= 0 ? '#059669' : '#dc2626'
            }}>
              {totals.deviation > 0 ? '+' : ''}{totals.deviation}
            </td>
            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
              {totals.current > 0 ? ((totals.completed / totals.current) * 100).toFixed(0) : '0'}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export const PlanFactAggregatedPrintView = forwardRef<HTMLDivElement, PlanFactAggregatedPrintViewProps>(
  ({ aggregatedProducts, allReports, startDate, endDate, showDetails, completionFilter }, ref) => {
    const types = ['finished', 'assembly', 'semi-finished'] as const;

    const hasDataToPrint = aggregatedProducts.length > 0;

    const dateRange = startDate && endDate
      ? `${format(new Date(startDate), 'dd.MM.yyyy', { locale: ru })} - ${format(new Date(endDate), 'dd.MM.yyyy', { locale: ru })}`
      : 'Все время';

    const filterLabel = completionFilter && completionFilter !== 'all' 
      ? completionFilterLabels[completionFilter] 
      : '';

    if (!hasDataToPrint) {
      return (
        <div ref={ref} style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <style>
            {`
              @media print {
                @page { margin: 10mm; size: A4 landscape; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            `}
          </style>
          
          <div style={{ marginBottom: '12px', borderBottom: '2px solid #1f2937', paddingBottom: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              Отчет план-факт (суммарно по изделиям)
            </h1>
            <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#4b5563' }}>
              <span>Период: {dateRange}</span>
              {filterLabel && <span>Фильтр: {filterLabel}</span>}
              <span>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Нет данных для отображения
          </div>
        </div>
      );
    }

    const totalProducts = aggregatedProducts.length;
    const totalOrders = aggregatedProducts.reduce((sum, p) => sum + p.order_count, 0);

    return (
      <div ref={ref} style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            @media print {
              @page { margin: 10mm; size: A4 landscape; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { page-break-inside: avoid; }
            }
          `}
        </style>
        
        <div style={{ marginBottom: '8px', borderBottom: '2px solid #1f2937', paddingBottom: '6px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            Отчет план-факт (суммарно по изделиям)
            {showDetails && ' с детализацией'}
          </h1>
          <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: '#4b5563', flexWrap: 'wrap' }}>
            <span>Период: {dateRange}</span>
            {filterLabel && (
              <span style={{ 
                backgroundColor: '#fef3c7', 
                padding: '1px 6px', 
                borderRadius: '4px',
                color: '#92400e'
              }}>
                Фильтр: {filterLabel}
              </span>
            )}
            <span>{totalProducts} изделий, {totalOrders} заказов</span>
            <span>Дата печати: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
          </div>
        </div>

        {types.map(type => (
          <ProductTypeTable
            key={type}
            products={aggregatedProducts}
            allReports={allReports}
            type={type}
            config={productTypeConfig[type]}
            showDetails={showDetails}
          />
        ))}

        <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Общая сводка</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '11px' }}>
            <div>
              <div style={{ color: '#6b7280' }}>Изделий</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{totalProducts}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Заказов</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{totalOrders}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>План (исх.)</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {aggregatedProducts.reduce((sum, p) => sum + p.original_planned_quantity, 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Факт</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {aggregatedProducts.reduce((sum, p) => sum + p.completed_quantity, 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Отклонение</div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: aggregatedProducts.reduce((sum, p) => sum + p.deviation, 0) >= 0 ? '#059669' : '#dc2626'
              }}>
                {aggregatedProducts.reduce((sum, p) => sum + p.deviation, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PlanFactAggregatedPrintView.displayName = 'PlanFactAggregatedPrintView';
