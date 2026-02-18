import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, addDays, addMonths, subMonths, differenceInDays, startOfWeek, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  RefreshCw, FileDown, Printer, Filter, Clock, ChevronsUpDown, ChevronsDownUp, 
  CalendarDays, ChevronLeft, ChevronRight, FileText, User, Maximize2, Minimize2, X, Users,
  ChevronDown, Settings2, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PeriodType, ShiftColors } from "../utils";
import { CalendarLegend } from "./CalendarLegend";

export type AbsenceStatusFilter = "all" | "on_leave" | "sick" | "available";
export type AbsenceTypeFilter = "all" | "annual_leave" | "sick_leave" | "administrative_leave_with_compensation" | "administrative_leave_without_compensation" | "maternity_leave" | "unpaid_leave" | "business_trip" | "unauthorized_absence" | "other";
export type TimesheetStatusFilter = "all" | "pending" | "on_review" | "confirmed" | "approved" | "unfilled";

interface CalendarToolbarProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  endDate?: Date;
  onEndDateChange: (date?: Date) => void;
  scheduleFilter: string;
  onScheduleFilterChange: (filter: string) => void;
  uniqueSchedules: string[];
  showOnlyCyclic: boolean;
  onShowOnlyCyclicChange: (show: boolean) => void;
  rotationFilter: "all" | "enabled" | "disabled";
  onRotationFilterChange: (filter: "all" | "enabled" | "disabled") => void;
  absenceStatusFilter?: AbsenceStatusFilter;
  onAbsenceStatusFilterChange?: (filter: AbsenceStatusFilter) => void;
  absenceTypeFilter?: AbsenceTypeFilter;
  onAbsenceTypeFilterChange?: (filter: AbsenceTypeFilter) => void;
  timesheetStatusFilter?: TimesheetStatusFilter;
  onTimesheetStatusFilterChange?: (filter: TimesheetStatusFilter) => void;
  filteredOperatorsCount: number;
  grandTotal: { hours: number; minutes: number };
  grandTotalFact?: { hours: number; minutes: number };
  comparisonPeriod: PeriodType | null;
  onComparisonPeriodChange: (period: PeriodType | null) => void;
  comparisonTotal: { hours: number; minutes: number } | null;
  shiftColorMap: Map<string, ShiftColors>;
  shiftDetails?: Map<string, { startTime: string; endTime: string; breakMinutes: number; grossWorkMinutes: number; netWorkMinutes: number }>;
  isAllExpanded: boolean;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onBulkAbsence?: () => void;
  onBulkDeleteAbsence?: () => void;
  onExportAbsences?: () => void;
  isStartDatePickerOpen: boolean;
  onStartDatePickerOpenChange: (open: boolean) => void;
  isEndDatePickerOpen: boolean;
  onEndDatePickerOpenChange: (open: boolean) => void;
  daysCount: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
  defaultReductionHours?: number;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  period,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  scheduleFilter,
  onScheduleFilterChange,
  uniqueSchedules,
  showOnlyCyclic,
  onShowOnlyCyclicChange,
  rotationFilter,
  onRotationFilterChange,
  absenceStatusFilter,
  onAbsenceStatusFilterChange,
  absenceTypeFilter,
  onAbsenceTypeFilterChange,
  timesheetStatusFilter,
  onTimesheetStatusFilterChange,
  filteredOperatorsCount,
  grandTotal,
  grandTotalFact,
  comparisonPeriod,
  onComparisonPeriodChange,
  comparisonTotal,
  shiftColorMap,
  shiftDetails,
  isAllExpanded,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  onExportExcel,
  onExportPdf,
  onPrint,
  onBulkAbsence,
  onBulkDeleteAbsence,
  onExportAbsences,
  isStartDatePickerOpen,
  onStartDatePickerOpenChange,
  isEndDatePickerOpen,
  onEndDatePickerOpenChange,
  daysCount,
  isFullscreen,
  onToggleFullscreen,
  onResetFilters,
  hasActiveFilters,
  activeFiltersCount,
  defaultReductionHours,
}) => {
  const isMobile = useIsMobile();
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  const goToToday = () => {
    onStartDateChange(new Date());
    if (period === "custom") onEndDateChange(addDays(new Date(), 6));
  };

  const goToStartOfMonth = () => {
    onStartDateChange(startOfMonth(new Date()));
    if (period === "custom") onEndDateChange(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  };

  const goToStartOfWeek = () => {
    onStartDateChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
    if (period === "custom") onEndDateChange(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
  };

  const goToStartOfYear = () => {
    onStartDateChange(new Date(new Date().getFullYear(), 0, 1));
  };

  const goToPreviousPeriod = () => {
    if (period === "month") {
      onStartDateChange(subMonths(startDate, 1));
    } else if (period === "year") {
      onStartDateChange(new Date(startDate.getFullYear() - 1, 0, 1));
    } else if (period === "custom" && endDate) {
      const range = differenceInDays(endDate, startDate);
      onStartDateChange(addDays(startDate, -(range + 1)));
      onEndDateChange(addDays(endDate, -(range + 1)));
    } else {
      onStartDateChange(addDays(startDate, -daysCount));
    }
  };

  const goToNextPeriod = () => {
    if (period === "month") {
      onStartDateChange(addMonths(startDate, 1));
    } else if (period === "year") {
      onStartDateChange(new Date(startDate.getFullYear() + 1, 0, 1));
    } else if (period === "custom" && endDate) {
      const range = differenceInDays(endDate, startDate);
      onStartDateChange(addDays(startDate, range + 1));
      onEndDateChange(addDays(endDate, range + 1));
    } else {
      onStartDateChange(addDays(startDate, daysCount));
    }
  };

  // Mobile compact view
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {/* Compact header row for mobile */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ротация</span>
          </div>
          
          {/* Stats indicator */}
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md border text-xs">
            <User className="h-3 w-3" />
            <span>{filteredOperatorsCount}</span>
            <div className="w-px h-3 bg-border" />
            <Clock className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-600">{grandTotal.hours}ч{grandTotal.minutes > 0 ? grandTotal.minutes + 'м' : ''}</span>
            {grandTotalFact && (grandTotalFact.hours > 0 || grandTotalFact.minutes > 0) && (
              <>
                <div className="w-px h-3 bg-border" />
                <span className="text-blue-600 font-medium">ф: {grandTotalFact.hours}ч{grandTotalFact.minutes > 0 ? grandTotalFact.minutes + 'м' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* Period selection - compact for mobile */}
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={period} onValueChange={(val) => val && onPeriodChange(val as PeriodType)} className="border rounded-md flex-1">
            <ToggleGroupItem value="7" size="sm" className="text-xs px-2 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              7д
            </ToggleGroupItem>
            <ToggleGroupItem value="14" size="sm" className="text-xs px-2 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              14д
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm" className="text-xs px-2 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Мес
            </ToggleGroupItem>
          </ToggleGroup>
          
          {/* Navigation buttons */}
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="sm" onClick={goToPreviousPeriod} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextPeriod} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Collapsible advanced controls */}
        <Collapsible open={isToolbarExpanded} onOpenChange={setIsToolbarExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Настройки и фильтры
                {hasActiveFilters && activeFiltersCount && activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="h-4 text-[10px] px-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isToolbarExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {/* Export buttons */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={onExportExcel} className="flex-1 text-xs">
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={onExportPdf} className="flex-1 text-xs">
                <FileText className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onPrint} className="flex-1 text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" />
                Печать
              </Button>
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToToday} className="flex-1 text-xs">
                Сегодня
              </Button>
              <Button variant="outline" size="sm" onClick={goToStartOfWeek} className="flex-1 text-xs">
                Неделя
              </Button>
              <Button variant="outline" size="sm" onClick={goToStartOfMonth} className="flex-1 text-xs">
                Месяц
              </Button>
            </div>

            {/* Schedule filter */}
            <Select value={scheduleFilter} onValueChange={onScheduleFilterChange}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Все графики" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все графики</SelectItem>
                {uniqueSchedules.filter(name => name && name.trim() !== '').map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Absence status filter */}
            {onAbsenceStatusFilterChange && (
              <Select 
                value={absenceStatusFilter || "all"} 
                onValueChange={(v) => onAbsenceStatusFilterChange(v as AbsenceStatusFilter)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Статус сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сотрудники</SelectItem>
                  <SelectItem value="on_leave">🏖️ В отпуске</SelectItem>
                  <SelectItem value="sick">🏥 На больничном</SelectItem>
                  <SelectItem value="available">✅ На работе</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Reset filters */}
            {hasActiveFilters && onResetFilters && (
              <Button variant="destructive" size="sm" onClick={onResetFilters} className="w-full text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Сбросить фильтры
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Desktop view (original)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          График ротации смен
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Печать
          </Button>
          {onExportAbsences && (
            <Button variant="outline" size="sm" onClick={onExportAbsences} className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300">
              <FileDown className="h-4 w-4 mr-2" />
              Отсутствия
            </Button>
          )}
        </div>
      </div>
      
      {/* Date navigation row */}
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleGroup type="single" value={period} onValueChange={(val) => val && onPeriodChange(val as PeriodType)} className="border rounded-md">
          <ToggleGroupItem value="1" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            1д
          </ToggleGroupItem>
          <ToggleGroupItem value="7" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            7д
          </ToggleGroupItem>
          <ToggleGroupItem value="14" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            14д
          </ToggleGroupItem>
          <ToggleGroupItem value="30" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            30д
          </ToggleGroupItem>
          <ToggleGroupItem value="month" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Мес
          </ToggleGroupItem>
          <ToggleGroupItem value="year" size="sm" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Год
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Operators & Time indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border">
          <div className="flex items-center gap-1.5 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{filteredOperatorsCount}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              {grandTotal.hours}ч{grandTotal.minutes > 0 ? ` ${grandTotal.minutes}м` : ''}
            </span>
          </div>
          {grandTotalFact && (grandTotalFact.hours > 0 || grandTotalFact.minutes > 0) && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                <span className="text-xs text-muted-foreground">ф:</span>
                <span className="font-medium">
                  {grandTotalFact.hours}ч{grandTotalFact.minutes > 0 ? ` ${grandTotalFact.minutes}м` : ''}
                </span>
              </div>
            </>
          )}
          {comparisonTotal && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="font-medium">
                  {comparisonTotal.hours}ч{comparisonTotal.minutes > 0 ? ` ${comparisonTotal.minutes}м` : ''}
                </span>
                {(() => {
                  const diff = (grandTotal.hours * 60 + grandTotal.minutes) - (comparisonTotal.hours * 60 + comparisonTotal.minutes);
                  const diffHours = Math.floor(Math.abs(diff) / 60);
                  const diffMins = Math.abs(diff) % 60;
                  if (diff === 0) return null;
                  return (
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      diff > 0 ? "text-emerald-600 border-emerald-300" : "text-rose-600 border-rose-300"
                    )}>
                      {diff > 0 ? '+' : '-'}{diffHours > 0 ? `${diffHours}ч` : ''}{diffMins > 0 ? `${diffMins}м` : ''}
                    </Badge>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Comparison period selector */}
        <Select 
          value={comparisonPeriod || ""} 
          onValueChange={(val) => onComparisonPeriodChange(val ? val as PeriodType : null)}
        >
          <SelectTrigger className={cn(
            "w-[130px]", 
            comparisonPeriod && "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          )}>
            <span className="text-xs">{comparisonPeriod ? `Сравн: ${comparisonPeriod === 'month' ? 'Мес' : comparisonPeriod === 'year' ? 'Год' : comparisonPeriod + 'д'}` : 'Сравнить...'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 дней</SelectItem>
            <SelectItem value="14">14 дней</SelectItem>
            <SelectItem value="30">30 дней</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
          </SelectContent>
        </Select>
        {comparisonPeriod && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onComparisonPeriodChange(null)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Отменить сравнение"
          >
            ×
          </Button>
        )}
        
        {/* Custom period selector */}
        <Select value={period === "custom" ? "custom" : ""} onValueChange={(val) => val === "custom" && onPeriodChange("custom")}>
          <SelectTrigger className={cn("w-[120px]", period === "custom" && "border-primary bg-primary/10")}>
            <CalendarDays className="h-4 w-4 mr-2" />
            <span className="text-xs">{period === "custom" ? "Произв." : "Ещё..."}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Произвольный период</SelectItem>
          </SelectContent>
        </Select>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPreviousPeriod} 
              title="Предыдущий период"
              className="rounded-none border-r hover:bg-muted active:bg-primary active:text-primary-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToToday} 
              title="Перейти к сегодня"
              className="rounded-none border-r hover:bg-muted text-xs px-3"
            >
              Сегодня
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextPeriod} 
              title="Следующий период"
              className="rounded-none hover:bg-muted active:bg-primary active:text-primary-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Start/End date pickers for custom period */}
      {period === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">С:</span>
          <Popover open={isStartDatePickerOpen} onOpenChange={onStartDatePickerOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[140px] text-xs justify-start">
                {format(startDate, "d MMM yyyy", { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => { if (date) onStartDateChange(date); onStartDatePickerOpenChange(false); }}
                locale={ru}
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-sm text-muted-foreground">По:</span>
          <Popover open={isEndDatePickerOpen} onOpenChange={onEndDatePickerOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[140px] text-xs justify-start">
                {endDate ? format(endDate, "d MMM yyyy", { locale: ru }) : "Выберите..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => { if (date) onEndDateChange(date); onEndDatePickerOpenChange(false); }}
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs font-medium">
            <User className="h-3 w-3 mr-1" />
            {filteredOperatorsCount}
          </Badge>
          {hasActiveFilters && onResetFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              title="Сбросить все фильтры"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        <Select value={scheduleFilter} onValueChange={onScheduleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все графики" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все графики</SelectItem>
            {uniqueSchedules.filter(name => name && name.trim() !== '').map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showOnlyCyclic ? "default" : "outline"}
          size="sm"
          onClick={() => onShowOnlyCyclicChange(!showOnlyCyclic)}
          className={cn("text-xs gap-1", showOnlyCyclic && "bg-amber-500 hover:bg-amber-600")}
        >
          <RefreshCw className="h-3 w-3" />
          Только циклические
        </Button>

        {/* Rotation status filter */}
        <Select value={rotationFilter} onValueChange={(v) => onRotationFilterChange(v as "all" | "enabled" | "disabled")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус ротации" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все операторы</SelectItem>
            <SelectItem value="enabled">С ротацией смен</SelectItem>
            <SelectItem value="disabled">Без ротации смен</SelectItem>
          </SelectContent>
        </Select>

        {/* Absence status filter */}
        {onAbsenceStatusFilterChange && (
          <Select 
            value={absenceStatusFilter || "all"} 
            onValueChange={(v) => onAbsenceStatusFilterChange(v as AbsenceStatusFilter)}
          >
            <SelectTrigger className={cn(
              "w-[180px]",
              absenceStatusFilter && absenceStatusFilter !== "all" && "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
            )}>
              <SelectValue placeholder="Статус сотрудника" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              <SelectItem value="on_leave">🏖️ Сейчас в отпуске</SelectItem>
              <SelectItem value="sick">🏥 На больничном</SelectItem>
              <SelectItem value="available">✅ На работе</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Absence type filter */}
        {onAbsenceTypeFilterChange && (
          <Select 
            value={absenceTypeFilter || "all"} 
            onValueChange={(v) => onAbsenceTypeFilterChange(v as AbsenceTypeFilter)}
          >
            <SelectTrigger className={cn(
              "w-[200px]",
              absenceTypeFilter && absenceTypeFilter !== "all" && "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
            )}>
              <SelectValue placeholder="Тип отсутствия" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы отсутствия</SelectItem>
              <SelectItem value="annual_leave">🏖️ Ежегодный отпуск</SelectItem>
              <SelectItem value="sick_leave">🏥 Больничный</SelectItem>
              <SelectItem value="administrative_leave_with_compensation">📋 Админ. (с отработкой)</SelectItem>
              <SelectItem value="administrative_leave_without_compensation">📋 Админ. (без отработки)</SelectItem>
              <SelectItem value="maternity_leave">👶 Декретный отпуск</SelectItem>
              <SelectItem value="unpaid_leave">💰 Без сохранения ЗП</SelectItem>
              <SelectItem value="business_trip">✈️ Командировка</SelectItem>
              <SelectItem value="unauthorized_absence">🚫 Прогул</SelectItem>
              <SelectItem value="other">📝 Другое</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Timesheet status filter */}
        {onTimesheetStatusFilterChange && (
          <Select 
            value={timesheetStatusFilter || "all"} 
            onValueChange={(v) => onTimesheetStatusFilterChange(v as TimesheetStatusFilter)}
          >
            <SelectTrigger className={cn(
              "w-[180px]",
              timesheetStatusFilter && timesheetStatusFilter !== "all" && "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            )}>
              <SelectValue placeholder="Статус табеля" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы табеля</SelectItem>
              <SelectItem value="unfilled">⚠️ Не заполнен</SelectItem>
              <SelectItem value="pending">✏️ Черновик</SelectItem>
              <SelectItem value="on_review">👁️ На проверке</SelectItem>
              <SelectItem value="confirmed">✓ Подтверждён</SelectItem>
              <SelectItem value="approved">✅ Утверждён</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Bulk absence buttons */}
        {(onBulkAbsence || onBulkDeleteAbsence) && (
          <div className="flex items-center border rounded-md overflow-hidden">
            {onBulkAbsence && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkAbsence}
                className="gap-1.5 text-xs rounded-none border-r"
                title="Массовое создание отсутствий"
              >
                <Users className="h-4 w-4" />
                <span className="hidden lg:inline">Массовое отсутствие</span>
              </Button>
            )}
            {onBulkDeleteAbsence && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDeleteAbsence}
                className="gap-1.5 text-xs rounded-none text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Массовое удаление отсутствий"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden lg:inline">Удалить</span>
              </Button>
            )}
          </div>
        )}
        
        {/* Expand/Collapse all */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            title="Развернуть все"
            className={cn(
              "rounded-none border-r hover:bg-muted transition-colors",
              isAllExpanded && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapseAll}
            title="Свернуть все"
            className={cn(
              "rounded-none hover:bg-muted transition-colors",
              isAllCollapsed && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <Button
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Выйти из полноэкранного режима (Esc)" : "Полноэкранный режим (F11)"}
            className={cn(
              "gap-1.5",
              isFullscreen && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="text-xs">Выход</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Полный экран</span>
              </>
            )}
          </Button>
        )}

        {/* Collapsible Legend */}
        <div className="border-l pl-3 ml-1">
          <CalendarLegend 
            shiftColorMap={shiftColorMap} 
            shiftDetails={shiftDetails}
            absenceStatusFilter={absenceStatusFilter}
            onAbsenceStatusFilterChange={onAbsenceStatusFilterChange}
            absenceTypeFilter={absenceTypeFilter}
            onAbsenceTypeFilterChange={onAbsenceTypeFilterChange}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            onResetFilters={onResetFilters}
            defaultReductionHours={defaultReductionHours}
          />
        </div>
      </div>
    </div>
  );
};
