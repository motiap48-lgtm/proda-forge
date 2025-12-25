import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  Warehouse, 
  BarChart3, 
  FileText, 
  GitBranch, 
  Factory, 
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  Shield,
  Bell,
  ClipboardList,
  Sparkles,
  Building2,
  Tag,
  UserCircle,
  CalendarDays,
  ListChecks,
  Layers,
  ArrowRightLeft
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type FeatureStatus = "done" | "in-progress" | "planned";

interface Feature {
  name: string;
  description: string;
  status: FeatureStatus;
}

interface FeatureModule {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  features: Feature[];
}

const featureModules: FeatureModule[] = [
  {
    name: "Дашборд",
    icon: LayoutDashboard,
    path: "/",
    features: [
      { name: "Метрики производства", description: "Общая статистика по заказам и выполнению", status: "done" },
      { name: "Фильтрация по периоду", description: "Выбор периода для отображения данных", status: "done" },
      { name: "Группировка заказов", description: "Отображение заказов по статусам и клиентам", status: "done" },
      { name: "Быстрый просмотр операций", description: "Просмотр активных операций производства", status: "done" },
    ]
  },
  {
    name: "Производственные заказы",
    icon: Package,
    path: "/production-orders",
    features: [
      { name: "Список заказов", description: "Таблица всех производственных заказов с фильтрацией", status: "done" },
      { name: "Создание заказа", description: "Форма создания нового производственного заказа", status: "done" },
      { name: "Редактирование заказа", description: "Изменение параметров существующего заказа", status: "done" },
      { name: "Детали заказа", description: "Полная информация о заказе с операциями", status: "done" },
      { name: "История изменений", description: "Журнал всех изменений заказа", status: "done" },
      { name: "Иерархия заказов", description: "Связи родительских и дочерних заказов", status: "done" },
      { name: "Привязка клиентов", description: "Назначение клиента на заказ", status: "done" },
      { name: "Массовое завершение операций", description: "Групповое завершение нескольких операций", status: "done" },
      { name: "Выпуск продукции", description: "Фиксация фактического выпуска по операциям", status: "done" },
    ]
  },
  {
    name: "MRP Планирование",
    icon: Calendar,
    path: "/planning/mrp",
    features: [
      { name: "Расчёт потребностей", description: "Автоматический расчёт потребностей в материалах", status: "done" },
      { name: "История расчётов", description: "Журнал всех выполненных MRP расчётов", status: "done" },
      { name: "Экспорт в Excel", description: "Выгрузка результатов планирования", status: "done" },
      { name: "Печать отчёта", description: "Формирование печатной формы MRP", status: "done" },
    ]
  },
  {
    name: "Ресурсы и ССЗ",
    icon: Users,
    path: "/planning/resources",
    features: [
      { name: "Управление операторами", description: "Справочник сотрудников производства", status: "done" },
      { name: "Бригады", description: "Формирование и управление бригадами", status: "done" },
      { name: "Графики работы", description: "Настройка сменных графиков и режимов", status: "done" },
      { name: "Ротация смен", description: "Календарь ротации с визуализацией графиков", status: "done" },
      { name: "Исключения календаря", description: "Праздники, сокращённые и рабочие дни", status: "done" },
      { name: "Учёт отсутствий", description: "Отпуска, больничные и другие отсутствия", status: "done" },
      { name: "Табель рабочего времени", description: "Заполнение и редактирование табеля", status: "done" },
      { name: "Компенсации отсутствий", description: "Учёт отработки пропущенных дней", status: "done" },
      { name: "Сменные задания", description: "Планирование заданий на смену", status: "done" },
      { name: "Экспорт и печать", description: "Выгрузка данных операторов и табелей", status: "done" },
      { name: "Диаграмма Ганта", description: "Визуализация загрузки ресурсов", status: "in-progress" },
    ]
  },
  {
    name: "Номенклатура",
    icon: Package,
    path: "/references/products",
    features: [
      { name: "Справочник продукции", description: "Каталог всех изделий и материалов", status: "done" },
      { name: "Типы номенклатуры", description: "Готовая продукция, ПФ, материалы", status: "done" },
      { name: "Дерево изделия", description: "Иерархическая структура состава", status: "done" },
      { name: "Поиск и фильтрация", description: "Быстрый поиск по коду и названию", status: "done" },
    ]
  },
  {
    name: "Спецификации",
    icon: FileText,
    path: "/references/specifications",
    features: [
      { name: "Справочник спецификаций", description: "Состав изделий с нормами расхода", status: "done" },
      { name: "Развёрнутая спецификация", description: "Полный состав с учётом вложенности", status: "done" },
      { name: "Версионность", description: "Управление версиями спецификаций", status: "done" },
      { name: "История изменений", description: "Журнал изменений спецификаций", status: "done" },
    ]
  },
  {
    name: "Техмаршруты",
    icon: GitBranch,
    path: "/references/routing-sheets",
    features: [
      { name: "Справочник маршрутов", description: "Технологические карты производства", status: "done" },
      { name: "Операции маршрута", description: "Последовательность технологических операций", status: "done" },
      { name: "Стандартные операции", description: "Библиотека типовых операций", status: "done" },
      { name: "Привязка материалов", description: "Материалы для каждой операции", status: "done" },
      { name: "Умное распределение", description: "Автоматическое распределение компонентов", status: "done" },
      { name: "Консолидированный маршрут", description: "Объединённый маршрут для изделия", status: "done" },
      { name: "Внешние операции", description: "Операции на аутсорсинге", status: "done" },
      { name: "Диаграмма маршрута", description: "Визуализация потока операций", status: "done" },
      { name: "Печать маршрутной карты", description: "Формирование печатной формы", status: "done" },
    ]
  },
  {
    name: "Производственные участки",
    icon: Factory,
    path: "/references/work-centers",
    features: [
      { name: "Справочник участков", description: "Рабочие центры производства", status: "done" },
      { name: "Оборудование", description: "Перечень оборудования на участках", status: "done" },
      { name: "Графики работы участков", description: "Привязка сменных графиков", status: "done" },
      { name: "Параметры мощности", description: "Эффективность и пропускная способность", status: "done" },
    ]
  },
  {
    name: "Склад - Остатки",
    icon: Warehouse,
    path: "/warehouse/inventory",
    features: [
      { name: "Текущие остатки", description: "Актуальные количества на складах", status: "done" },
      { name: "Свободный остаток", description: "Остаток за вычетом резервов", status: "done" },
      { name: "Множественные склады", description: "Учёт по разным складам", status: "done" },
    ]
  },
  {
    name: "Склад - Резервирование",
    icon: ArrowRightLeft,
    path: "/warehouse/reservations",
    features: [
      { name: "Список резервов", description: "Зарезервированные материалы под заказы", status: "done" },
      { name: "Автоматическое резервирование", description: "Резерв при создании заказа", status: "done" },
      { name: "Статусы резервов", description: "Активные, частично выданные, закрытые", status: "done" },
    ]
  },
  {
    name: "Склад - Выдача материалов",
    icon: ClipboardList,
    path: "/warehouse/issues",
    features: [
      { name: "Требования на выдачу", description: "Документы на отпуск материалов", status: "done" },
      { name: "Связь с заказами", description: "Привязка к производственным заказам", status: "done" },
      { name: "Статусы выдачи", description: "Ожидание, выдано, отменено", status: "done" },
    ]
  },
  {
    name: "Отчёты производства",
    icon: BarChart3,
    path: "/analytics/production-reports",
    features: [
      { name: "План-факт по участкам", description: "Сравнение плана и факта по рабочим центрам", status: "done" },
      { name: "План-факт по заказам", description: "Анализ выполнения заказов", status: "done" },
      { name: "Агрегированный отчёт", description: "Сводный план-факт анализ", status: "done" },
      { name: "Отчёт по клиентам", description: "Статистика по заказчикам", status: "done" },
      { name: "Отчёт по операциям", description: "Детальный анализ операций", status: "done" },
      { name: "Просроченные заказы", description: "Анализ отставания от сроков", status: "done" },
      { name: "Выпуск продукции", description: "Отчёт о произведённой продукции", status: "done" },
      { name: "Отчёт по участкам", description: "Загрузка производственных участков", status: "done" },
      { name: "Операции по изделиям", description: "Анализ операций в разрезе номенклатуры", status: "done" },
      { name: "Экспорт в Excel", description: "Выгрузка всех отчётов", status: "done" },
      { name: "Печать отчётов", description: "Формирование печатных форм", status: "done" },
      { name: "Временная аналитика", description: "Анализ трендов и динамики", status: "done" },
    ]
  },
  {
    name: "Пользователи",
    icon: Shield,
    path: "/user-management",
    features: [
      { name: "Управление пользователями", description: "Список и редактирование пользователей", status: "done" },
      { name: "Роли и права", description: "Назначение ролей доступа", status: "done" },
      { name: "Удаление пользователей", description: "Безопасное удаление аккаунтов", status: "done" },
    ]
  },
  {
    name: "Настройки",
    icon: Settings,
    path: "/settings",
    features: [
      { name: "Уведомления", description: "Настройка push и email уведомлений", status: "done" },
      { name: "Табель учёта времени", description: "Параметры заполнения табеля", status: "done" },
      { name: "Умное распределение", description: "Стратегия распределения компонентов", status: "done" },
      { name: "Внешний вид", description: "Тёмная/светлая тема (в разработке)", status: "in-progress" },
      { name: "Язык интерфейса", description: "Русский, English, Қазақша (в разработке)", status: "in-progress" },
      { name: "Производственный календарь", description: "Импорт праздников РФ", status: "done" },
      { name: "Справочник клиентов", description: "Управление заказчиками", status: "done" },
      { name: "Справочник контрагентов", description: "Организации для аутсорсинга", status: "done" },
      { name: "Категории материалов", description: "Группировка номенклатуры", status: "done" },
      { name: "Безопасность", description: "Смена пароля (в разработке)", status: "in-progress" },
    ]
  },
  {
    name: "Профиль",
    icon: UserCircle,
    path: "/profile",
    features: [
      { name: "Информация профиля", description: "Просмотр и редактирование данных", status: "done" },
      { name: "Аватар", description: "Загрузка изображения профиля", status: "planned" },
    ]
  },
  {
    name: "Авторизация",
    icon: Shield,
    path: "/auth",
    features: [
      { name: "Вход в систему", description: "Авторизация по email и паролю", status: "done" },
      { name: "Регистрация", description: "Создание нового аккаунта", status: "done" },
      { name: "Защищённые маршруты", description: "Ограничение доступа без авторизации", status: "done" },
      { name: "Роли пользователей", description: "Администратор, менеджер, оператор", status: "done" },
    ]
  },
  {
    name: "Уведомления",
    icon: Bell,
    features: [
      { name: "Системные уведомления", description: "Попап уведомлений в шапке", status: "done" },
      { name: "Toast уведомления", description: "Всплывающие сообщения об операциях", status: "done" },
    ]
  },
  {
    name: "Общий функционал",
    icon: Layers,
    features: [
      { name: "Адаптивный дизайн", description: "Поддержка мобильных устройств", status: "done" },
      { name: "Загрузочный экран", description: "Анимация загрузки приложения", status: "done" },
      { name: "Навигация", description: "Главное меню с подразделами", status: "done" },
      { name: "Realtime обновления", description: "Автообновление данных", status: "done" },
      { name: "Экспорт данных", description: "Выгрузка в Excel по разделам", status: "done" },
      { name: "Печать", description: "Печатные формы документов", status: "done" },
    ]
  },
];

