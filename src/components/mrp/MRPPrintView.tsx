import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  PurchaseRequirement, 
  ProductionRequirement, 
  WorkCenterReport 
} from "@/hooks/useMRPPlanning";

type PrintType = "purchase" | "production" | "workcenter";

interface PrintOptions {
  type: PrintType;
  purchaseRequirements?: PurchaseRequirement[];
  productionRequirements?: ProductionRequirement[];
  workCenterReport?: WorkCenterReport;
  allWorkCenterReports?: WorkCenterReport[];
  planningHorizon: number;
  startDate: string;
}

const getProductTypeLabel = (type: string) => {
  switch (type) {
    case "material": return "МАТ";
    case "semi-finished": return "ПФ";
    case "assembly": return "СБ";
    case "finished": return "ГП";
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

const generatePrintStyles = () => `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .header .meta {
      font-size: 11px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: 600;
      font-size: 11px;
    }
    td {
      font-size: 11px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
    }
    .badge-material { background: #dcfce7; color: #166534; }
    .badge-semi-finished { background: #ffedd5; color: #c2410c; }
    .badge-assembly { background: #f3e8ff; color: #7e22ce; }
    .badge-finished { background: #dbeafe; color: #1d4ed8; }
    .badge-shortage { background: #fee2e2; color: #dc2626; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .delta-increase { color: #d97706; font-weight: 600; }
    .delta-decrease { color: #16a34a; font-weight: 600; }
    .work-center-header {
      background: #f0f9ff;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #bae6fd;
      border-radius: 4px;
    }
    .work-center-header h2 {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .work-center-header .meta {
      font-size: 11px;
      color: #666;
    }
    .summary {
      margin-bottom: 20px;
      padding: 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .page-break {
      page-break-before: always;
    }
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
`;

const formatPlanDelta = (increase: number, decrease: number) => {
  if (increase > 0 && decrease > 0) {
    return `<span class="delta-increase">+${increase.toFixed(2)}</span> / <span class="delta-decrease">-${decrease.toFixed(2)}</span>`;
  } else if (increase > 0) {
    return `<span class="delta-increase">+${increase.toFixed(2)}</span>`;
  } else if (decrease > 0) {
    return `<span class="delta-decrease">-${decrease.toFixed(2)}</span>`;
  }
  return '—';
};

const generatePurchaseRequirementsHTML = (
  requirements: PurchaseRequirement[],
  planningHorizon: number,
  startDate: string
) => {
  const shortages = requirements.filter(r => r.status === "shortage").length;
  const warnings = requirements.filter(r => r.status === "warning").length;
  const hasChanges = requirements.some(r => r.plan_increase_requirement > 0 || r.plan_decrease_amount > 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Потребность к закупке</title>
      ${generatePrintStyles()}
    </head>
    <body>
      <div class="header">
        <h1>ПЛАНОВАЯ ПОТРЕБНОСТЬ К ЗАКУПКЕ</h1>
        <p class="meta">
          Горизонт планирования: ${planningHorizon} дней | 
          Дата начала: ${format(new Date(startDate), "dd.MM.yyyy", { locale: ru })} |
          Сформировано: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}
        </p>
      </div>
      
      <div class="summary">
        <div class="summary-row">
          <span>Всего позиций:</span>
          <strong>${requirements.length}</strong>
        </div>
        <div class="summary-row">
          <span>Позиций с дефицитом:</span>
          <strong style="color: #dc2626">${shortages}</strong>
        </div>
        <div class="summary-row">
          <span>Позиций с предупреждением:</span>
          <strong style="color: #d97706">${warnings}</strong>
        </div>
        ${hasChanges ? `
        <div class="summary-row">
          <span>Позиций с изменением плана:</span>
          <strong>${requirements.filter(r => r.plan_increase_requirement > 0 || r.plan_decrease_amount > 0).length}</strong>
        </div>
        ` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 6%">Тип</th>
            <th style="width: 8%">Код</th>
            <th style="width: 18%">Наименование</th>
            <th class="text-right" style="width: 9%">Валовая потр.</th>
            <th class="text-right" style="width: 9%">Δ плана</th>
            <th class="text-right" style="width: 9%">На складе</th>
            <th class="text-right" style="width: 9%">Резерв</th>
            <th class="text-right" style="width: 9%">Доступно</th>
            <th class="text-right" style="width: 9%">Чистая потр.</th>
            <th class="text-center" style="width: 8%">Статус</th>
          </tr>
        </thead>
        <tbody>
          ${requirements.map(item => `
            <tr>
              <td><span class="badge badge-${item.product_type}">${getProductTypeLabel(item.product_type)}</span></td>
              <td>${item.product_code}</td>
              <td>${item.product_name}</td>
              <td class="text-right">${item.gross_requirement.toFixed(2)} ${item.unit}</td>
              <td class="text-right">${formatPlanDelta(item.plan_increase_requirement, item.plan_decrease_amount)}</td>
              <td class="text-right">${item.on_hand.toFixed(2)}</td>
              <td class="text-right">${item.reserved.toFixed(2)}</td>
              <td class="text-right">${item.available.toFixed(2)}</td>
              <td class="text-right" style="font-weight: 600; color: ${item.net_requirement > 0 ? '#dc2626' : '#16a34a'}">
                ${item.net_requirement.toFixed(2)}
              </td>
              <td class="text-center"><span class="badge badge-${item.status}">${getStatusLabel(item.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <span>Документ сформирован автоматически системой MRP</span>
        <span>Стр. 1</span>
      </div>
    </body>
    </html>
  `;
};

const generateProductionRequirementsHTML = (
  requirements: ProductionRequirement[],
  planningHorizon: number,
  startDate: string
) => {
  const shortages = requirements.filter(r => r.status === "shortage").length;
  const hasChanges = requirements.some(r => r.plan_increase_requirement > 0 || r.plan_decrease_amount > 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Потребность к производству</title>
      ${generatePrintStyles()}
    </head>
    <body>
      <div class="header">
        <h1>ПОТРЕБНОСТЬ К ПРОИЗВОДСТВУ</h1>
        <p class="meta">
          Горизонт планирования: ${planningHorizon} дней | 
          Дата начала: ${format(new Date(startDate), "dd.MM.yyyy", { locale: ru })} |
          Сформировано: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}
        </p>
      </div>
      
      <div class="summary">
        <div class="summary-row">
          <span>Всего позиций к производству:</span>
          <strong>${requirements.length}</strong>
        </div>
        <div class="summary-row">
          <span>Позиций с дефицитом:</span>
          <strong style="color: #dc2626">${shortages}</strong>
        </div>
        ${hasChanges ? `
        <div class="summary-row">
          <span>Позиций с изменением плана:</span>
          <strong>${requirements.filter(r => r.plan_increase_requirement > 0 || r.plan_decrease_amount > 0).length}</strong>
        </div>
        ` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%">Тип</th>
            <th style="width: 7%">Код</th>
            <th style="width: 16%">Наименование</th>
            <th style="width: 10%">Участок</th>
            <th class="text-right" style="width: 8%">Валовая</th>
            <th class="text-right" style="width: 8%">Δ плана</th>
            <th class="text-right" style="width: 8%">На складе</th>
            <th class="text-right" style="width: 8%">Резерв</th>
            <th class="text-right" style="width: 8%">Доступно</th>
            <th class="text-right" style="width: 9%">Чистая потр.</th>
            <th class="text-center" style="width: 7%">Статус</th>
          </tr>
        </thead>
        <tbody>
          ${requirements.map(item => `
            <tr>
              <td><span class="badge badge-${item.product_type}">${getProductTypeLabel(item.product_type)}</span></td>
              <td>${item.product_code}</td>
              <td>${item.product_name}</td>
              <td>${item.work_center_name || '—'}</td>
              <td class="text-right">${item.gross_requirement.toFixed(2)} ${item.unit}</td>
              <td class="text-right">${formatPlanDelta(item.plan_increase_requirement, item.plan_decrease_amount)}</td>
              <td class="text-right">${item.on_hand.toFixed(2)}</td>
              <td class="text-right">${item.reserved.toFixed(2)}</td>
              <td class="text-right">${item.available.toFixed(2)}</td>
              <td class="text-right" style="font-weight: 600; color: ${item.net_requirement > 0 ? '#dc2626' : '#16a34a'}">
                ${item.net_requirement.toFixed(2)}
              </td>
              <td class="text-center"><span class="badge badge-${item.status}">${getStatusLabel(item.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <span>Документ сформирован автоматически системой MRP</span>
        <span>Стр. 1</span>
      </div>
    </body>
    </html>
  `;
};

const generateWorkCenterReportHTML = (
  report: WorkCenterReport,
  planningHorizon: number,
  startDate: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Рапорт участка ${report.work_center_name}</title>
      ${generatePrintStyles()}
    </head>
    <body>
      <div class="header">
        <h1>РАПОРТ ПО УЧАСТКУ</h1>
        <p class="meta">
          Горизонт планирования: ${planningHorizon} дней | 
          Дата начала: ${format(new Date(startDate), "dd.MM.yyyy", { locale: ru })} |
          Сформировано: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}
        </p>
      </div>

      <div class="work-center-header">
        <h2>${report.work_center_name}</h2>
        <p class="meta">Код: ${report.work_center_code} | Всего позиций: ${report.total_items} | К производству: ${report.total_quantity.toFixed(0)} ед.</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 10%">Тип</th>
            <th style="width: 15%">Код</th>
            <th style="width: 45%">Наименование</th>
            <th class="text-right" style="width: 15%">Количество</th>
            <th class="text-center" style="width: 15%">Ед. изм.</th>
          </tr>
        </thead>
        <tbody>
          ${report.items.map(item => `
            <tr>
              <td><span class="badge badge-${item.product_type}">${getProductTypeLabel(item.product_type)}</span></td>
              <td>${item.product_code}</td>
              <td>${item.product_name}</td>
              <td class="text-right" style="font-weight: 600; font-size: 13px">${item.quantity.toFixed(2)}</td>
              <td class="text-center">${item.unit}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f5f5f5; font-weight: 600">
            <td colspan="3">ИТОГО</td>
            <td class="text-right">${report.total_quantity.toFixed(2)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <span>Документ сформирован автоматически системой MRP</span>
        <span>Стр. 1</span>
      </div>
    </body>
    </html>
  `;
};

const generateAllWorkCenterReportsHTML = (
  reports: WorkCenterReport[],
  planningHorizon: number,
  startDate: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Рапорты по участкам</title>
      ${generatePrintStyles()}
    </head>
    <body>
      <div class="header">
        <h1>РАПОРТЫ ПО УЧАСТКАМ</h1>
        <p class="meta">
          Горизонт планирования: ${planningHorizon} дней | 
          Дата начала: ${format(new Date(startDate), "dd.MM.yyyy", { locale: ru })} |
          Сформировано: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}
        </p>
      </div>

      <div class="summary">
        <div class="summary-row">
          <span>Всего участков:</span>
          <strong>${reports.length}</strong>
        </div>
        <div class="summary-row">
          <span>Всего позиций к производству:</span>
          <strong>${reports.reduce((sum, r) => sum + r.total_items, 0)}</strong>
        </div>
      </div>

      ${reports.map((report, index) => `
        ${index > 0 ? '<div class="page-break"></div>' : ''}
        <div class="work-center-header" style="margin-top: ${index > 0 ? '0' : '20px'}">
          <h2>${report.work_center_name}</h2>
          <p class="meta">Код: ${report.work_center_code} | Всего позиций: ${report.total_items} | К производству: ${report.total_quantity.toFixed(0)} ед.</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%">Тип</th>
              <th style="width: 15%">Код</th>
              <th style="width: 45%">Наименование</th>
              <th class="text-right" style="width: 15%">Количество</th>
              <th class="text-center" style="width: 15%">Ед. изм.</th>
            </tr>
          </thead>
          <tbody>
            ${report.items.map(item => `
              <tr>
                <td><span class="badge badge-${item.product_type}">${getProductTypeLabel(item.product_type)}</span></td>
                <td>${item.product_code}</td>
                <td>${item.product_name}</td>
                <td class="text-right" style="font-weight: 600">${item.quantity.toFixed(2)}</td>
                <td class="text-center">${item.unit}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f5f5f5; font-weight: 600">
              <td colspan="3">ИТОГО по участку</td>
              <td class="text-right">${report.total_quantity.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      `).join('')}

      <div class="footer">
        <span>Документ сформирован автоматически системой MRP</span>
        <span>Стр. 1</span>
      </div>
    </body>
    </html>
  `;
};

export const printMRPReport = (options: PrintOptions) => {
  let html = '';
  
  switch (options.type) {
    case "purchase":
      html = generatePurchaseRequirementsHTML(
        options.purchaseRequirements || [],
        options.planningHorizon,
        options.startDate
      );
      break;
    case "production":
      html = generateProductionRequirementsHTML(
        options.productionRequirements || [],
        options.planningHorizon,
        options.startDate
      );
      break;
    case "workcenter":
      if (options.workCenterReport) {
        html = generateWorkCenterReportHTML(
          options.workCenterReport,
          options.planningHorizon,
          options.startDate
        );
      } else if (options.allWorkCenterReports) {
        html = generateAllWorkCenterReportsHTML(
          options.allWorkCenterReports,
          options.planningHorizon,
          options.startDate
        );
      }
      break;
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
