import { useChangelogViewStats } from "@/hooks/useChangelog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const ChangelogViewsAnalytics = () => {
  const { viewStats, isLoading } = useChangelogViewStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            Аналитика просмотров
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalViews = viewStats.reduce((sum, s) => sum + s.total_views, 0);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
          Аналитика просмотров
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="rounded-lg border p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Всего просмотров</span>
              <span className="xs:hidden">Просмотры</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold">{totalViews}</div>
          </div>
          <div className="rounded-lg border p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Версий с просмотрами</span>
              <span className="xs:hidden">Версий</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold">{viewStats.filter(s => s.total_views > 0).length}</div>
          </div>
        </div>

        {viewStats.length > 0 ? (
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Версия</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Заголовок</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Просм.</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm hidden xs:table-cell">Уник.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewStats.map((stat) => (
                  <TableRow key={stat.changelog_id}>
                    <TableCell className="font-mono font-medium text-xs sm:text-sm">{stat.version}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs sm:text-sm hidden sm:table-cell">{stat.title}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm">{stat.total_views}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm hidden xs:table-cell">{stat.unique_viewers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
            Нет данных о просмотрах
          </div>
        )}
      </CardContent>
    </Card>
  );
};
