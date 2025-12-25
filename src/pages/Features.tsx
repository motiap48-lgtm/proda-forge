import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Layers,
  ArrowRightLeft,
  UserCircle,
  Star,
  Search,
  Filter,
  History,
  Sparkles
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type FeatureStatus = "done" | "in-progress" | "planned";

interface Feature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
}

interface FeatureModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  features: Feature[];
}

interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "2024-12-25",
    version: "0.9.5",
    title: "Улучшения страницы функциональности",
    changes: [
      "Добавлена возможность отмечать функции как избранные",
      "Реализован поиск по функциям",
      "Добавлена фильтрация по статусу",
      "Добавлен changelog - история изменений системы"
    ]
  },
  {
    date: "2024-12-24",
    version: "0.9.4",
    title: "Мобильная адаптация календаря",
    changes: [
      "Исправлено отображение календаря ротации на мобильных устройствах",
      "Оптимизирована ширина колонок для маленьких экранов",
      "Улучшена компактность отображения данных"
    ]
  },
  {
    date: "2024-12-23",
    version: "0.9.3",
    title: "Beta-режим и страница функциональности",
    changes: [
      "Добавлен индикатор Beta версии рядом с логотипом",
      "Создана страница отслеживания функциональности",
      "Добавлены настройки Beta-режима"
    ]
  },
  {
    date: "2024-12-20",
    version: "0.9.2",
    title: "Улучшения ресурсного планирования",
    changes: [
      "Добавлена поддержка drag-and-drop для отсутствий",
      "Реализовано выделение диапазона дат",
      "Улучшена синхронизация скролла в календаре",
      "Добавлена кнопка 'Сегодня' для быстрой навигации"
    ]
  },
  {
    date: "2024-12-15",
    version: "0.9.1",
    title: "Компенсации и табель",
    changes: [
      "Добавлен модуль компенсаций отсутствий",
      "Реализован расширенный табель рабочего времени",
      "Добавлены отчёты по часам операторов"
    ]
  },
  {
    date: "2024-12-10",
    version: "0.9.0",
    title: "Графики и бригады",
    changes: [
      "Реализовано управление рабочими графиками",
      "Добавлена поддержка сменных графиков",
      "Создан модуль управления бригадами",
      "Добавлен календарь ротации смен"
    ]
  },
  {
    date: "2024-12-05",
    version: "0.8.5",
    title: "Отчёты производства",
    changes: [
      "Добавлен план-факт отчёт по участкам",
      "Реализован отчёт по клиентам",
      "Добавлен экспорт отчётов в Excel",
      "Улучшены печатные формы"
    ]
  }
];

