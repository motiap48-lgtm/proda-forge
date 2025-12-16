import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileSpreadsheet, History, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryEntry {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

const changeTypeConfig: Record<string, { label: string; className: string }> = {
  status_changed: { label: "Статус", className: "bg-primary/10 text-primary" },
  quantity_changed: { label: "Количество", className: "bg-accent/30 text-accent-foreground" },
  output_registered: { label: "Выпуск", className: "bg-secondary text-secondary-foreground" },
  operation_started: { label: "Операция", className: "bg-muted text-muted-foreground" },
  order_paused: { label: "Пауза", className: "bg-destructive/10 text-destructive" },
  order_resumed: { label: "Возобновлён", className: "bg-primary/10 text-primary" },
};

interface OrderHistoryPopoverProps {
  orderId: string;
  orderNumber?: string;
}

export const OrderHistoryPopover = ({ orderId, orderNumber }: OrderHistoryPopoverProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      void fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("production_order_history")
        .select("id, change_type, old_value, new_value, description, created_at")
        .eq("production_order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportHistoryToExcel = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("production_order_history")
        .select("change_type, old_value, new_value, description, created_at")
        .eq("production_order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Нет данных для экспорта");
        return;
      }

      const exportData = data.map((row) => ({
        "Дата": new Date(row.created_at).toLocaleString("ru-RU"),
        "Тип": changeTypeConfig[row.change_type]?.label || row.change_type,
        "Старое значение": row.old_value || "",
        "Новое значение": row.new_value || "",
        "Описание": row.description || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "История");

      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.min(
          60,
          Math.max(key.length, ...exportData.map((r) => String(r[key as keyof typeof r] || "").length)) + 2
        ),
      }));
      ws["!cols"] = colWidths;

      const safeOrder = (orderNumber || orderId).replace(/\//g, "-");
      XLSX.writeFile(wb, `История_изменений_${safeOrder}.xlsx`);
      toast.success("История экспортирована");
    } catch (error: any) {
      console.error("Error exporting history:", error);
      toast.error("Ошибка экспорта: " + (error?.message || "Неизвестная ошибка"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
          <History className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
          <h4 className="font-medium text-sm">История изменений</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              void exportHistoryToExcel();
            }}
            disabled={isExporting}
            title="Экспорт в Excel"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет записей</p>
          ) : (
            <div className="divide-y">
              {history.map((entry) => {
                const config = changeTypeConfig[entry.change_type] || {
                  label: entry.change_type,
                  className: "bg-muted text-muted-foreground",
                };

                return (
                  <div key={entry.id} className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${config.className}`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {entry.description && <p className="text-xs text-foreground">{entry.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
