import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "accent" | "warning";
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
}: MetricCardProps) => {
  return (
    <Card className="overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg shrink-0",
              variant === "default" && "bg-gradient-to-br from-primary to-primary-glow",
              variant === "accent" && "bg-gradient-to-br from-accent to-accent/80",
              variant === "warning" && "bg-gradient-to-br from-warning to-warning/80"
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
