import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  Calendar, 
  User, 
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface OutputHistoryCardProps {
  orderId: string;
  operations?: any[];
}

interface OutputHistoryEntry {
  id: string;
  created_at: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  user_name: string | null;
  operation_name: string | null;
  good_quantity: number;
  defect_quantity: number;
}

export const OutputHistoryCard = ({ orderId, operations }: OutputHistoryCardProps) => {
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [expanded, setExpanded] = useState(true);

  const { data: history, isLoading } = useQuery({
    queryKey: ["output-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_order_history")
        .select(`
          id,
          created_at,
          description,
          old_value,
          new_value,
          profiles:user_id(full_name)
        `)
        .eq("production_order_id", orderId)
        .eq("change_type", "output_registered")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((entry: any) => {
        // Parse new_value to extract details
        let goodQuantity = 0;
        let defectQuantity = 0;
        let operationName: string | null = null;

        try {
          const parsed = JSON.parse(entry.new_value || "{}");
          if (typeof parsed === 'object' && parsed !== null) {
            goodQuantity = parsed.good_quantity || 0;
            defectQuantity = parsed.defect_quantity || 0;
            operationName = parsed.operation_name || null;
          } else {
            // Old format - calculate delta
            const newValue = Number(entry.new_value) || 0;
            const oldValue = Number(entry.old_value) || 0;
            goodQuantity = Math.max(0, newValue - oldValue);
          }
        } catch {
          const newValue = Number(entry.new_value) || 0;
          const oldValue = Number(entry.old_value) || 0;
          goodQuantity = Math.max(0, newValue - oldValue);
        }

        // Try to extract operation name from description if not in new_value
        if (!operationName && entry.description) {
          const match = entry.description.match(/выработка:\s*(.+?)\s*—/);
          if (match) {
            operationName = match[1];
          }
        }

        return {
          id: entry.id,
          created_at: entry.created_at,
          description: entry.description,
          old_value: entry.old_value,
          new_value: entry.new_value,
          user_name: entry.profiles?.full_name || null,
          operation_name: operationName,
          good_quantity: goodQuantity,
          defect_quantity: defectQuantity,
        } as OutputHistoryEntry;
      });
    },
    enabled: !!orderId,
  });

  // Get unique operation names for filter
  const operationNames = useMemo(() => {
    if (!history) return [];
    const names = new Set(history.map(h => h.operation_name).filter(Boolean));
    return Array.from(names) as string[];
  }, [history]);

  // Filter history by selected operation
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (selectedOperation === "all") return history;
    return history.filter(h => h.operation_name === selectedOperation);
  }, [history, selectedOperation]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredHistory.reduce((acc, entry) => ({
      good: acc.good + entry.good_quantity,
      defect: acc.defect + entry.defect_quantity,
    }), { good: 0, defect: 0 });
  }, [filteredHistory]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground">
          Загрузка истории выработки...
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            История выработки
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-muted-foreground">
          Выработка ещё не регистрировалась
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            История выработки
            <Badge variant="secondary" className="ml-2">
              {filteredHistory.length} записей
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Годных: <span className="font-medium text-green-600">{totals.good}</span>
              {totals.defect > 0 && (
                <span className="ml-2">
                  Брак: <span className="font-medium text-red-600">{totals.defect}</span>
                </span>
              )}
            </div>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {/* Filter */}
          {operationNames.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Все операции" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все операции</SelectItem>
                  {operationNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* History list */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {entry.operation_name && (
                      <Badge variant="outline" className="text-xs">
                        {entry.operation_name}
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-green-600">
                      +{entry.good_quantity} шт.
                    </span>
                    {entry.defect_quantity > 0 && (
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        брак: {entry.defect_quantity}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(entry.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                    {entry.user_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.user_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
