import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Calendar,
  Warehouse,
  BarChart3,
  DollarSign,
  FileText,
  GitBranch,
  Factory,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { name: "Дашборд", path: "/", icon: LayoutDashboard },
  { name: "Производство", path: "/production-orders", icon: Package },
  { 
    name: "Планирование", 
    icon: Calendar,
    submenu: [
      { name: "MRP Планирование", path: "/planning/mrp", icon: Calendar },
    ]
  },
  { 
    name: "Справочники", 
    icon: FileText,
    submenu: [
      { name: "Спецификации", path: "/references/specifications", icon: FileText },
      { name: "Техмаршруты", path: "/references/routing-sheets", icon: GitBranch },
      { name: "Рабочие центры", path: "/references/work-centers", icon: Factory },
    ]
  },
  { 
    name: "Склад", 
    icon: Warehouse,
    submenu: [
      { name: "Остатки", path: "/warehouse/inventory", icon: Warehouse },
      { name: "Резервирование", path: "/warehouse/reservations", icon: Warehouse },
      { name: "Выдача материалов", path: "/warehouse/issues", icon: Warehouse },
    ]
  },
  { name: "Аналитика", path: "/analytics", icon: BarChart3 },
  { name: "Финансы", path: "/finance", icon: DollarSign },
];

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="border-b bg-card">
      <div className="container">
        <div className="flex h-14 items-center space-x-1 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            
            if ('submenu' in item && item.submenu) {
              const isActive = item.submenu.some(sub => location.pathname === sub.path);
              return (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.submenu.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <DropdownMenuItem key={subItem.path} asChild>
                          <Link
                            to={subItem.path}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <SubIcon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
