import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";
import { useActiveCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";

export type GroupBy = "none" | "customer" | "product" | "deadline" | "priority";
export type DateFilter = "all" | "overdue" | "today" | "week" | "month";

interface DashboardFiltersProps {
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const DashboardFilters = ({
  groupBy,
  onGroupByChange,
  dateFilter,
  onDateFilterChange,
  customerFilter,
  onCustomerFilterChange,
  productFilter,
  onProductFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  hasActiveFilters,
}: DashboardFiltersProps) => {
  const { data: customers } = useActiveCustomers();
  const { data: products } = useProducts();

  const finishedProducts = products?.filter((p) => p.product_type === "finished");

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Фильтры и группировка</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters}>
            <X className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Группировка</label>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без группировки</SelectItem>
              <SelectItem value="customer">По клиентам</SelectItem>
              <SelectItem value="product">По изделиям</SelectItem>
              <SelectItem value="deadline">По срокам</SelectItem>
              <SelectItem value="priority">По приоритету</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Срок</label>
          <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сроки</SelectItem>
              <SelectItem value="overdue">Просроченные</SelectItem>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">7 дней</SelectItem>
              <SelectItem value="month">30 дней</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Клиент</label>
          <Select value={customerFilter} onValueChange={onCustomerFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все клиенты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все клиенты</SelectItem>
              <SelectItem value="none">Без клиента</SelectItem>
              {customers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Изделие (ГП)</label>
          <Select value={productFilter} onValueChange={onProductFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все изделия" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все изделия</SelectItem>
              {finishedProducts?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Приоритет</label>
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="high">Высокий</SelectItem>
              <SelectItem value="normal">Обычный</SelectItem>
              <SelectItem value="low">Низкий</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Статус</label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все активные</SelectItem>
              <SelectItem value="planned">Запланировано</SelectItem>
              <SelectItem value="released">Запущен</SelectItem>
              <SelectItem value="in_progress">В производстве</SelectItem>
              <SelectItem value="on_hold">Приостановлен</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
