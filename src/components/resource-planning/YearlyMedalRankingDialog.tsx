import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award } from "lucide-react";
import { useYearlyMedalSummary } from "@/hooks/useOvertimeMedals";

interface YearlyMedalRankingDialogProps {
  trigger?: React.ReactNode;
}

export const YearlyMedalRankingDialog = ({ trigger }: YearlyMedalRankingDialogProps) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: rankings = [], isLoading } = useYearlyMedalSummary(selectedYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-medium">{index + 1}</span>;
    }
  };

  const getMedalEmoji = (type: string) => {
    switch (type) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Trophy className="h-4 w-4" />
            Рейтинг года
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Годовой рейтинг медалей за переработки
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Год:</span>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных о медалях за {selectedYear} год
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Место</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Сотрудник</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">🥇</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">🥈</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">🥉</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">Всего</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking, index) => (
                    <tr 
                      key={ranking.operatorId} 
                      className={`border-t ${index < 3 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {getMedalIcon(index)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{ranking.operatorName}</td>
                      <td className="px-4 py-3 text-center">{ranking.goldCount || '-'}</td>
                      <td className="px-4 py-3 text-center">{ranking.silverCount || '-'}</td>
                      <td className="px-4 py-3 text-center">{ranking.bronzeCount || '-'}</td>
                      <td className="px-4 py-3 text-center font-medium">{ranking.goldCount + ranking.silverCount + ranking.bronzeCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">{ranking.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Система начисления очков: 🥇 = 3 очка, 🥈 = 2 очка, 🥉 = 1 очко</p>
            <p>Рейтинг формируется на основе ежемесячных медалей за переработки</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
