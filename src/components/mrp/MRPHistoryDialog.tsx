import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, Loader2 } from "lucide-react";
import { useMRPHistory, useDeleteMRPCalculation } from "@/hooks/useMRPPlanning";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export const MRPHistoryDialog = () => {
  const [open, setOpen] = useState(false);
  const { data: history, isLoading } = useMRPHistory();
  const deleteMutation = useDeleteMRPCalculation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calendar className="mr-2 h-4 w-4" />
          История расчетов
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История расчетов MRP</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((calc: any) => (
              <Card key={calc.id} className="hover:border-primary transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {format(new Date(calc.calculation_date), "dd MMM yyyy, HH:mm", { locale: ru })}
                        </Badge>
                        <Badge variant="secondary">
                          Горизонт: {calc.planning_horizon_days} дней
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Дата начала: {format(new Date(calc.start_date), "dd MMMM yyyy", { locale: ru })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Материалов проанализировано: {calc.mrp_calculation_results?.[0]?.count || 0}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(calc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            История расчетов пуста
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
