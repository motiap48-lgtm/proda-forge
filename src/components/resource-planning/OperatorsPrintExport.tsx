import * as XLSX from "xlsx";
import { format, differenceInWeeks } from "date-fns";
import { ru } from "date-fns/locale";

const getEmployeeTypeLabel = (type: string) => {
  switch (type) {
    case "operator": return "Станочник";
    case "assembler": return "Сборщик";
    case "welder": return "Сварщик";
    case "painter": return "Маляр";
    case "universal": return "Универсал";
    default: return type;
  }
};

// Get current shift for operator based on rotation logic
const getCurrentShiftInfo = (operator: any): { shiftName: string; availableTime: string; isRotating: boolean } | null => {
  const shifts = operator.work_schedules?.work_schedule_shifts;
  if (!shifts || shifts.length === 0) return null;
  
  let currentShift = null;
  
  // If only one shift - use it
  if (shifts.length === 1) {
    currentShift = shifts[0];
  }
  // Calculate current shift based on rotation
  else if (operator.shift_rotation_enabled && shifts.length >= 2) {
    const startDate = operator.shift_rotation_start_date 
      ? new Date(operator.shift_rotation_start_date) 
      : new Date();
    const today = new Date();
    const weeksDiff = differenceInWeeks(today, startDate);
    const startingShift = operator.assigned_shift_number || 1;
    const currentShiftNumber = ((startingShift - 1 + weeksDiff) % shifts.length) + 1;
    currentShift = shifts.find((s: any) => s.shift_number === currentShiftNumber);
  } 
  // Fixed shift assigned
  else if (operator.assigned_shift_number) {
    currentShift = shifts.find((s: any) => s.shift_number === operator.assigned_shift_number);
  }
  
  if (!currentShift) return null;
  
  const netMinutes = currentShift.net_work_minutes ?? (currentShift.gross_work_minutes - currentShift.break_minutes);
  const hours = Math.floor(netMinutes / 60);
  const minutes = netMinutes % 60;
  const availableTime = minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  
  return {
    shiftName: currentShift.shift_name,
    availableTime,
    isRotating: operator.shift_rotation_enabled && shifts.length >= 2
  };
};

export interface ExportOptions {
  shiftFilter?: string;
  totalAvailableTime?: string;
}

export const exportOperatorsToExcel = (operators: any[], options?: ExportOptions) => {
  const data = operators.map((op, index) => {
    const shiftInfo = getCurrentShiftInfo(op);
    return {
      "№": index + 1,
      "Код": op.code,
      "ФИО": op.full_name,
      "Должность": op.position || "-",
      "Тип": getEmployeeTypeLabel(op.employee_type),
      "Участок": op.work_centers?.name || "-",
      "График": op.work_schedules?.name || "-",
      "Текущая смена": shiftInfo?.shiftName || "-",
      "Ротация": shiftInfo?.isRotating ? "Да" : "Нет",
      "Доступное время": shiftInfo?.availableTime || "-",
      "Телефон": op.phone || "-",
      "Email": op.email || "-",
      "Дата приёма": op.hire_date ? format(new Date(op.hire_date), "dd.MM.yyyy") : "-",
      "Статус": op.is_active ? "Активен" : "Неактивен",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 4 },  // №
    { wch: 10 }, // Код
    { wch: 30 }, // ФИО
    { wch: 20 }, // Должность
    { wch: 12 }, // Тип
    { wch: 20 }, // Участок
    { wch: 20 }, // График
    { wch: 18 }, // Текущая смена
    { wch: 8 },  // Ротация
    { wch: 15 }, // Доступное время
    { wch: 18 }, // Телефон
    { wch: 25 }, // Email
    { wch: 12 }, // Дата приёма
    { wch: 10 }, // Статус
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Операторы");
  
  // Add summary sheet
  const activeCount = operators.filter(op => op.is_active).length;
  const summaryData = [
    { "Показатель": "Всего операторов", "Значение": operators.length },
    { "Показатель": "Активных", "Значение": activeCount },
    { "Показатель": "Общее доступное время", "Значение": options?.totalAvailableTime || "-" },
    { "Показатель": "Фильтр по смене", "Значение": options?.shiftFilter || "Все смены" },
    { "Показатель": "Дата экспорта", "Значение": format(new Date(), "dd.MM.yyyy HH:mm") },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Сводка");
  
  const fileName = `Операторы_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const printOperators = (operators: any[], options?: ExportOptions) => {
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
          flex-wrap: wrap;
        }
        .summary span {
          background: #f5f5f5;
          padding: 4px 10px;
          border-radius: 4px;
        }
        .summary .highlight {
          background: #dcfce7;
          color: #166534;
          font-weight: 600;
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
        .rotation-badge {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 8px;
          background: #dbeafe;
          color: #1d4ed8;
          margin-left: 4px;
        }
        .time-cell {
          font-weight: 600;
          color: #166534;
        }
        @media print {
          body { padding: 10mm; }
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Список операторов${options?.shiftFilter && options.shiftFilter !== "Все смены" ? ` (${options.shiftFilter})` : ""}</h1>
        <div class="meta">
          <div>Дата печати: ${currentDate}</div>
        </div>
      </div>
      
      <div class="summary">
        <span>Всего: <strong>${operators.length}</strong></span>
        <span>Активных: <strong>${activeCount}</strong></span>
        ${options?.totalAvailableTime ? `<span class="highlight">Общее время: <strong>${options.totalAvailableTime}</strong></span>` : ""}
        ${options?.shiftFilter && options.shiftFilter !== "Все смены" ? `<span>Фильтр: <strong>${options.shiftFilter}</strong></span>` : ""}
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
            <th>Текущая смена</th>
            <th>Время</th>
            <th>Телефон</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${operators.map((op, i) => {
            const shiftInfo = getCurrentShiftInfo(op);
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${op.code}</td>
                <td><strong>${op.full_name}</strong></td>
                <td>${op.position || "-"}</td>
                <td><span class="type-badge">${getEmployeeTypeLabel(op.employee_type)}</span></td>
                <td>${op.work_centers?.name || "-"}</td>
                <td>${op.work_schedules?.name || "-"}</td>
                <td>
                  ${shiftInfo?.shiftName || "-"}
                  ${shiftInfo?.isRotating ? '<span class="rotation-badge">ротация</span>' : ""}
                </td>
                <td class="time-cell">${shiftInfo?.availableTime || "-"}</td>
                <td>${op.phone || "-"}</td>
                <td class="${op.is_active ? "status-active" : "status-inactive"}">
                  ${op.is_active ? "Активен" : "Неактивен"}
                </td>
              </tr>
            `;
          }).join("")}
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
