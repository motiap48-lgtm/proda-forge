import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Archive, UserCheck, History, X, Calendar as CalendarIcon, Briefcase, Timer, RotateCcw } from "lucide-react";
import { 
  useArchivedOperators, 
  useReinstateOperator,
  useAllEmploymentHistory,
} from "@/hooks/useEmploymentHistory";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { ru } from "date-fns/locale";
import { getTimeAgo, pluralize } from "@/utils/timeAgoUtils";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmploymentHistoryViewDialog } from "./EmploymentHistoryViewDialog";

export const ArchivedOperatorsTab = () => {
  const { data: operators, isLoading } = useArchivedOperators();
  const { data: allHistory } = useAllEmploymentHistory();
  const reinstateOperator = useReinstateOperator();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [operatorToReinstate, setOperatorToReinstate] = useState<any>(null);
  const [reinstateDate, setReinstateDate] = useState<Date | undefined>(undefined);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [, setTick] = useState(0);

  // Update time ago every second
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredOperators = useMemo(() => {
    return operators?.filter((op: any) => {
      const matchesSearch = op.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.position?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];
  }, [operators, searchQuery]);

  // Get pending reinstatement dates from employment history
  const pendingReinstatements = useMemo(() => {
    if (!allHistory) return new Map<string, string>();
    const today = new Date().toISOString().split("T")[0];
    const map = new Map<string, string>();
    // Sort descending to get latest first
    const sorted = [...allHistory].sort((a, b) => b.event_date.localeCompare(a.event_date));
    for (const record of sorted) {
      if (record.event_type === "reinstated" && record.event_date > today && !map.has(record.operator_id)) {
        map.set(record.operator_id, record.event_date);
      }
    }
    return map;
  }, [allHistory]);

  const handleReinstate = (operator: any) => {
    setOperatorToReinstate(operator);
    const minDate = operator.termination_date 
      ? addDays(new Date(operator.termination_date), 1) 
      : new Date();
    setReinstateDate(minDate);
    setReinstateDialogOpen(true);
  };

  const getMinReinstateDate = () => {
    if (!operatorToReinstate?.termination_date) return new Date();
    return addDays(new Date(operatorToReinstate.termination_date), 1);
  };

  const confirmReinstate = () => {
    if (operatorToReinstate && reinstateDate) {
      const hireDateStr = format(reinstateDate, "yyyy-MM-dd");
      reinstateOperator.mutate(
        { operatorId: operatorToReinstate.id, hireDate: hireDateStr },
        {
          onSuccess: () => {
            setReinstateDialogOpen(false);
            setOperatorToReinstate(null);
            setReinstateDate(undefined);
          },
        }
      );
    }
  };

  const handleShowHistory = (operator: any) => {
    setSelectedOperator({
      id: operator.id,
      full_name: operator.full_name,
      code: operator.code,
      hire_date: operator.hire_date,
    });
    setHistoryDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск в архиве..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8 h-8 sm:h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Archive className="h-4 w-4" />
        <span>В архиве: <span className="font-medium text-foreground">{filteredOperators.length}</span></span>
      </div>

      {filteredOperators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Архив пуст</p>
            <p className="text-sm">Уволенные сотрудники будут отображаться здесь</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredOperators.map((operator: any) => (
            <Card key={operator.id} className="opacity-75 hover:opacity-100 transition-opacity">
              <CardHeader className="pb-2 px-4">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{operator.full_name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{operator.code}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="text-sm text-muted-foreground space-y-1.5">
                  {operator.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{operator.position}</span>
                    </div>
                  )}
                  {operator.hire_date && (
                    <div className="flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 shrink-0" />
                      <span>Принят: {format(new Date(operator.hire_date), "d MMM yyyy", { locale: ru })}</span>
                    </div>
                  )}
                  {operator.termination_date && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Уволен: {format(new Date(operator.termination_date), "d MMM yyyy", { locale: ru })}
                        {" · "}
                        <span className="text-muted-foreground/70" title={(() => {
                          const termDate = new Date(operator.termination_date);
                          const createdAt = new Date(operator.updated_at || operator.created_at);
                          const sameDay = termDate.toDateString() === createdAt.toDateString();
                          return getTimeAgo(sameDay ? createdAt : operator.termination_date).formatted;
                        })()}>
                          {(() => {
                            const termDate = new Date(operator.termination_date);
                            const createdAt = new Date(operator.updated_at || operator.created_at);
                            const sameDay = termDate.toDateString() === createdAt.toDateString();
                            return getTimeAgo(sameDay ? createdAt : operator.termination_date).shortFormatted;
                          })()}
                        </span>
                      </span>
                    </div>
                  )}
                  {operator.termination_reason && (
                    <div className="text-xs bg-muted/50 p-2 rounded">
                      {operator.termination_reason}
                    </div>
                  )}
                  {/* Pending reinstatement info */}
                  {(() => {
                    const reinstateDate = pendingReinstatements.get(operator.id);
                    if (!reinstateDate) return null;
                    const days = differenceInCalendarDays(new Date(reinstateDate), new Date());
                    if (days <= 0) return null;
                    return (
                      <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2 rounded text-emerald-700 dark:text-emerald-300">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Восстановление {format(new Date(reinstateDate), "d MMM yyyy", { locale: ru })} (через {days} {pluralize(days, "день", "дня", "дней")})
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShowHistory(operator)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    История
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReinstate(operator)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Восстановить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reinstate confirmation dialog */}
      <AlertDialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Восстановить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  <strong>{operatorToReinstate?.full_name}</strong> будет восстановлен как активный сотрудник. 
                  Информация об увольнении сохранится в истории.
                </p>
                <div className="space-y-2">
                  <Label>Дата восстановления *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reinstateDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reinstateDate ? format(reinstateDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={reinstateDate}
                        onSelect={setReinstateDate}
                        disabled={(date) => date < getMinReinstateDate()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {operatorToReinstate?.termination_date && (
                    <p className="text-xs text-muted-foreground">
                      Минимальная дата: {format(getMinReinstateDate(), "d MMMM yyyy", { locale: ru })} (день после увольнения)
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReinstate} disabled={!reinstateDate}>
              Восстановить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employment history dialog with seniority calculation */}
      <EmploymentHistoryViewDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        operator={selectedOperator}
      />
    </div>
  );
};
