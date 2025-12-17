import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const getEmployeeTypeLabel = (type: string) => {
  switch (type) {
    case "operator": return "Станочник";
    case "assembler": return "Сборщик";
    case "welder": return "Сварщик";
    case "universal": return "Универсал";
    default: return type;
  }
};

const getAvailableTime = (operator: any): string => {
  const shifts = operator.work_schedules?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return "-";
  
  const totalMinutes = shifts.reduce((sum: number, shift: any) => {
    const netMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
    return sum + netMinutes;
  }, 0);
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
};

export const exportOperatorsToExcel = (operators: any[]) => {
  const data = operators.map((op, index) => ({
    "№": index + 1,
    "Код": op.code,
    "ФИО": op.full_name,
    "Должность": op.position || "-",
    "Тип": getEmployeeTypeLabel(op.employee_type),
    "Участок": op.work_centers?.name || "-",
    "График": op.work_schedules?.name || "-",
    "Доступное время": getAvailableTime(op),
    "Телефон": op.phone || "-",
    "Email": op.email || "-",
    "Дата приёма": op.hire_date ? format(new Date(op.hire_date), "dd.MM.yyyy") : "-",
    "Статус": op.is_active ? "Активен" : "Неактивен",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 4 },  // №
    { wch: 10 }, // Код
    { wch: 30 }, // ФИО
    { wch: 20 }, // Должность
    { wch: 12 }, // Тип
    { wch: 20 }, // Участок
    { wch: 15 }, // График
    { wch: 15 }, // Доступное время
    { wch: 18 }, // Телефон
    { wch: 25 }, // Email
    { wch: 12 }, // Дата приёма
    { wch: 10 }, // Статус
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Операторы");
  
  const fileName = `Операторы_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const printOperators = (operators: any[]) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const activeCount = operators.filter(op => op.is_active).length;
  const currentDate = format(new Date(), "dd MMMM yyyy", { locale: ru });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Список операторов</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11px;
          padding: 15mm;
          color: #333;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
        }
        .header .meta {
          text-align: right;
          font-size: 10px;
          color: #666;
        }
        .summary {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          font-size: 11px;
        }
        .summary span {
          background: #f5f5f5;
          padding: 4px 10px;
          border-radius: 4px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse;
          font-size: 10px;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 6px 8px; 
          text-align: left;
        }
        th { 
          background: #f8f9fa; 
          font-weight: 600;
          white-space: nowrap;
        }
        tr:nth-child(even) { background: #fafafa; }
        .status-active { color: #16a34a; font-weight: 500; }
        .status-inactive { color: #dc2626; }
        .type-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
          background: #e5e7eb;
        }
        @media print {
          body { padding: 10mm; }
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Список операторов</h1>
        <div class="meta">
          <div>Дата печати: ${currentDate}</div>
        </div>
      </div>
      
      <div class="summary">
        <span>Всего: <strong>${operators.length}</strong></span>
        <span>Активных: <strong>${activeCount}</strong></span>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Код</th>
            <th>ФИО</th>
            <th>Должность</th>
            <th>Тип</th>
            <th>Участок</th>
            <th>График</th>
            <th>Время</th>
            <th>Телефон</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${operators.map((op, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${op.code}</td>
              <td><strong>${op.full_name}</strong></td>
              <td>${op.position || "-"}</td>
              <td><span class="type-badge">${getEmployeeTypeLabel(op.employee_type)}</span></td>
              <td>${op.work_centers?.name || "-"}</td>
              <td>${op.work_schedules?.name || "-"}</td>
              <td>${getAvailableTime(op)}</td>
              <td>${op.phone || "-"}</td>
              <td class="${op.is_active ? "status-active" : "status-inactive"}">
                ${op.is_active ? "Активен" : "Неактивен"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
};