const featureModules: FeatureModule[] = [
  {
    id: "dashboard",
    name: "Дашборд",
    icon: LayoutDashboard,
    path: "/",
    features: [
      { id: "dash-1", name: "Метрики производства", description: "Общая статистика по заказам и выполнению", status: "done" },
      { id: "dash-2", name: "Фильтрация по периоду", description: "Выбор периода для отображения данных", status: "done" },
      { id: "dash-3", name: "Группировка заказов", description: "Отображение заказов по статусам и клиентам", status: "done" },
      { id: "dash-4", name: "Быстрый просмотр операций", description: "Просмотр активных операций производства", status: "done" },
    ]
  },
  {
    id: "production-orders",
    name: "Производственные заказы",
    icon: Package,
    path: "/production-orders",
    features: [
      { id: "po-1", name: "Список заказов", description: "Таблица всех производственных заказов с фильтрацией", status: "done" },
      { id: "po-2", name: "Создание заказа", description: "Форма создания нового производственного заказа", status: "done" },
      { id: "po-3", name: "Редактирование заказа", description: "Изменение параметров существующего заказа", status: "done" },
      { id: "po-4", name: "Детали заказа", description: "Полная информация о заказе с операциями", status: "done" },
      { id: "po-5", name: "История изменений", description: "Журнал всех изменений заказа", status: "done" },
      { id: "po-6", name: "Иерархия заказов", description: "Связи родительских и дочерних заказов", status: "done" },
      { id: "po-7", name: "Привязка клиентов", description: "Назначение клиента на заказ", status: "done" },
      { id: "po-8", name: "Массовое завершение операций", description: "Групповое завершение нескольких операций", status: "done" },
      { id: "po-9", name: "Выпуск продукции", description: "Фиксация фактического выпуска по операциям", status: "done" },
    ]
  },
  {
    id: "mrp",
    name: "MRP Планирование",
    icon: Calendar,
    path: "/planning/mrp",
    features: [
      { id: "mrp-1", name: "Расчёт потребностей", description: "Автоматический расчёт потребностей в материалах", status: "done" },
      { id: "mrp-2", name: "История расчётов", description: "Журнал всех выполненных MRP расчётов", status: "done" },
      { id: "mrp-3", name: "Экспорт в Excel", description: "Выгрузка результатов планирования", status: "done" },
      { id: "mrp-4", name: "Печать отчёта", description: "Формирование печатной формы MRP", status: "done" },
    ]
  },
  {
    id: "resources",
    name: "Ресурсы и ССЗ",
    icon: Users,
    path: "/planning/resources",
    features: [
      { id: "res-1", name: "Управление операторами", description: "Справочник сотрудников производства", status: "done" },
      { id: "res-2", name: "Бригады", description: "Формирование и управление бригадами", status: "done" },
      { id: "res-3", name: "Графики работы", description: "Настройка сменных графиков и режимов", status: "done" },
      { id: "res-4", name: "Ротация смен", description: "Календарь ротации с визуализацией графиков", status: "done" },
      { id: "res-5", name: "Исключения календаря", description: "Праздники, сокращённые и рабочие дни", status: "done" },
      { id: "res-6", name: "Учёт отсутствий", description: "Отпуска, больничные и другие отсутствия", status: "done" },
      { id: "res-7", name: "Табель рабочего времени", description: "Заполнение и редактирование табеля", status: "done" },
      { id: "res-8", name: "Компенсации отсутствий", description: "Учёт отработки пропущенных дней", status: "done" },
      { id: "res-9", name: "Сменные задания", description: "Планирование заданий на смену", status: "done" },
      { id: "res-10", name: "Экспорт и печать", description: "Выгрузка данных операторов и табелей", status: "done" },
      { id: "res-11", name: "Диаграмма Ганта", description: "Визуализация загрузки ресурсов", status: "in-progress" },
    ]
  },
  {
    id: "products",
    name: "Номенклатура",
    icon: Package,
    path: "/references/products",
    features: [
      { id: "prod-1", name: "Справочник продукции", description: "Каталог всех изделий и материалов", status: "done" },
      { id: "prod-2", name: "Типы номенклатуры", description: "Готовая продукция, ПФ, материалы", status: "done" },
      { id: "prod-3", name: "Дерево изделия", description: "Иерархическая структура состава", status: "done" },
      { id: "prod-4", name: "Поиск и фильтрация", description: "Быстрый поиск по коду и названию", status: "done" },
    ]
  },
  {
    id: "specifications",
    name: "Спецификации",
    icon: FileText,
    path: "/references/specifications",
    features: [
      { id: "spec-1", name: "Справочник спецификаций", description: "Состав изделий с нормами расхода", status: "done" },
      { id: "spec-2", name: "Развёрнутая спецификация", description: "Полный состав с учётом вложенности", status: "done" },
      { id: "spec-3", name: "Версионность", description: "Управление версиями спецификаций", status: "done" },
      { id: "spec-4", name: "История изменений", description: "Журнал изменений спецификаций", status: "done" },
    ]
  },
  {
    id: "routing",
    name: "Техмаршруты",
    icon: GitBranch,
    path: "/references/routing-sheets",
    features: [
      { id: "rt-1", name: "Справочник маршрутов", description: "Технологические карты производства", status: "done" },
      { id: "rt-2", name: "Операции маршрута", description: "Последовательность технологических операций", status: "done" },
      { id: "rt-3", name: "Стандартные операции", description: "Библиотека типовых операций", status: "done" },
      { id: "rt-4", name: "Привязка материалов", description: "Материалы для каждой операции", status: "done" },
      { id: "rt-5", name: "Умное распределение", description: "Автоматическое распределение компонентов", status: "done" },
      { id: "rt-6", name: "Консолидированный маршрут", description: "Объединённый маршрут для изделия", status: "done" },
      { id: "rt-7", name: "Внешние операции", description: "Операции на аутсорсинге", status: "done" },
      { id: "rt-8", name: "Диаграмма маршрута", description: "Визуализация потока операций", status: "done" },
      { id: "rt-9", name: "Печать маршрутной карты", description: "Формирование печатной формы", status: "done" },
    ]
  },
  {
    id: "work-centers",
    name: "Производственные участки",
    icon: Factory,
    path: "/references/work-centers",
    features: [
      { id: "wc-1", name: "Справочник участков", description: "Рабочие центры производства", status: "done" },
      { id: "wc-2", name: "Оборудование", description: "Перечень оборудования на участках", status: "done" },
      { id: "wc-3", name: "Графики работы участков", description: "Привязка сменных графиков", status: "done" },
      { id: "wc-4", name: "Параметры мощности", description: "Эффективность и пропускная способность", status: "done" },
    ]
  },
  {
    id: "inventory",
    name: "Склад - Остатки",
    icon: Warehouse,
    path: "/warehouse/inventory",
    features: [
      { id: "inv-1", name: "Текущие остатки", description: "Актуальные количества на складах", status: "done" },
      { id: "inv-2", name: "Свободный остаток", description: "Остаток за вычетом резервов", status: "done" },
      { id: "inv-3", name: "Множественные склады", description: "Учёт по разным складам", status: "done" },
    ]
  },
  {
    id: "reservations",
    name: "Склад - Резервирование",
    icon: ArrowRightLeft,
    path: "/warehouse/reservations",
    features: [
      { id: "rsv-1", name: "Список резервов", description: "Зарезервированные материалы под заказы", status: "done" },
      { id: "rsv-2", name: "Автоматическое резервирование", description: "Резерв при создании заказа", status: "done" },
      { id: "rsv-3", name: "Статусы резервов", description: "Активные, частично выданные, закрытые", status: "done" },
    ]
  },
  {
    id: "issues",
    name: "Склад - Выдача материалов",
    icon: ClipboardList,
    path: "/warehouse/issues",
    features: [
      { id: "iss-1", name: "Требования на выдачу", description: "Документы на отпуск материалов", status: "done" },
      { id: "iss-2", name: "Связь с заказами", description: "Привязка к производственным заказам", status: "done" },
      { id: "iss-3", name: "Статусы выдачи", description: "Ожидание, выдано, отменено", status: "done" },
    ]
  },
  {
    id: "reports",
    name: "Отчёты производства",
    icon: BarChart3,
    path: "/analytics/production-reports",
    features: [
      { id: "rpt-1", name: "План-факт по участкам", description: "Сравнение плана и факта по рабочим центрам", status: "done" },
      { id: "rpt-2", name: "План-факт по заказам", description: "Анализ выполнения заказов", status: "done" },
      { id: "rpt-3", name: "Агрегированный отчёт", description: "Сводный план-факт анализ", status: "done" },
      { id: "rpt-4", name: "Отчёт по клиентам", description: "Статистика по заказчикам", status: "done" },
      { id: "rpt-5", name: "Отчёт по операциям", description: "Детальный анализ операций", status: "done" },
      { id: "rpt-6", name: "Просроченные заказы", description: "Анализ отставания от сроков", status: "done" },
      { id: "rpt-7", name: "Выпуск продукции", description: "Отчёт о произведённой продукции", status: "done" },
      { id: "rpt-8", name: "Отчёт по участкам", description: "Загрузка производственных участков", status: "done" },
      { id: "rpt-9", name: "Операции по изделиям", description: "Анализ операций в разрезе номенклатуры", status: "done" },
      { id: "rpt-10", name: "Экспорт в Excel", description: "Выгрузка всех отчётов", status: "done" },
      { id: "rpt-11", name: "Печать отчётов", description: "Формирование печатных форм", status: "done" },
      { id: "rpt-12", name: "Временная аналитика", description: "Анализ трендов и динамики", status: "done" },
    ]
  },
  {
    id: "users",
    name: "Пользователи",
    icon: Shield,
    path: "/user-management",
    features: [
      { id: "usr-1", name: "Управление пользователями", description: "Список и редактирование пользователей", status: "done" },
      { id: "usr-2", name: "Роли и права", description: "Назначение ролей доступа", status: "done" },
      { id: "usr-3", name: "Удаление пользователей", description: "Безопасное удаление аккаунтов", status: "done" },
    ]
  },
  {
    id: "settings",
    name: "Настройки",
    icon: Settings,
    path: "/settings",
    features: [
      { id: "set-1", name: "Уведомления", description: "Настройка push и email уведомлений", status: "done" },
      { id: "set-2", name: "Табель учёта времени", description: "Параметры заполнения табеля", status: "done" },
      { id: "set-3", name: "Умное распределение", description: "Стратегия распределения компонентов", status: "done" },
      { id: "set-4", name: "Внешний вид", description: "Тёмная/светлая тема (в разработке)", status: "in-progress" },
      { id: "set-5", name: "Язык интерфейса", description: "Русский, English, Қазақша (в разработке)", status: "in-progress" },
      { id: "set-6", name: "Производственный календарь", description: "Импорт праздников РФ", status: "done" },
      { id: "set-7", name: "Справочник клиентов", description: "Управление заказчиками", status: "done" },
      { id: "set-8", name: "Справочник контрагентов", description: "Организации для аутсорсинга", status: "done" },
      { id: "set-9", name: "Категории материалов", description: "Группировка номенклатуры", status: "done" },
      { id: "set-10", name: "Безопасность", description: "Смена пароля (в разработке)", status: "in-progress" },
    ]
  },
  {
    id: "profile",
    name: "Профиль",
    icon: UserCircle,
    path: "/profile",
    features: [
      { id: "prf-1", name: "Информация профиля", description: "Просмотр и редактирование данных", status: "done" },
      { id: "prf-2", name: "Аватар", description: "Загрузка изображения профиля", status: "planned" },
    ]
  },
  {
    id: "auth",
    name: "Авторизация",
    icon: Shield,
    path: "/auth",
    features: [
      { id: "auth-1", name: "Вход в систему", description: "Авторизация по email и паролю", status: "done" },
      { id: "auth-2", name: "Регистрация", description: "Создание нового аккаунта", status: "done" },
      { id: "auth-3", name: "Защищённые маршруты", description: "Ограничение доступа без авторизации", status: "done" },
      { id: "auth-4", name: "Роли пользователей", description: "Администратор, менеджер, оператор", status: "done" },
    ]
  },
  {
    id: "notifications",
    name: "Уведомления",
    icon: Bell,
    features: [
      { id: "ntf-1", name: "Системные уведомления", description: "Попап уведомлений в шапке", status: "done" },
      { id: "ntf-2", name: "Toast уведомления", description: "Всплывающие сообщения об операциях", status: "done" },
    ]
  },
  {
    id: "general",
    name: "Общий функционал",
    icon: Layers,
    features: [
      { id: "gen-1", name: "Адаптивный дизайн", description: "Поддержка мобильных устройств", status: "done" },
      { id: "gen-2", name: "Загрузочный экран", description: "Анимация загрузки приложения", status: "done" },
      { id: "gen-3", name: "Навигация", description: "Главное меню с подразделами", status: "done" },
      { id: "gen-4", name: "Realtime обновления", description: "Автообновление данных", status: "done" },
      { id: "gen-5", name: "Экспорт данных", description: "Выгрузка в Excel по разделам", status: "done" },
      { id: "gen-6", name: "Печать", description: "Печатные формы документов", status: "done" },
    ]
  },
];

