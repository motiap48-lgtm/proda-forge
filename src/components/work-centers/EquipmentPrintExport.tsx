import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet } from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { useWorkCenters } from "@/hooks/useWorkCenters";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: "Активно",
    maintenance: "На ТО",
    broken: "Сломано",
    inactive: "Неактивно",
  };
  return labels[status] || status;
};

const getTypeName = (type: string): string => {
  const types: Record<string, string> = {
    machine: "Станок",
    welding: "Сварочное оборудование",
    tool: "Инструмент",
    fixture: "Оснастка",
    other: "Другое",
  };
  return types[type] || type;
};

interface EquipmentWithWorkCenter {
  id: string;
  code: string;
  name: string;
  equipment_type: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  work_centers: {
    code: string;
    name: string;
    department?: string | null;
  } | null;
}

export const EquipmentPrintExport = () => {
  const { data: allEquipment, isLoading: equipmentLoading } = useEquipment();
  const { data: workCenters, isLoading: workCentersLoading } = useWorkCenters();

  const isLoading = equipmentLoading || workCentersLoading;

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { locale: ru });
    } catch {
      return "-";
    }
  };

  const groupEquipmentByDepartmentAndWorkCenter = () => {
    if (!allEquipment || !workCenters) return {};

    const grouped: Record<string, Record<string, EquipmentWithWorkCenter[]>> = {};

    allEquipment.forEach((item: EquipmentWithWorkCenter) => {
      const department = item.work_centers?.department || "Без цеха";
      const workCenterName = item.work_centers
        ? `${item.work_centers.code} - ${item.work_centers.name}`
        : "Без участка";

      if (!grouped[department]) {
        grouped[department] = {};
      }
      if (!grouped[department][workCenterName]) {
        grouped[department][workCenterName] = [];
      }
      grouped[department][workCenterName].push(item);
    });

    return grouped;
  };

  const handlePrint = () => {
    const grouped = groupEquipmentByDepartmentAndWorkCenter();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Список оборудования</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px;
              margin: 20px;
            }
            h1 { font-size: 18px; margin-bottom: 20px; }
            h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; background: #f0f0f0; padding: 5px; }
            h3 { font-size: 12px; margin-top: 15px; margin-bottom: 5px; color: #333; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .status-active { color: green; }
            .status-maintenance { color: orange; }
            .status-broken { color: red; }
            .status-inactive { color: gray; }
            .print-date { 
              text-align: right; 
              font-size: 10px; 
              color: #666;
              margin-bottom: 10px;
            }
            @media print {
              h2 { page-break-before: auto; }
            }
          </style>
        </head>
        <body>
          <h1>Список оборудования по участкам и цехам</h1>
          <div class="print-date">Дата печати: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
          ${Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b, "ru"))
            .map(
              ([department, workCentersData]) => `
              <h2>Цех: ${department}</h2>
              ${Object.entries(workCentersData)
                .sort(([a], [b]) => a.localeCompare(b, "ru"))
                .map(
                  ([workCenter, items]) => `
                  <h3>Участок: ${workCenter}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Код</th>
                        <th>Наименование</th>
                        <th>Тип</th>
                        <th>Статус</th>
                        <th>Производитель</th>
                        <th>Модель</th>
                        <th>Серийный номер</th>
                        <th>След. ТО</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items
                        .sort((a, b) => a.code.localeCompare(b.code, "ru"))
                        .map(
                          (item) => `
                          <tr>
                            <td>${item.code}</td>
                            <td>${item.name}</td>
                            <td>${getTypeName(item.equipment_type)}</td>
                            <td class="status-${item.status}">${getStatusLabel(item.status)}</td>
                            <td>${item.manufacturer || "-"}</td>
                            <td>${item.model || "-"}</td>
                            <td>${item.serial_number || "-"}</td>
                            <td>${formatDate(item.next_maintenance_date)}</td>
                          </tr>
                        `
                        )
                        .join("")}
                    </tbody>
                  </table>
                `
                )
                .join("")}
            `
            )
            .join("")}
          <div style="margin-top: 20px; font-size: 11px; color: #666;">
            Всего единиц оборудования: ${allEquipment?.length || 0}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleExportExcel = () => {
    if (!allEquipment) return;

    const data = allEquipment
      .sort((a: EquipmentWithWorkCenter, b: EquipmentWithWorkCenter) => {
        const deptA = a.work_centers?.department || "Без цеха";
        const deptB = b.work_centers?.department || "Без цеха";
        if (deptA !== deptB) return deptA.localeCompare(deptB, "ru");
        const wcA = a.work_centers?.code || "";
        const wcB = b.work_centers?.code || "";
        if (wcA !== wcB) return wcA.localeCompare(wcB, "ru");
        return a.code.localeCompare(b.code, "ru");
      })
      .map((item: EquipmentWithWorkCenter) => ({
        "Цех": item.work_centers?.department || "Без цеха",
        "Код участка": item.work_centers?.code || "-",
        "Участок": item.work_centers?.name || "Без участка",
        "Код оборудования": item.code,
        "Наименование": item.name,
        "Тип": getTypeName(item.equipment_type),
        "Статус": getStatusLabel(item.status),
        "Производитель": item.manufacturer || "",
        "Модель": item.model || "",
        "Серийный номер": item.serial_number || "",
        "Дата покупки": formatDate(item.purchase_date),
        "Последнее ТО": formatDate(item.last_maintenance_date),
        "Следующее ТО": formatDate(item.next_maintenance_date),
        "Примечания": item.notes || "",
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Оборудование");

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Цех
      { wch: 12 }, // Код участка
      { wch: 25 }, // Участок
      { wch: 12 }, // Код оборудования
      { wch: 30 }, // Наименование
      { wch: 12 }, // Тип
      { wch: 12 }, // Статус
      { wch: 20 }, // Производитель
      { wch: 20 }, // Модель
      { wch: 20 }, // Серийный номер
      { wch: 12 }, // Дата покупки
      { wch: 12 }, // Последнее ТО
      { wch: 12 }, // Следующее ТО
      { wch: 30 }, // Примечания
    ];

    XLSX.writeFile(
      wb,
      `Оборудование_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={handlePrint}
        disabled={isLoading || !allEquipment?.length}
      >
        <Printer className="mr-2 h-4 w-4" />
        Печать
      </Button>
      <Button
        variant="outline"
        onClick={handleExportExcel}
        disabled={isLoading || !allEquipment?.length}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
    </div>
  );
};
