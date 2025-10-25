import { Home, Package, Calendar, TrendingUp, Warehouse, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigationItems = [
  { id: "dashboard", label: "Главная", icon: Home },
  { id: "production", label: "Производство", icon: Package },
  { id: "planning", label: "Планирование", icon: Calendar },
  { id: "warehouse", label: "Склад", icon: Warehouse },
  { id: "analytics", label: "Аналитика", icon: TrendingUp },
  { id: "finance", label: "Финансы", icon: DollarSign },
];

export const Navigation = () => {
  const [active, setActive] = useState("dashboard");

  return (
    <nav className="sticky top-16 z-40 w-full border-b bg-card/95 backdrop-blur">
      <div className="container">
        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
