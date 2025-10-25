import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  variant?: "default" | "accent" | "warning";
}

export const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  variant = "default",
}: MetricCardProps) => {
  return (
    <Card className="overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium",
                  trend === "up" && "text-accent",
                  trend === "down" && "text-destructive"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              variant === "default" && "bg-gradient-to-br from-primary to-primary-glow",
              variant === "accent" && "bg-gradient-to-br from-accent to-accent/80",
              variant === "warning" && "bg-gradient-to-br from-warning to-warning/80"
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