const getStatusBadge = (status: FeatureStatus) => {
  switch (status) {
    case "done":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Готово
        </Badge>
      );
    case "in-progress":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
          <Clock className="h-3 w-3" />
          В работе
        </Badge>
      );
    case "planned":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1">
          <AlertCircle className="h-3 w-3" />
          Планируется
        </Badge>
      );
  }
};

const Features = () => {
  const totalFeatures = featureModules.reduce((acc, m) => acc + m.features.length, 0);
  const doneFeatures = featureModules.reduce(
    (acc, m) => acc + m.features.filter(f => f.status === "done").length, 
    0
  );
  const inProgressFeatures = featureModules.reduce(
    (acc, m) => acc + m.features.filter(f => f.status === "in-progress").length, 
    0
  );
  const plannedFeatures = featureModules.reduce(
    (acc, m) => acc + m.features.filter(f => f.status === "planned").length, 
    0
  );

  const progressPercent = Math.round((doneFeatures / totalFeatures) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Функциональность системы</h1>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Полный список реализованного и планируемого функционала ERP Vostok Auto
          </p>
        </div>

        {/* Summary Stats */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{totalFeatures}</div>
                <div className="text-sm text-muted-foreground">Всего функций</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{doneFeatures}</div>
                <div className="text-sm text-muted-foreground">Реализовано</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{inProgressFeatures}</div>
                <div className="text-sm text-muted-foreground">В работе</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{plannedFeatures}</div>
                <div className="text-sm text-muted-foreground">Планируется</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Прогресс разработки</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Modules */}
        <div className="grid gap-4 sm:gap-6">
          {featureModules.map((module) => {
            const Icon = module.icon;
            const moduleDone = module.features.filter(f => f.status === "done").length;
            const moduleTotal = module.features.length;
            
            return (
              <Card key={module.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {module.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {moduleDone}/{moduleTotal}
                      </Badge>
                      {module.path && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {module.path}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {module.features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-foreground truncate">
                            {feature.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {feature.description}
                          </div>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          {getStatusBadge(feature.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          <p className="mt-1">ERP Vostok Auto — система управления производством</p>
        </div>
      </main>
    </div>
  );
};

export default Features;
