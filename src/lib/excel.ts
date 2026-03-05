/**
 * Excel compatibility layer using ExcelJS instead of vulnerable xlsx (SheetJS).
 * Provides the same API surface as `import * as XLSX from 'xlsx'` so migration
 * is limited to changing the import line.
 */
import ExcelJS from 'exceljs';

// ---- Internal types --------------------------------------------------------
interface ColInfo {
  wch?: number;
}

interface MergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface SheetProxy {
  /** Column widths – set after creation, applied when the sheet is finalised */
  '!cols'?: ColInfo[];
  /** Cell merges */
  '!merges'?: MergeRange[];
  /** @internal – backing ExcelJS worksheet */
  _ws: ExcelJS.Worksheet;
  /** @internal – workbook reference needed for json_to_sheet standalone use */
  _wb: ExcelJS.Workbook;
}

interface BookProxy {
  _wb: ExcelJS.Workbook;
}

// ---- Public API (drop-in replacement for XLSX.*) ----------------------------

const utils = {
  book_new(): BookProxy {
    return { _wb: new ExcelJS.Workbook() };
  },

  /** Create a sheet from an array-of-arrays */
  aoa_to_sheet(data: any[][]): SheetProxy {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet');
    data.forEach((row) => {
      ws.addRow(row);
    });
    return { _ws: ws, _wb: wb, '!cols': undefined };
  },

  /** Create a sheet from an array of objects (keys become header row) */
  json_to_sheet(data: Record<string, any>[]): SheetProxy {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet');
    if (data.length === 0) {
      return { _ws: ws, _wb: wb, '!cols': undefined };
    }
    const keys = Object.keys(data[0]);
    ws.addRow(keys);
    data.forEach((obj) => {
      ws.addRow(keys.map((k) => obj[k]));
    });
    return { _ws: ws, _wb: wb, '!cols': undefined };
  },

  /** Append a sheet to the workbook */
  book_append_sheet(book: BookProxy, sheet: SheetProxy, name: string) {
    // Copy rows from the temporary worksheet into the real workbook
    const targetWs = book._wb.addWorksheet(name);

    // Apply column widths
    if (sheet['!cols']) {
      sheet['!cols'].forEach((col, idx) => {
        if (col && col.wch) {
          targetWs.getColumn(idx + 1).width = col.wch;
        }
      });
    }

    // Apply merges
    if (sheet['!merges']) {
      sheet['!merges'].forEach((merge) => {
        const startRow = merge.s.r + 1;
        const startCol = merge.s.c + 1;
        const endRow = merge.e.r + 1;
        const endCol = merge.e.c + 1;
        targetWs.mergeCells(startRow, startCol, endRow, endCol);
      });
    }

    // Copy all rows
    sheet._ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = targetWs.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        newRow.getCell(colNumber).value = cell.value;
      });
      newRow.commit();
    });
  },
};

/** Write workbook to a file (triggers browser download) */
async function writeFile(book: BookProxy, filename: string) {
  const buffer = await book._wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Synchronous-looking wrapper kept for call-site compatibility.
 *  Internally it fires-and-forgets the async write. */
function writeFileSync(book: BookProxy, filename: string) {
  void writeFile(book, filename);
}

export { utils, writeFile, writeFileSync as writeFileCompat };

// Default export mimics `import * as XLSX from 'xlsx'`
const XLSX = { utils, writeFile: writeFileSync };
export default XLSX;
