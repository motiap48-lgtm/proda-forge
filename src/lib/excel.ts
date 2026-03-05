/**
 * Excel compatibility layer using ExcelJS instead of vulnerable xlsx (SheetJS).
 * Provides the same API surface as `import * as XLSX from 'xlsx'` so migration
 * is limited to changing the import line.
 * 
 * ExcelJS is loaded LAZILY (dynamic import) to avoid bloating the initial bundle.
 */

let _ExcelJS: typeof import('exceljs') | null = null;

async function getExcelJS() {
  if (!_ExcelJS) {
    _ExcelJS = await import('exceljs');
  }
  return _ExcelJS;
}

// ---- Internal types --------------------------------------------------------
interface ColInfo {
  wch?: number;
}

interface MergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface SheetProxy {
  '!cols'?: ColInfo[];
  '!merges'?: MergeRange[];
  _ws: any;
  _wb: any;
}

interface BookProxy {
  _wb: any;
}

// ---- Public API (drop-in replacement for XLSX.*) ----------------------------

const utils = {
  book_new(): BookProxy {
    // Lazy: we create a real workbook only when needed (in book_append_sheet / writeFile)
    return { _wb: null };
  },

  aoa_to_sheet(data: any[][]): SheetProxy {
    // Store raw data; actual ExcelJS objects created lazily in book_append_sheet
    return { _ws: { __raw_aoa: data }, _wb: null, '!cols': undefined };
  },

  json_to_sheet(data: Record<string, any>[]): SheetProxy {
    return { _ws: { __raw_json: data }, _wb: null, '!cols': undefined };
  },

  book_append_sheet(book: BookProxy, sheet: SheetProxy, name: string) {
    // Store sheets for lazy processing during writeFile
    if (!book._wb) {
      book._wb = { __sheets: [] };
    }
    if (!book._wb.__sheets) {
      book._wb.__sheets = [];
    }
    book._wb.__sheets.push({ sheet, name });
  },
};

async function buildWorkbook(book: BookProxy) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();

  const sheets = book._wb?.__sheets || [];
  for (const { sheet, name } of sheets) {
    const targetWs = wb.addWorksheet(name);

    // Apply column widths
    if (sheet['!cols']) {
      sheet['!cols'].forEach((col: ColInfo, idx: number) => {
        if (col && col.wch) {
          targetWs.getColumn(idx + 1).width = col.wch;
        }
      });
    }

    // Apply merges
    if (sheet['!merges']) {
      sheet['!merges'].forEach((merge: MergeRange) => {
        targetWs.mergeCells(merge.s.r + 1, merge.s.c + 1, merge.e.r + 1, merge.e.c + 1);
      });
    }

    // Populate rows from raw data
    const raw = sheet._ws;
    if (raw.__raw_aoa) {
      raw.__raw_aoa.forEach((row: any[]) => {
        targetWs.addRow(row);
      });
    } else if (raw.__raw_json) {
      const data = raw.__raw_json;
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        targetWs.addRow(keys);
        data.forEach((obj: Record<string, any>) => {
          targetWs.addRow(keys.map((k) => obj[k]));
        });
      }
    } else if (raw.eachRow) {
      // Already an ExcelJS worksheet (shouldn't happen with lazy approach, but fallback)
      raw.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
        const newRow = targetWs.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
          newRow.getCell(colNumber).value = cell.value;
        });
        newRow.commit();
      });
    }
  }

  return wb;
}

/** Write workbook to a file (triggers browser download) */
async function writeFile(book: BookProxy, filename: string) {
  const wb = await buildWorkbook(book);
  const buffer = await wb.xlsx.writeBuffer();
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

/** Synchronous-looking wrapper kept for call-site compatibility. */
function writeFileSync(book: BookProxy, filename: string) {
  void writeFile(book, filename);
}

export { utils, writeFile, writeFileSync as writeFileCompat };

const XLSX = { utils, writeFile: writeFileSync };
export default XLSX;
