import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Wrench } from "lucide-react";
import { useEquipment, useDeleteEquipment } from "@/hooks/useEquipment";
import { EquipmentDialog } from "./EquipmentDialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface EquipmentManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workCenter: any;
}

export const EquipmentManagement = ({
  open,
  onOpenChange,
  workCenter,
}: EquipmentManagementProps) => {
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  const { data: equipment, isLoading } = useEquipment(workCenter?.id);
  const deleteMutation = useDeleteEquipment();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700">Активно</Badge>;
      case "maintenance":
        return <Badge variant="default">На ТО</Badge>;
      case "broken":
        return <Badge variant="destructive">Сломано</Badge>;
      case "inactive":
        return <Badge variant="secondary">Неактивно</Badge>;
      default:
        return null;
    }
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      machine: "Станок",
      welding: "Сварочное",
      tool: "Инструмент",
      fixture: "Оснастка",
      other: "Другое",
    };
    return types[type] || type;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Оборудование производственного участка {workCenter?.code}
            </DialogTitle>
            <DialogDescription>
              Управление оборудованием и инструментами
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              onClick={() => {
                setSelectedEquipment(null);
                setEquipmentDialogOpen(true);
              }}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Добавить оборудование
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : equipment && equipment.length > 0 ? (
              <div className="space-y-3">
                {equipment.map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="rounded-lg bg-primary/10 p-3">
                            <Wrench className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{item.code}</h4>
                              {getStatusBadge(item.status)}
                              <Badge variant="outline">{getTypeName(item.equipment_type)}</Badge>
                            </div>
                            <p className="text-sm text-foreground mb-1">{item.name}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {item.manufacturer && (
                                <p>Производитель: {item.manufacturer}</p>
                              )}
                              {item.model && <p>Модель: {item.model}</p>}
                              {item.serial_number && <p>S/N: {item.serial_number}</p>}
                              {item.next_maintenance_date && (
                                <p>
                                  Следующее ТО:{" "}
                                  {format(new Date(item.next_maintenance_date), "dd MMM yyyy", {
                                    locale: ru,
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipment(item);
                              setEquipmentDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Удалить оборудование?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Оборудование не добавлено</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {workCenter && (
        <EquipmentDialog
          open={equipmentDialogOpen}
          onOpenChange={setEquipmentDialogOpen}
          workCenterId={workCenter.id}
          equipment={selectedEquipment}
        />
      )}
    </>
  );
};