const FAVORITES_KEY = 'eva-feature-favorites';

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
  const [activeTab, setActiveTab] = useState("features");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (featureId: string) => {
    setFavorites(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

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

  // Filter features based on search and status
  const filteredModules = featureModules.map(module => ({
    ...module,
    features: module.features.filter(feature => {
      const matchesSearch = searchQuery === "" || 
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || feature.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  })).filter(module => module.features.length > 0);

  // Get favorite features
  const favoriteFeatures = featureModules.flatMap(module => 
    module.features
      .filter(f => favorites.includes(f.id))
      .map(f => ({ ...f, moduleName: module.name, moduleIcon: module.icon }))
  );

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="features" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Функции</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Избранное</span>
              {favorites.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                  {favorites.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="changelog" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-4">
            {/* Summary Stats */}
            <Card>
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
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по функциям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeatureStatus | "all")}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Фильтр по статусу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="done">Готово</SelectItem>
                  <SelectItem value="in-progress">В работе</SelectItem>
                  <SelectItem value="planned">Планируется</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feature Modules */}
            <div className="grid gap-4 sm:gap-6">
              {filteredModules.map((module) => {
                const Icon = module.icon;
                const moduleDone = module.features.filter(f => f.status === "done").length;
                const moduleTotal = module.features.length;
                
                return (
                  <Card key={module.id}>
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
                        {module.features.map((feature) => (
                          <div 
                            key={feature.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => toggleFavorite(feature.id)}
                              >
                                <Star 
                                  className={`h-4 w-4 ${favorites.includes(feature.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                                />
                              </Button>
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-foreground truncate">
                                  {feature.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {feature.description}
                                </div>
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

            {filteredModules.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Ничего не найдено</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Попробуйте изменить поисковый запрос или фильтр
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {favoriteFeatures.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    Избранные функции ({favoriteFeatures.length})
                  </CardTitle>
                  <CardDescription>
                    Быстрый доступ к отмеченным функциям
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {favoriteFeatures.map((feature) => {
                      const Icon = feature.moduleIcon;
                      return (
                        <div 
                          key={feature.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={() => toggleFavorite(feature.id)}
                            >
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </Button>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {feature.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {feature.moduleName}
                              </div>
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {getStatusBadge(feature.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Нет избранных функций</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Нажмите на звёздочку рядом с функцией, чтобы добавить её в избранное
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="changelog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  История изменений
                </CardTitle>
                <CardDescription>
                  Журнал обновлений и изменений системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {changelog.map((entry, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                v{entry.version}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(entry.date).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground">{entry.title}</h3>
                            <ul className="space-y-1">
                              {entry.changes.map((change, changeIdx) => (
                                <li key={changeIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {change}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          <p className="mt-1">ERP Vostok Auto — система управления производством</p>
        </div>
      </main>
    </div>
  );
};

export default Features;
