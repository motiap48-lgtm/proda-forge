import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileEdit, Eye, CheckCircle, ChevronDown, Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export type TimesheetStatus = 'pending' | 'draft' | 'on_review' | 'confirmed' | 'approved';

interface TimesheetStatusBadgeProps {
  status: TimesheetStatus;
  onStatusChange?: (newStatus: TimesheetStatus) => void;
  editable?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<TimesheetStatus, {
  label: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "outline" | "destructive";
  className: string;
}> = {
  pending: {
    label: "Черновик",
    icon: <FileEdit className="h-3 w-3" />,
    variant: "outline",
    className: "text-muted-foreground border-muted-foreground/30",
  },
  draft: {
    label: "Черновик",
    icon: <FileEdit className="h-3 w-3" />,
    variant: "outline",
    className: "text-muted-foreground border-muted-foreground/30",
  },
  on_review: {
    label: "На проверке",
    icon: <Eye className="h-3 w-3" />,
    variant: "secondary",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300",
  },
  confirmed: {
    label: "Подтверждён",
    icon: <CheckCircle className="h-3 w-3" />,
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300",
  },
  approved: {
    label: "Утверждён",
    icon: <CheckCircle className="h-3 w-3" />,
    variant: "default",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300",
  },
};

// Status transition rules with role requirements
const STATUS_TRANSITIONS: Record<TimesheetStatus, { 
  nextStatus: TimesheetStatus; 
  label: string;
  icon: React.ReactNode;
  requiredRoles: string[]; // empty = any authenticated user
}[]> = {
  pending: [
    { nextStatus: 'on_review', label: 'Отправить на проверку', icon: <Send className="h-3 w-3" />, requiredRoles: [] },
  ],
  draft: [
    { nextStatus: 'on_review', label: 'Отправить на проверку', icon: <Send className="h-3 w-3" />, requiredRoles: [] },
  ],
  on_review: [
    { nextStatus: 'pending', label: 'Вернуть в черновик', icon: <ArrowLeft className="h-3 w-3" />, requiredRoles: ['admin', 'production_manager'] },
    { nextStatus: 'confirmed', label: 'Подтвердить', icon: <CheckCircle className="h-3 w-3" />, requiredRoles: ['admin', 'production_manager'] },
  ],
  confirmed: [
    { nextStatus: 'on_review', label: 'Вернуть на проверку', icon: <ArrowLeft className="h-3 w-3" />, requiredRoles: ['admin', 'production_manager'] },
    { nextStatus: 'approved', label: 'Утвердить', icon: <CheckCircle className="h-3 w-3" />, requiredRoles: ['admin'] },
  ],
  approved: [
    { nextStatus: 'confirmed', label: 'Отменить утверждение', icon: <ArrowLeft className="h-3 w-3" />, requiredRoles: ['admin'] },
  ],
};

export const TimesheetStatusBadge: React.FC<TimesheetStatusBadgeProps> = ({
  status,
  onStatusChange,
  editable = false,
  compact = false,
  showActions = true,
}) => {
  const { hasRole, userRoles } = useAuth();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  // Filter allowed transitions based on user roles
  const allowedTransitions = (STATUS_TRANSITIONS[status] || []).filter(transition => {
    if (transition.requiredRoles.length === 0) return true;
    return transition.requiredRoles.some(role => hasRole(role));
  });

  // Check if user can edit status at all
  const canEditStatus = editable && onStatusChange && allowedTransitions.length > 0 && showActions;

  if (!canEditStatus) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn("gap-1 text-xs", config.className, compact && "px-1.5 py-0")}
          >
            {config.icon}
            {!compact && config.label}
          </Badge>
        </TooltipTrigger>
        {compact && (
          <TooltipContent>
            <p className="text-xs">{config.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 gap-1 text-xs font-normal border",
            config.className
          )}
        >
          {config.icon}
          {!compact && config.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allowedTransitions.map((transition) => {
          const nextConfig = STATUS_CONFIG[transition.nextStatus];
          return (
            <DropdownMenuItem
              key={transition.nextStatus}
              onClick={() => onStatusChange(transition.nextStatus)}
              className="gap-2"
            >
              {transition.icon}
              <span>{transition.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Helper to get status display info
export const getTimesheetStatusInfo = (status: TimesheetStatus) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};

// Helper to check if user can change to a specific status
export const canUserChangeStatus = (
  currentStatus: TimesheetStatus, 
  targetStatus: TimesheetStatus, 
  hasRoleFn: (role: string) => boolean
): boolean => {
  const transitions = STATUS_TRANSITIONS[currentStatus] || [];
  const transition = transitions.find(t => t.nextStatus === targetStatus);
  if (!transition) return false;
  if (transition.requiredRoles.length === 0) return true;
  return transition.requiredRoles.some(role => hasRoleFn(role));
};
