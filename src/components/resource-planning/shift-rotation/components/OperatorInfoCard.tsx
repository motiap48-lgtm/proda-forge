import React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, RefreshCw, Briefcase, Calendar, Building2, Phone, Mail, CalendarCheck, Pencil, Copy, PhoneCall, UserX } from "lucide-react";
import { parseDateOnly } from "../utils";
import { toast } from "sonner";

interface OperatorInfoCardProps {
  operator: any;
  onEdit?: (operator: any) => void;
  onManageAbsences?: (operator: any) => void;
}

export const OperatorInfoCard: React.FC<OperatorInfoCardProps> = ({ operator, onEdit, onManageAbsences }) => {
  const schedule = operator.work_schedules;
  const isCyclic = schedule?.schedule_type === 'cyclic';
  const shifts = schedule?.work_schedule_shifts || [];
  const hasMultipleShifts = shifts.length > 1;
  
  // For cyclic schedules: show personal cycle date badge
  const hasPersonalCycleDate = isCyclic && operator.shift_rotation_start_date;
  const personalCycleDate = parseDateOnly(operator.shift_rotation_start_date);
  
  // For non-cyclic schedules with multiple shifts: show rotation badge
  const showShiftRotationBadge = !isCyclic && hasMultipleShifts && operator.shift_rotation_enabled;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (operator.phone) {
      navigator.clipboard.writeText(operator.phone);
      toast.success("Телефон скопирован");
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (operator.phone) {
      window.location.href = `tel:${operator.phone}`;
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(operator);
  };

  const handleManageAbsences = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManageAbsences?.(operator);
  };
  
  return (
    <div className="space-y-3">
      {/* Employee name and code at the top */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{operator.full_name}</p>
          <p className="text-xs text-muted-foreground">{operator.code}</p>
        </div>
      </div>
      
      {/* Position right after name */}
      {operator.position && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{operator.position}</span>
        </div>
      )}
      
      {/* Badges section */}
      <div className="flex flex-wrap gap-1.5">
        {operator.employee_type && (
          <Badge variant="secondary" className="text-xs">
            {operator.employee_type === 'станочник' ? 'Станочник' :
             operator.employee_type === 'сборщик' ? 'Сборщик' :
             operator.employee_type === 'сварщик' ? 'Сварщик' :
             operator.employee_type === 'маляр' ? 'Маляр' :
             operator.employee_type === 'универсал' ? 'Универсал' : operator.employee_type}
          </Badge>
        )}
        {hasPersonalCycleDate && personalCycleDate && (
          <Badge variant="outline" className="text-xs gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300">
            <CalendarCheck className="h-3 w-3" />
            Цикл с {format(personalCycleDate, 'd MMM', { locale: ru })}
          </Badge>
        )}
        {showShiftRotationBadge && (
          <Badge variant="outline" className="text-xs gap-1">
            <RefreshCw className="h-3 w-3" />
            Ротация
          </Badge>
        )}
        {operator.assigned_shift_number && (
          <Badge variant="outline" className="text-xs">
            Смена {operator.assigned_shift_number}
          </Badge>
        )}
      </div>
    
    {/* Additional info */}
    <div className="space-y-2 text-sm border-t pt-2">
      {operator.work_schedules?.name && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{operator.work_schedules.name}</span>
        </div>
      )}
      
      {operator.default_work_center?.name && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span>{operator.default_work_center.name}</span>
        </div>
      )}
      
      {operator.phone && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span>{operator.phone}</span>
        </div>
      )}
      
      {operator.email && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>{operator.email}</span>
        </div>
      )}
    </div>

    {/* Quick actions */}
    <div className="flex flex-wrap gap-2 pt-2 border-t">
      {onEdit && (
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleEdit}>
          <Pencil className="h-3 w-3 mr-1.5" />
          Редактировать
        </Button>
      )}
      {onManageAbsences && (
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleManageAbsences}>
          <UserX className="h-3 w-3 mr-1.5" />
          Отсутствия
        </Button>
      )}
    </div>
    <div className="flex gap-2">
      {operator.phone && (
        <>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleCall} title="Позвонить">
            <PhoneCall className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleCopyPhone} title="Копировать телефон">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
    </div>
  );
};
