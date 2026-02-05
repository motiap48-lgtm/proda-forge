 import * as XLSX from "xlsx";
 import { format, getDay, isToday } from "date-fns";
 import { ru } from "date-fns/locale";
 import { getShiftForDate, getCycleDayNumber } from "../utils";
 
 export interface ExportData {
   days: Date[];
   operators: any[];
   groupedBySchedule: Map<string, any[]>;
   timesheets: any[];
   overtimeEntries: any[];
   compensations: any[];
   absences: any[];
  shiftColorMap: Map<string, any>;
   grandTotal: { hours: number; minutes: number };
   grandTotalFact: { hours: number; minutes: number };
   calculateTotalHours: (operator: any) => { hours: number; minutes: number };
  calculatePlanHours: (operator: any) => { hours: number; minutes: number };
   calculateGroupStats: (ops: any[]) => { 
     workingDays: number; 
     offDays: number; 
     totalHours: number; 
     totalMinutes: number; 
   };
 }
 
 // Helper function to get fact minutes for a specific operator and date
 const getFactMinutesForDay = (
   operatorId: string, 
   dateStr: string,
   timesheets: any[],
   overtimeEntries: any[],
   compensations: any[]
 ): number => {
   let factMinutes = 0;
   
   // Timesheet
   const dayTimesheet = timesheets.find(
     ts => ts.operator_id === operatorId && ts.work_date === dateStr
   );
   if (dayTimesheet) {
     factMinutes = dayTimesheet.actual_minutes || 0;
   }
   
   // Approved overtime
   const dayOvertime = overtimeEntries.filter(
     oe => oe.operator_id === operatorId && 
           oe.work_date === dateStr && 
           oe.status === 'approved'
   );
   dayOvertime.forEach(oe => {
     factMinutes += oe.duration_minutes || 0;
   });
   
   // Confirmed compensation
   compensations.forEach(comp => {
     if (comp.status === 'cancelled') return;
     comp.compensation_records?.forEach((record: any) => {
       if (record.operator_id === operatorId && 
           record.compensation_date === dateStr && 
           record.status === 'confirmed') {
         factMinutes += (record.hours_worked || 0) * 60;
       }
     });
   });
   
   return factMinutes;
 };
 
 // Get operator fact total for period
 const getOperatorFactTotal = (
   operatorId: string, 
   days: Date[],
   timesheets: any[],
   overtimeEntries: any[],
   compensations: any[]
 ) => {
   let totalFactMinutes = 0;
   days.forEach(day => {
     const dateStr = format(day, "yyyy-MM-dd");
     totalFactMinutes += getFactMinutesForDay(operatorId, dateStr, timesheets, overtimeEntries, compensations);
   });
   const hours = Math.floor(totalFactMinutes / 60);
   const mins = totalFactMinutes % 60;
   return { hours, minutes: mins };
 };
 
 // Get group fact total
 const getGroupFactTotal = (
   ops: any[], 
   days: Date[],
   timesheets: any[],
   overtimeEntries: any[],
   compensations: any[]
 ) => {
   let totalFactMinutes = 0;
   ops.forEach(operator => {
     days.forEach(day => {
       const dateStr = format(day, "yyyy-MM-dd");
       totalFactMinutes += getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
     });
   });
   const hours = Math.floor(totalFactMinutes / 60);
   const mins = totalFactMinutes % 60;
   return { hours, minutes: mins };
 };
 
 // Format minutes as hours string
 const formatMinutes = (minutes: number): string => {
   if (minutes === 0) return '—';
   const h = Math.floor(minutes / 60);
   const m = minutes % 60;
   return `${h}ч${m > 0 ? ` ${m}м` : ''}`;
 };
 
 export const exportToExcel = (data: ExportData) => {
   const { 
     days, operators, groupedBySchedule, timesheets, overtimeEntries, 
    compensations, absences, calculatePlanHours 
   } = data;
   
   const wb = XLSX.utils.book_new();
   const exportData: any[] = [];
   
   // Header rows with Plan/Fact for each day
   const headerRow1 = ['Сотрудник', 'График'];
   const headerRow2 = ['', ''];
   days.forEach(day => {
     headerRow1.push(format(day, 'dd.MM.yyyy'));
     headerRow1.push('');
     headerRow2.push('План');
     headerRow2.push('Факт');
   });
   headerRow1.push('Итого');
   headerRow1.push('');
   headerRow2.push('План');
   headerRow2.push('Факт');
   
   exportData.push(headerRow1);
   exportData.push(headerRow2);
   
   let grandTotalMinutes = 0;
   let grandTotalFactMinutes = 0;
 
   Array.from(groupedBySchedule.entries()).forEach(([scheduleName, ops]) => {
     exportData.push([`--- ${scheduleName} (${ops.length}) ---`]);
     
     let groupTotalMinutes = 0;
     let groupTotalFactMinutes = 0;
 
     ops.forEach(operator => {
       let operatorTotalMinutes = 0;
       let operatorTotalFactMinutes = 0;
       const dayValues: string[] = [];
       
       days.forEach(day => {
         const dateStr = format(day, "yyyy-MM-dd");
         const shift = getShiftForDate(operator, day);
         
         // Get planned minutes
         let planMinutes = 0;
         if (shift) {
           planMinutes = shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes);
           // Check for non-compensable absence
           const absence = absences.find((a: any) => 
             a.operator_id === operator.id && 
             new Date(a.start_date) <= day && 
             new Date(a.end_date) >= day
           );
           if (absence) {
              // Only these absence types reduce plan (vacations, unpaid leave)
              // Sick leave, business trips, compensable absences do NOT reduce plan
              const nonCompensableTypes = ['annual_leave', 'unpaid_leave', 'maternity_leave', 'administrative_leave_without_compensation'];
             if (nonCompensableTypes.includes(absence.absence_type)) {
               planMinutes = 0;
             }
           }
         }
         operatorTotalMinutes += planMinutes;
         
         // Get actual minutes
         const factMinutes = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
         operatorTotalFactMinutes += factMinutes;
         
         dayValues.push(formatMinutes(planMinutes));
         dayValues.push(formatMinutes(factMinutes));
       });
 
       groupTotalMinutes += operatorTotalMinutes;
       groupTotalFactMinutes += operatorTotalFactMinutes;
 
        // Use calculatePlanHours for accurate totals that match UI
        const opPlan = calculatePlanHours(operator);
        const opPlanFormatted = formatMinutes(opPlan.hours * 60 + opPlan.minutes);

       const row = [
         operator.full_name,
         operator.work_schedules?.name || 'Без графика',
         ...dayValues,
          opPlanFormatted,
         formatMinutes(operatorTotalFactMinutes)
       ];
       exportData.push(row);
     });
 
     grandTotalMinutes += groupTotalMinutes;
     grandTotalFactMinutes += groupTotalFactMinutes;
     
     // Group total row
     const emptyDayCells = days.flatMap(() => ['', '']);
     exportData.push([
       `Итого по группе "${scheduleName}":`,
       '',
       ...emptyDayCells,
       formatMinutes(groupTotalMinutes),
       formatMinutes(groupTotalFactMinutes)
     ]);
     exportData.push([]);
   });
 
   // Grand total row
   const emptyDayCells = days.flatMap(() => ['', '']);
   exportData.push([]);
   exportData.push([
     'ОБЩИЙ ИТОГ:',
     '',
     ...emptyDayCells,
     formatMinutes(grandTotalMinutes),
     formatMinutes(grandTotalFactMinutes)
   ]);
   
   const ws = XLSX.utils.aoa_to_sheet(exportData);
   
   // Merge header cells for dates
   const merges: XLSX.Range[] = [];
   for (let i = 0; i < days.length; i++) {
     merges.push({ s: { r: 0, c: 2 + i * 2 }, e: { r: 0, c: 3 + i * 2 } });
   }
   merges.push({ s: { r: 0, c: 2 + days.length * 2 }, e: { r: 0, c: 3 + days.length * 2 } });
   ws['!merges'] = merges;
   
   ws['!cols'] = [
     { wch: 30 },
     { wch: 25 },
     ...days.flatMap(() => [{ wch: 8 }, { wch: 8 }]),
     { wch: 10 },
     { wch: 10 }
   ];
   
   XLSX.utils.book_append_sheet(wb, ws, 'График ротации');
   
   const startDateStr = format(days[0], 'dd.MM.yyyy');
   const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
   XLSX.writeFile(wb, `График_ротации_${startDateStr}-${endDateStr}.xlsx`);
 };
 
 export const printCalendar = (data: ExportData) => {
   const { 
     days, operators, groupedBySchedule, timesheets, overtimeEntries, 
     compensations, shiftColorMap, grandTotal, grandTotalFact,
    calculateTotalHours, calculatePlanHours, calculateGroupStats 
   } = data;
   
   const startDateStr = format(days[0], 'dd.MM.yyyy');
   const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
   
   const printWindow = window.open('', '_blank');
   if (!printWindow) return;
 
   const groupsHtml = Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
     const groupStats = calculateGroupStats(ops);
     const groupFact = getGroupFactTotal(ops, days, timesheets, overtimeEntries, compensations);
     
     const operatorsHtml = ops.map(operator => {
       const shiftNameToIndex = new Map<string, number>();
       Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
        const opTotal = calculatePlanHours(operator);
       const opFact = getOperatorFactTotal(operator.id, days, timesheets, overtimeEntries, compensations);
       
       const daysHtml = days.map(day => {
         const shift = getShiftForDate(operator, day);
         const isWeekend = getDay(day) === 0 || getDay(day) === 6;
         const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
         const netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
         const hours = Math.floor(netMinutes / 60);
         const mins = netMinutes % 60;
         const cycleInfo = getCycleDayNumber(operator.work_schedules, day, operator);
         const dateStr = format(day, "yyyy-MM-dd");
         const factMins = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
         const factH = Math.floor(factMins / 60);
         const factM = factMins % 60;
         
         return `
           <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'}">
             <span class="plan">${shift ? `${hours}ч${mins > 0 ? mins + 'м' : ''}` : '—'}</span>
             <span class="${factMins > 0 ? 'fact' : 'fact-zero'}"> / ${factMins > 0 ? factH + 'ч' + (factM > 0 ? factM + 'м' : '') : '—'}</span>
             ${cycleInfo ? '<br/><span class="cycle-day">Д' + cycleInfo.dayInCycle + '</span>' : ''}
           </td>
         `;
       }).join('');
       
       return `
         <tr>
           <td>${operator.full_name}</td>
           ${daysHtml}
           <td class="total-cell">
             <span class="total-plan">${opTotal.hours}ч${opTotal.minutes > 0 ? opTotal.minutes + 'м' : ''}</span>
             <br/>
             <span class="total-fact">${opFact.hours}ч${opFact.minutes > 0 ? opFact.minutes + 'м' : ''}</span>
           </td>
         </tr>
       `;
     }).join('');
     
     return `
       <tr class="group-header">
         <td colspan="${days.length + 2}">${scheduleName} (${ops.length} чел.)</td>
       </tr>
       ${operatorsHtml}
       <tr class="group-stats">
         <td style="text-align: left; font-weight: 500;">
           Итого: ✓${groupStats.workingDays} раб. | ✗${groupStats.offDays} вых.
         </td>
         <td colspan="${days.length}"></td>
         <td class="total-cell">
           <span class="total-plan">${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? groupStats.totalMinutes + 'м' : ''}</span>
           <br/>
           <span class="total-fact">${groupFact.hours}ч${groupFact.minutes > 0 ? groupFact.minutes + 'м' : ''}</span>
         </td>
       </tr>
     `;
   }).join('');
 
   const daysHeaderHtml = days.map(day => `
     <th class="${isToday(day) ? 'today' : ''} ${getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : ''}">
       ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd MMM', { locale: ru })}
     </th>
   `).join('');
 
   printWindow.document.write(`
     <!DOCTYPE html>
     <html>
     <head>
       <title>График ротации смен ${startDateStr} - ${endDateStr}</title>
       <style>
         body { font-family: Arial, sans-serif; padding: 20px; }
         h1 { font-size: 18px; margin-bottom: 10px; }
         h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
         table { width: 100%; border-collapse: collapse; font-size: 10px; }
         th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
         th { background: #f5f5f5; font-weight: 600; }
         td:first-child { text-align: left; font-weight: 500; }
         .group-header { background: #eee; font-weight: 600; text-align: left; }
         .day-off { color: #999; }
         .shift-1 { background: #dbeafe; }
         .shift-2 { background: #fef3c7; }
         .shift-3 { background: #d1fae5; }
         .shift-4 { background: #ede9fe; }
         .today { background: #fef08a !important; font-weight: bold; }
         .weekend { background: #fee2e2; }
         .cycle-day { font-size: 8px; color: #888; }
         .group-stats { background: #f8fafc; font-style: italic; }
         .plan { color: #1d4ed8; }
         .fact { color: #16a34a; }
         .fact-zero { color: #9ca3af; }
         .total-cell { font-weight: 600; }
         .total-plan { color: #1d4ed8; }
         .total-fact { color: #16a34a; }
         @media print { @page { size: landscape; margin: 10mm; } }
       </style>
     </head>
     <body>
       <h1>📅 График ротации смен</h1>
       <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${operators.length} | План: ${grandTotal.hours}ч${grandTotal.minutes > 0 ? ' ' + grandTotal.minutes + 'м' : ''} | Факт: ${grandTotalFact.hours}ч${grandTotalFact.minutes > 0 ? ' ' + grandTotalFact.minutes + 'м' : ''}</h2>
       
       <table>
         <thead>
           <tr>
             <th>Сотрудник</th>
             ${daysHeaderHtml}
             <th>Итого<br/><span class="plan">План</span> / <span class="fact">Факт</span></th>
           </tr>
         </thead>
         <tbody>
           ${groupsHtml}
         </tbody>
       </table>
       
       <script>window.onload = function() { window.print(); }</script>
     </body>
     </html>
   `);
   printWindow.document.close();
 };
 
 export const exportToPdf = (data: ExportData) => {
   const { 
     days, operators, groupedBySchedule, timesheets, overtimeEntries, 
     compensations, shiftColorMap, grandTotal, grandTotalFact,
    calculateTotalHours, calculatePlanHours, calculateGroupStats 
   } = data;
   
   const startDateStr = format(days[0], 'dd.MM.yyyy');
   const endDateStr = format(days[days.length - 1], 'dd.MM.yyyy');
   
   const pdfWindow = window.open('', '_blank');
   if (!pdfWindow) return;
 
   const groupsHtml = Array.from(groupedBySchedule.entries()).map(([scheduleName, ops]) => {
     const groupStats = calculateGroupStats(ops);
     const groupFact = getGroupFactTotal(ops, days, timesheets, overtimeEntries, compensations);
     const schedule = ops[0]?.work_schedules;
     const isCyclic = schedule?.schedule_type === 'cyclic';
     
     const daysHeaderHtml = days.map(day => `
       <th class="${isToday(day) ? 'today' : ''} ${getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : ''}">
         ${format(day, 'EEE', { locale: ru })}<br/>${format(day, 'd')}
       </th>
     `).join('');
     
     const operatorsHtml = ops.map(operator => {
       const shiftNameToIndex = new Map<string, number>();
       Array.from(shiftColorMap.keys()).forEach((name, idx) => shiftNameToIndex.set(name, idx));
        const opTotal = calculatePlanHours(operator);
       const opFact = getOperatorFactTotal(operator.id, days, timesheets, overtimeEntries, compensations);
       
       const daysHtml = days.map(day => {
         const shift = getShiftForDate(operator, day);
         const isWeekend = getDay(day) === 0 || getDay(day) === 6;
         const shiftIdx = shift ? (shiftNameToIndex.get(shift.shift_name) || 0) + 1 : 0;
         const netMinutes = shift ? (shift.net_work_minutes ?? (shift.gross_work_minutes - shift.break_minutes)) : 0;
         const hours = Math.floor(netMinutes / 60);
         const mins = netMinutes % 60;
         const dateStr = format(day, "yyyy-MM-dd");
         const factMins = getFactMinutesForDay(operator.id, dateStr, timesheets, overtimeEntries, compensations);
         const factH = Math.floor(factMins / 60);
         const factM = factMins % 60;
         
         return `
           <td class="${isToday(day) ? 'today' : ''} ${shift ? 'shift-' + shiftIdx : isWeekend ? 'weekend' : 'day-off'}">
             <div class="cell-content">
               <span class="plan">${shift ? hours + 'ч' + (mins > 0 ? mins + 'м' : '') : '—'}</span>
               <br/>
               <span class="${factMins > 0 ? 'fact' : 'fact-zero'}">${factMins > 0 ? factH + 'ч' + (factM > 0 ? factM + 'м' : '') : '—'}</span>
             </div>
           </td>
         `;
       }).join('');
       
       return `
         <tr>
           <td>${operator.full_name}${operator.shift_rotation_enabled ? ' 🔄' : ''}</td>
           ${daysHtml}
           <td class="total-col">
             <span class="plan">${opTotal.hours}ч${opTotal.minutes > 0 ? opTotal.minutes + 'м' : ''}</span>
             <br/>
             <span class="fact">${opFact.hours}ч${opFact.minutes > 0 ? opFact.minutes + 'м' : ''}</span>
           </td>
         </tr>
       `;
     }).join('');
     
     return `
       <table>
         <thead>
           <tr>
             <th colspan="${days.length + 2}" class="group-header">
               ${scheduleName} (${ops.length} чел.)
               ${isCyclic ? ' — Циклический ' + (schedule?.cycle_days_on || 2) + '/' + (schedule?.cycle_days_off || 2) : ''}
             </th>
           </tr>
           <tr>
             <th style="text-align: left;">Сотрудник</th>
             ${daysHeaderHtml}
             <th>План<br/>Факт</th>
           </tr>
         </thead>
         <tbody>
           ${operatorsHtml}
           <tr style="background: #f9fafb; font-weight: 500;">
             <td style="text-align: left;"><strong>Итого:</strong></td>
             <td colspan="${days.length}">✅ Рабочих: ${groupStats.workingDays} | ⛔ Выходных: ${groupStats.offDays}</td>
             <td class="total-col">
               <span class="plan">${groupStats.totalHours}ч${groupStats.totalMinutes > 0 ? groupStats.totalMinutes + 'м' : ''}</span>
               <br/>
               <span class="fact">${groupFact.hours}ч${groupFact.minutes > 0 ? groupFact.minutes + 'м' : ''}</span>
             </td>
           </tr>
         </tbody>
       </table>
     `;
   }).join('');
 
   pdfWindow.document.write(`
     <!DOCTYPE html>
     <html>
     <head>
       <title>График ротации смен ${startDateStr} - ${endDateStr}</title>
       <style>
         @page { size: landscape; margin: 10mm; }
         body { font-family: Arial, sans-serif; padding: 15px; font-size: 10px; }
         h1 { font-size: 16px; margin-bottom: 8px; color: #1f2937; }
         h2 { font-size: 12px; color: #666; margin-bottom: 15px; }
         table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
         th, td { border: 1px solid #e5e7eb; padding: 4px 3px; text-align: center; }
         th { background: #f3f4f6; font-weight: 600; font-size: 9px; }
         td:first-child { text-align: left; font-weight: 500; min-width: 100px; }
         .group-header { background: #1f2937; color: white; font-weight: 600; text-align: left; font-size: 11px; }
         .shift-1 { background: #fef3c7; color: #92400e; }
         .shift-2 { background: #d1fae5; color: #065f46; }
         .shift-3 { background: #ddd6fe; color: #5b21b6; }
         .shift-4 { background: #dbeafe; color: #1e40af; }
         .day-off { background: #fef2f2; color: #991b1b; }
         .weekend { background: #fee2e2; }
         .today { background: #fef08a !important; font-weight: bold; }
         .total-col { background: #d1fae5; color: #065f46; font-weight: 600; }
         .summary { margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 4px; }
         .plan { color: #1d4ed8; }
         .fact { color: #16a34a; }
         .fact-zero { color: #9ca3af; }
         .cell-content { font-size: 8px; }
         @media print { body { padding: 0; } }
       </style>
     </head>
     <body>
       <h1>📅 График ротации смен</h1>
       <h2>Период: ${startDateStr} — ${endDateStr} | Операторов: ${operators.length}</h2>
       
       ${groupsHtml}
       
       <div class="summary">
         <strong>ОБЩИЙ ИТОГ:</strong> ${operators.length} операторов | 
         <span class="plan">План: ${grandTotal.hours}ч${grandTotal.minutes > 0 ? ' ' + grandTotal.minutes + 'м' : ''}</span> | 
         <span class="fact">Факт: ${grandTotalFact.hours}ч${grandTotalFact.minutes > 0 ? ' ' + grandTotalFact.minutes + 'м' : ''}</span>
       </div>
       
       <script>window.onload = function() { window.print(); }</script>
     </body>
     </html>
   `);
   pdfWindow.document.close();
 };