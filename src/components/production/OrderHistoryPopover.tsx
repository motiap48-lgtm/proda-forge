import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryEntry {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

const changeTypeConfig: Record<string, { label: string; color: string }> = {
  status_changed: { label: "Статус", color: "bg-blue-100 text-blue-700" },
  quantity_changed: { label: "Количество", color: "bg-amber-100 text-amber-700" },
  output_registered: { label: "Выпуск", color: "bg-green-100 text-green-700" },
  operation_started: { label: "Операция", color: "bg-purple-100 text-purple-700" },
  order_paused: { label: "Пауза", color: "bg-orange-100 text-orange-700" },
  order_resumed: { label: "Возобновлён", color: "bg-teal-100 text-teal-700" },
};

interface OrderHistoryPopoverProps {
  orderId: string;
}

export const OrderHistoryPopover = ({ orderId }: OrderHistoryPopoverProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchHistory();
    }
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
        >
          <History className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b">
          <h4 className="font-medium text-sm">История изменений</h4>
        </div>
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет записей
            </p>
          ) : (
            <div className="divide-y">
              {history.map((entry) => {
                const config = changeTypeConfig[entry.change_type] || {
                  label: entry.change_type,
                  color: "bg-gray-100 text-gray-700",
                };
                return (
                  <div key={entry.id} className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${config.color}`}>
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
                    {entry.description && (
                      <p className="text-xs text-foreground">{entry.description}</p>
                    )}
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
