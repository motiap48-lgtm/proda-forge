import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings as SettingsIcon, Bell, Moon, Sun, Globe, Lock, Tag, Building2, Sparkles, Users, Calendar, ExternalLink, Download, CalendarOff, Clock, CalendarCheck, ClipboardList } from "lucide-react";
import { MaterialCategoriesManagement } from "@/components/settings/MaterialCategoriesManagement";
import { ContractorsManagement } from "@/components/settings/ContractorsManagement";
import { CustomersManagement } from "@/components/settings/CustomersManagement";
import { DistributionStrategySettings } from "@/components/settings/DistributionStrategySettings";
import { HolidayImportDialog } from "@/components/resource-planning/HolidayImportDialog";
import { useCalendarExceptions } from "@/hooks/useResourcePlanning";
import { useTimesheetSettings } from "@/hooks/useTimesheetSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const navigate = useNavigate();
  const { data: calendarExceptions = [] } = useCalendarExceptions();
  const { settings: timesheetSettings, updateSettings: updateTimesheetSettings } = useTimesheetSettings();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("ru");
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Calculate statistics by type
  const calendarStats = useMemo(() => {
    const holidays = calendarExceptions.filter((e: any) => e.exception_type === "holiday" && !e.is_working_day).length;
    const shortenedDays = calendarExceptions.filter((e: any) => e.exception_type === "shortened_day").length;
    const extraWorkingDays = calendarExceptions.filter((e: any) => e.exception_type === "extra_working_day" || (e.exception_type === "holiday" && e.is_working_day)).length;
    return { holidays, shortenedDays, extraWorkingDays, total: calendarExceptions.length };
  }, [calendarExceptions]);

  const handleNavigateToCalendarExceptions = () => {
    navigate("/planning/resources?tab=calendar");
  };

  const handleSaveSettings = () => {
    toast.success("Настройки успешно сохранены");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Настройки системы</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Управление параметрами приложения</p>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Уведомления
              </CardTitle>
              <CardDescription>
                Настройте способы получения уведомлений о событиях системы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push-уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления в браузере
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email-уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления на почту
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timesheet Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Табель учёта времени
              </CardTitle>
              <CardDescription>
                Настройки заполнения табеля рабочего времени
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="restrict-fill-by-plan">Ограничить заполнение по плану</Label>
                  <p className="text-sm text-muted-foreground">
                    Если включено, кнопка "По плану" будет доступна только в последний день месяца
                  </p>
                </div>
                <Switch
                  id="restrict-fill-by-plan"
                  checked={timesheetSettings.restrictFillByPlanToLastDay}
                  onCheckedChange={(checked) => updateTimesheetSettings({ restrictFillByPlanToLastDay: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Distribution Strategy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Умное распределение
              </CardTitle>
              <CardDescription>
                Настройте стратегию автоматического распределения компонентов по операциям в техмаршрутах
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DistributionStrategySettings />
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Внешний вид
              </CardTitle>
              <CardDescription>
                Настройте тему оформления приложения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Темная тема</Label>
                  <p className="text-sm text-muted-foreground">
                    Использовать темное оформление интерфейса
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Язык и регион
              </CardTitle>
              <CardDescription>
                Выберите язык интерфейса и региональные настройки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Язык интерфейса</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="kk">Қазақша</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Exceptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Производственный календарь
                {calendarStats.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {calendarStats.total}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Праздники, сокращённые дни и другие календарные исключения влияют на расчёт рабочего времени
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistics by type */}
              {calendarStats.total > 0 && (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarOff className="h-4 w-4 text-rose-500" />
                    <span className="text-muted-foreground">Праздники:</span>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                      {calendarStats.holidays}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">Сокращённые:</span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                      {calendarStats.shortenedDays}
                    </Badge>
                  </div>
                  {calendarStats.extraWorkingDays > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarCheck className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Рабочие (перенос):</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                        {calendarStats.extraWorkingDays}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <Label>Календарные исключения</Label>
                  <p className="text-sm text-muted-foreground">
                    {calendarStats.total > 0 
                      ? "Управление праздниками, выходными и сокращёнными днями" 
                      : "Настройка праздников, выходных и сокращённых рабочих дней"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowImportDialog(true)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Импорт праздников РФ
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleNavigateToCalendarExceptions}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Открыть календарь
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holiday Import Dialog */}
          <HolidayImportDialog 
            open={showImportDialog} 
            onOpenChange={setShowImportDialog} 
          />

          {/* Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Клиенты
              </CardTitle>
              <CardDescription>
                Справочник клиентов для привязки к производственным заказам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomersManagement />
            </CardContent>
          </Card>

          {/* Contractors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Контрагенты
              </CardTitle>
              <CardDescription>
                Справочник организаций для внешних (аутсорсинговых) операций
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContractorsManagement />
            </CardContent>
          </Card>

          {/* Material Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Категории материалов
              </CardTitle>
              <CardDescription>
                Управление категориями для группировки материалов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialCategoriesManagement />
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Безопасность
              </CardTitle>
              <CardDescription>
                Управление настройками безопасности аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button variant="outline">
                  Изменить пароль
                </Button>
                <p className="text-sm text-muted-foreground">
                  Последнее изменение пароля: не менялся
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Сохранить настройки
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
