import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  date: string;
  changes: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ChangelogFormData {
  version: string;
  title: string;
  date: string;
  changes: string[];
  is_published: boolean;
}

// Default changelog entries for initial seeding
const defaultChangelog: Omit<ChangelogEntry, 'id' | 'created_at' | 'updated_at' | 'created_by'>[] = [
  {
    version: "0.9.5",
    title: "Улучшения страницы функциональности",
    date: "2025-12-25",
    changes: [
      "Добавлена возможность отмечать функции как избранные",
      "Реализован поиск по функциям",
      "Добавлена фильтрация по статусу",
      "Добавлен changelog - история изменений системы"
    ],
    is_published: true
  },
  {
    version: "0.9.4",
    title: "Мобильная адаптация календаря",
    date: "2025-12-24",
    changes: [
      "Исправлено отображение календаря ротации на мобильных устройствах",
      "Оптимизирована ширина колонок для маленьких экранов",
      "Улучшена компактность отображения данных"
    ],
    is_published: true
  },
  {
    version: "0.9.3",
    title: "Beta-режим и страница функциональности",
    date: "2025-12-23",
    changes: [
      "Добавлен индикатор Beta версии рядом с логотипом",
      "Создана страница отслеживания функциональности",
      "Добавлены настройки Beta-режима"
    ],
    is_published: true
  },
  {
    version: "0.9.2",
    title: "Улучшения ресурсного планирования",
    date: "2025-12-20",
    changes: [
      "Добавлена поддержка drag-and-drop для отсутствий",
      "Реализовано выделение диапазона дат",
      "Улучшена синхронизация скролла в календаре",
      "Добавлена кнопка 'Сегодня' для быстрой навигации"
    ],
    is_published: true
  },
  {
    version: "0.9.1",
    title: "Компенсации и табель",
    date: "2025-12-15",
    changes: [
      "Добавлен модуль компенсаций отсутствий",
      "Реализован расширенный табель рабочего времени",
      "Добавлены отчёты по часам операторов"
    ],
    is_published: true
  },
  {
    version: "0.9.0",
    title: "Графики и бригады",
    date: "2025-12-10",
    changes: [
      "Реализовано управление рабочими графиками",
      "Добавлена поддержка сменных графиков",
      "Создан модуль управления бригадами",
      "Добавлен календарь ротации смен"
    ],
    is_published: true
  },
  {
    version: "0.8.5",
    title: "Отчёты производства",
    date: "2025-12-05",
    changes: [
      "Добавлен план-факт отчёт по участкам",
      "Реализован отчёт по клиентам",
      "Добавлен экспорт отчётов в Excel",
      "Улучшены печатные формы"
    ],
    is_published: true
  }
];

// Get latest version from changelog
export const getLatestVersion = (changelog: ChangelogEntry[]): string => {
  if (!changelog || changelog.length === 0) return "0.9.5";
  return changelog[0]?.version || "0.9.5";
};

export type VersionIncrementType = 'patch' | 'minor' | 'major';

// Calculate next version automatically based on increment type
export const getNextVersion = (currentVersion: string, incrementType: VersionIncrementType = 'patch'): string => {
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return "0.9.6";
  }
  
  switch (incrementType) {
    case 'major':
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1] += 1;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2] += 1;
      break;
  }
  
  return parts.join('.');
};

