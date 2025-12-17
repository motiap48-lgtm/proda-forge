import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  ChevronRight,
  Users,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navigationItems = [
  { name: "Дашборд", path: "/", icon: LayoutDashboard },
  { name: "Производство", path: "/production-orders", icon: Package },
  { 
    name: "Планирование", 
    icon: Calendar,
    submenu: [
      { name: "MRP Планирование", path: "/planning/mrp", icon: Calendar },
      { name: "Ресурсы и ССЗ", path: "/planning/resources", icon: Users },
    ]
  },
  { 
    name: "Справочники", 
    icon: FileText,
    submenu: [
      { name: "Номенклатура", path: "/references/products", icon: Package },
      { name: "Спецификации", path: "/references/specifications", icon: FileText },
      { name: "Техмаршруты", path: "/references/routing-sheets", icon: GitBranch },
      { name: "Производственные участки", path: "/references/work-centers", icon: Factory },
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
  { 
    name: "Аналитика", 
    icon: BarChart3,
    submenu: [
      { name: "Отчеты производства", path: "/analytics/production-reports", icon: BarChart3 },
    ]
  },
  { name: "Финансы", path: "/finance", icon: DollarSign },
];

export const Navigation = () => {
  const location = useLocation();
  const { hasRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => 
      prev.includes(name) 
        ? prev.filter(g => g !== name) 
        : [...prev, name]
    );
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Desktop navigation item
  const DesktopNavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    
    if ('submenu' in item && item.submenu) {
      const isActive = item.submenu.some(sub => location.pathname === sub.path);
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.name}</span>
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
        to={item.path!}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{item.name}</span>
      </Link>
    );
  };

  // Mobile navigation item
  const MobileNavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    
    if ('submenu' in item && item.submenu) {
      const isActive = item.submenu.some(sub => location.pathname === sub.path);
      const isExpanded = expandedGroups.includes(item.name);
      
      return (
        <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(item.name)}>
          <CollapsibleTrigger asChild>
            <button
              className={`flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-8 mt-1 space-y-1">
              {item.submenu.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = location.pathname === subItem.path;
                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isSubActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <SubIcon className="h-4 w-4" />
                    <span>{subItem.name}</span>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path!}
        onClick={closeMobileMenu}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <Icon className="h-5 w-5" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <nav className="border-b bg-card">
      <div className="container">
        <div className="flex h-12 sm:h-14 items-center">
          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Открыть меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                    <span className="text-sm font-bold text-primary-foreground">EVA</span>
                  </div>
                  <span>Навигация</span>
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
                {navigationItems.map((item) => (
                  <MobileNavItem key={item.name} item={item} />
                ))}
                {hasRole('admin') && (
                  <Link
                    to="/user-management"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      location.pathname === "/user-management"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Users className="h-5 w-5" />
                    <span>Пользователи</span>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {navigationItems.map((item) => (
              <DesktopNavItem key={item.name} item={item} />
            ))}
            {hasRole('admin') && (
              <Link
                to="/user-management"
                className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  location.pathname === "/user-management"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Пользователи</span>
              </Link>
            )}
          </div>

          {/* Mobile: Show current section name */}
          <div className="md:hidden flex-1 text-sm font-medium text-foreground truncate">
            {(() => {
              for (const item of navigationItems) {
                if ('submenu' in item && item.submenu) {
                  const activeSubItem = item.submenu.find(sub => location.pathname === sub.path);
                  if (activeSubItem) return activeSubItem.name;
                } else if (location.pathname === item.path) {
                  return item.name;
                }
              }
              if (location.pathname === "/user-management") return "Пользователи";
              return "";
            })()}
          </div>
        </div>
      </div>
    </nav>
  );
};
