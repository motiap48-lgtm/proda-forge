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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Аналитика просмотров Changelog
          </CardTitle>
        </CardHeader>
        <CardContent>
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
  const totalUniqueViewers = new Set(viewStats.flatMap(s => Array(s.unique_viewers).fill(s.changelog_id))).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Аналитика просмотров Changelog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Всего просмотров
            </div>
            <div className="text-2xl font-bold">{totalViews}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Версий с просмотрами
            </div>
            <div className="text-2xl font-bold">{viewStats.filter(s => s.total_views > 0).length}</div>
          </div>
        </div>

        {viewStats.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Версия</TableHead>
                <TableHead>Заголовок</TableHead>
                <TableHead className="text-center">Просмотры</TableHead>
                <TableHead className="text-center">Уник. пользователи</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewStats.map((stat) => (
                <TableRow key={stat.changelog_id}>
                  <TableCell className="font-mono font-medium">{stat.version}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{stat.title}</TableCell>
                  <TableCell className="text-center">{stat.total_views}</TableCell>
                  <TableCell className="text-center">{stat.unique_viewers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Нет данных о просмотрах
          </div>
        )}
      </CardContent>
    </Card>
  );
};