export const useChangelog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: changelog = [], isLoading, refetch } = useQuery({
    queryKey: ["changelog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("changelog_entries")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching changelog:", error);
        return defaultChangelog.map((c, i) => ({ 
          ...c, 
          id: `default-${i}`, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null
        })) as ChangelogEntry[];
      }

      // If no entries in DB, return defaults
      if (!data || data.length === 0) {
        return defaultChangelog.map((c, i) => ({ 
          ...c, 
          id: `default-${i}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null
        })) as ChangelogEntry[];
      }

      return data as ChangelogEntry[];
    }
  });

  const createEntry = useMutation({
    mutationFn: async (data: ChangelogFormData) => {
      const { error } = await supabase
        .from("changelog_entries")
        .insert({
          version: data.version,
          title: data.title,
          date: data.date,
          changes: data.changes,
          is_published: data.is_published,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      queryClient.invalidateQueries({ queryKey: ["unseen-changelog"] });
      toast.success("Запись добавлена");
    },
    onError: (error) => {
      console.error("Error creating changelog entry:", error);
      toast.error("Ошибка при создании записи");
    }
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChangelogFormData }) => {
      const { error } = await supabase
        .from("changelog_entries")
        .update({
          version: data.version,
          title: data.title,
          date: data.date,
          changes: data.changes,
          is_published: data.is_published
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      toast.success("Запись обновлена");
    },
    onError: (error) => {
      console.error("Error updating changelog entry:", error);
      toast.error("Ошибка при обновлении записи");
    }
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("changelog_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      toast.success("Запись удалена");
    },
    onError: (error) => {
      console.error("Error deleting changelog entry:", error);
      toast.error("Ошибка при удалении записи");
    }
  });

  const seedDefaultEntries = useMutation({
    mutationFn: async () => {
      const entries = defaultChangelog.map(c => ({
        ...c,
        created_by: user?.id
      }));

      const { error } = await supabase
        .from("changelog_entries")
        .insert(entries);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      toast.success("Записи по умолчанию добавлены");
    },
    onError: (error) => {
      console.error("Error seeding default entries:", error);
      toast.error("Ошибка при добавлении записей");
    }
  });

  return {
    changelog,
    isLoading,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    seedDefaultEntries,
    isFromDatabase: changelog.length > 0 && !changelog[0]?.id?.startsWith('default-')
  };
};

export interface ChangelogViewStats {
  changelog_id: string;
  version: string;
  title: string;
  total_views: number;
  unique_viewers: number;
}

export const useUnseenChangelog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unseenEntries = [], isLoading } = useQuery({
    queryKey: ["unseen-changelog", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all published changelog entries
      const { data: allEntries, error: entriesError } = await supabase
        .from("changelog_entries")
        .select("*")
        .eq("is_published", true)
        .order("date", { ascending: false });

      if (entriesError || !allEntries) return [];

      // Get user's seen entries
      const { data: seenEntries, error: seenError } = await supabase
        .from("user_seen_changelog")
        .select("changelog_id")
        .eq("user_id", user.id);

      if (seenError) return allEntries as ChangelogEntry[];

      const seenIds = new Set(seenEntries?.map(s => s.changelog_id) || []);
      return allEntries.filter(e => !seenIds.has(e.id)) as ChangelogEntry[];
    },
    enabled: !!user?.id
  });

  const markAsSeen = useMutation({
    mutationFn: async (changelogIds: string[]) => {
      if (!user?.id || changelogIds.length === 0) return;

      const entries = changelogIds.map(changelog_id => ({
        user_id: user.id,
        changelog_id
      }));

      const { error } = await supabase
        .from("user_seen_changelog")
        .upsert(entries, { onConflict: "user_id,changelog_id" });

      if (error) throw error;
    }
  });

  // Track changelog view for analytics
  const trackView = useMutation({
    mutationFn: async ({ changelogId, source = 'dialog' }: { changelogId: string; source?: string }) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("changelog_views")
        .insert({
          changelog_id: changelogId,
          user_id: user.id,
          view_source: source
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog-view-stats"] });
    }
  });

  return {
    unseenEntries,
    isLoading,
    markAsSeen,
    trackView,
    hasUnseenUpdates: unseenEntries.length > 0
  };
};

// Hook for changelog view analytics
export const useChangelogViewStats = () => {
  const { data: viewStats = [], isLoading } = useQuery({
    queryKey: ["changelog-view-stats"],
    queryFn: async () => {
      // Get all views with changelog info
      const { data: views, error: viewsError } = await supabase
        .from("changelog_views")
        .select("changelog_id, user_id");

      if (viewsError || !views) return [];

      // Get changelog entries
      const { data: entries, error: entriesError } = await supabase
        .from("changelog_entries")
        .select("id, version, title")
        .order("date", { ascending: false });

      if (entriesError || !entries) return [];

      // Calculate stats
      const stats: ChangelogViewStats[] = entries.map(entry => {
        const entryViews = views.filter(v => v.changelog_id === entry.id);
        const uniqueViewers = new Set(entryViews.map(v => v.user_id)).size;
        
        return {
          changelog_id: entry.id,
          version: entry.version,
          title: entry.title,
          total_views: entryViews.length,
          unique_viewers: uniqueViewers
        };
      });

      return stats;
    }
  });

  return {
    viewStats,
    isLoading
  };
};
