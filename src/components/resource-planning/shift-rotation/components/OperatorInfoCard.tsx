import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, RefreshCw, Briefcase, Calendar, Building2, Phone, Mail } from "lucide-react";

interface OperatorInfoCardProps {
  operator: any;
}

export const OperatorInfoCard: React.FC<OperatorInfoCardProps> = ({ operator }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-semibold">{operator.full_name}</p>
        <p className="text-xs text-muted-foreground">{operator.code}</p>
      </div>
    </div>
    
    <div className="space-y-2 text-sm">
      {operator.position && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{operator.position}</span>
        </div>
      )}
      
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
    
    <div className="flex flex-wrap gap-1.5 pt-1">
      {operator.employee_type && (
        <Badge variant="secondary" className="text-xs">
          {operator.employee_type === 'станочник' ? 'Станочник' :
           operator.employee_type === 'сборщик' ? 'Сборщик' :
           operator.employee_type === 'сварщик' ? 'Сварщик' :
           operator.employee_type === 'маляр' ? 'Маляр' :
           operator.employee_type === 'универсал' ? 'Универсал' : operator.employee_type}
        </Badge>
      )}
      {operator.shift_rotation_enabled && (
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
  </div>
);
