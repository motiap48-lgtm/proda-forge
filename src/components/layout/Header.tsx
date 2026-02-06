import { Settings, LogOut, UserCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { useBetaSettings } from "@/hooks/useBetaSettings";
import { useChangelog, getLatestVersion } from "@/hooks/useChangelog";

export const Header = () => {
  const { user, userRoles, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { settings: betaSettings } = useBetaSettings();
  const { changelog } = useChangelog();
  const latestVersion = getLatestVersion(changelog);

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Администратор",
      production_manager: "Менеджер производства",
      warehouse_manager: "Менеджер склада",
      operator: "Оператор",
      viewer: "Наблюдатель",
    };
    return roleLabels[role] || role;
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <span className="text-sm sm:text-lg font-bold text-primary-foreground">EVA</span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">ERP Vostok Auto</h1>
              {betaSettings.showBetaBadge && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    Beta{betaSettings.showVersionInBadge ? ` ${latestVersion?.startsWith('v') ? latestVersion : `v${latestVersion}`}` : ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Управление производством</p>
            </div>
          {betaSettings.showBetaBadge && (
              <Badge variant="outline" className="sm:hidden text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                Beta{betaSettings.showVersionInBadge ? ` ${latestVersion?.startsWith('v') ? latestVersion : `v${latestVersion}`}` : ''}
              </Badge>
            )}
          </div>

          <Button 
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary to-primary-glow"
            size="sm"
          >
            Войти
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <span className="text-sm sm:text-lg font-bold text-primary-foreground">EVA</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">ERP Vostok Auto</h1>
              {betaSettings.showBetaBadge && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  Beta{betaSettings.showVersionInBadge ? ` ${latestVersion?.startsWith('v') ? latestVersion : `v${latestVersion}`}` : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Управление производством</p>
          </div>
          {betaSettings.showBetaBadge && (
            <Badge variant="outline" className="sm:hidden text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
              Beta{betaSettings.showVersionInBadge ? ` ${latestVersion?.startsWith('v') ? latestVersion : `v${latestVersion}`}` : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationPopover />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                  {getInitials(user.email || "U")}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.email}</p>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserCircle className="mr-2 h-4 w-4" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </DropdownMenuItem>
              {betaSettings.showFeaturesPage && (
                <DropdownMenuItem onClick={() => navigate("/features")}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  Функциональность
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
