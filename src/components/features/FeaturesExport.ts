import * as XLSX from "xlsx";

interface Feature {
  id: string;
  name: string;
  description: string;
  status: string;
  category: string;
}

interface ChangelogEntry {
  version: string;
  title: string;
  date: string;
  changes: string[];
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "done": return "Готово";
    case "in_progress": return "В разработке";
    case "planned": return "Запланировано";
    case "partial": return "Частично";
    default: return status;
  }
};

export const exportToExcel = (features: Feature[], changelog: ChangelogEntry[]) => {
  const workbook = XLSX.utils.book_new();

  // Features sheet
  const featuresData = features.map(f => ({
    "Название": f.name,
    "Описание": f.description,
    "Категория": f.category,
    "Статус": getStatusLabel(f.status),
  }));
  
  const featuresSheet = XLSX.utils.json_to_sheet(featuresData);
  XLSX.utils.book_append_sheet(workbook, featuresSheet, "Функции");

  // Changelog sheet
  const changelogData = changelog.flatMap(entry => 
    entry.changes.map((change, idx) => ({
      "Версия": idx === 0 ? entry.version : "",
      "Название": idx === 0 ? entry.title : "",
      "Дата": idx === 0 ? entry.date : "",
      "Изменение": change,
    }))
  );
  
  const changelogSheet = XLSX.utils.json_to_sheet(changelogData);
  XLSX.utils.book_append_sheet(workbook, changelogSheet, "История изменений");

  // Download
  XLSX.writeFile(workbook, `features_report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (features: Feature[], changelog: ChangelogEntry[]) => {
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Отчёт о функциях системы</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .status-done { color: #16a34a; }
        .status-in_progress { color: #2563eb; }
        .status-planned { color: #6b7280; }
        .status-partial { color: #d97706; }
        .changelog-entry { margin-bottom: 20px; }
        .changelog-version { font-weight: bold; color: #333; }
        .changelog-date { color: #666; font-size: 0.9em; }
        ul { margin: 5px 0; padding-left: 20px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <h1>Отчёт о функциях системы</h1>
      <p>Дата формирования: ${new Date().toLocaleDateString('ru-RU')}</p>
      
      <h2>Список функций</h2>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Категория</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${features.map(f => `
            <tr>
              <td>${f.name}</td>
              <td>${f.description}</td>
              <td>${f.category}</td>
              <td class="status-${f.status}">${getStatusLabel(f.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>История изменений</h2>
      ${changelog.map(entry => `
        <div class="changelog-entry">
          <div class="changelog-version">${entry.version} - ${entry.title}</div>
          <div class="changelog-date">${entry.date}</div>
          <ul>
            ${entry.changes.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
