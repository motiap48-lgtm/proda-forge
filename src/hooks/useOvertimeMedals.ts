import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, getMonth, getYear } from 'date-fns';

export interface OvertimeMedalSettings {
  id: string;
  is_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface MonthlyMedal {
  id: string;
  operator_id: string;
  year: number;
  month: number;
  medal_type: 'gold' | 'silver' | 'bronze';
  total_overtime_minutes: number;
  created_at: string;
}

export interface OperatorOvertimeRanking {
  operatorId: string;
  operatorName: string;
  totalMinutes: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

export interface YearlyMedalCount {
  operatorId: string;
  operatorName: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  totalPoints: number; // gold=3, silver=2, bronze=1
}

// Hook to get medal settings
export function useOvertimeMedalSettings() {
  return useQuery({
    queryKey: ['overtime-medal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overtime_medals_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as OvertimeMedalSettings;
    },
  });
}

// Hook to update medal settings
export function useUpdateOvertimeMedalSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('overtime_medals_settings')
        .update({ 
          is_enabled: isEnabled, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-medal-settings'] });
    },
  });
}

// Hook to calculate current month rankings
export function useCurrentOvertimeRankings(year: number, month: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['overtime-rankings', year, month],
    queryFn: async () => {
      // Get first and last day of the month
      const startDate = new Date(year, month, 1);
      const endDate = endOfMonth(startDate);

      // Fetch all approved overtime entries for the month
      const { data: overtimeEntries, error: overtimeError } = await supabase
        .from('overtime_entries')
        .select(`
          id,
          operator_id,
          duration_minutes,
          work_date,
          status
        `)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'approved');

      if (overtimeError) throw overtimeError;

      // Fetch operators for names
      const { data: operators, error: operatorsError } = await supabase
        .from('operators')
        .select('id, full_name, is_active')
        .eq('is_active', true);

      if (operatorsError) throw operatorsError;

      // Calculate totals per operator
      const operatorTotals: Record<string, number> = {};
      
      (overtimeEntries || []).forEach(entry => {
        if (entry.operator_id && entry.duration_minutes) {
          operatorTotals[entry.operator_id] = 
            (operatorTotals[entry.operator_id] || 0) + entry.duration_minutes;
        }
      });

      // Create ranking array
      const rankings: OperatorOvertimeRanking[] = Object.entries(operatorTotals)
        .map(([operatorId, totalMinutes]) => {
          const operator = operators?.find(o => o.id === operatorId);
          return {
            operatorId,
            operatorName: operator?.full_name || 'Неизвестно',
            totalMinutes,
            medal: null as 'gold' | 'silver' | 'bronze' | null,
          };
        })
        .filter(r => r.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      // Assign medals to top 3
      if (rankings.length >= 1) rankings[0].medal = 'gold';
      if (rankings.length >= 2) rankings[1].medal = 'silver';
      if (rankings.length >= 3) rankings[2].medal = 'bronze';

      return rankings;
    },
    enabled,
  });
}

// Hook to get yearly medal summary
export function useYearlyMedalSummary(year: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['yearly-medal-summary', year],
    queryFn: async () => {
      const { data: medals, error } = await supabase
        .from('overtime_monthly_medals')
        .select(`
          id,
          operator_id,
          year,
          month,
          medal_type,
          total_overtime_minutes
        `)
        .eq('year', year);

      if (error) throw error;

      // Fetch operators
      const { data: operators, error: operatorsError } = await supabase
        .from('operators')
        .select('id, full_name');

      if (operatorsError) throw operatorsError;

      // Calculate yearly counts
      const operatorCounts: Record<string, YearlyMedalCount> = {};

      (medals || []).forEach(medal => {
        if (!operatorCounts[medal.operator_id]) {
          const operator = operators?.find(o => o.id === medal.operator_id);
          operatorCounts[medal.operator_id] = {
            operatorId: medal.operator_id,
            operatorName: operator?.full_name || 'Неизвестно',
            goldCount: 0,
            silverCount: 0,
            bronzeCount: 0,
            totalPoints: 0,
          };
        }

        if (medal.medal_type === 'gold') {
          operatorCounts[medal.operator_id].goldCount++;
          operatorCounts[medal.operator_id].totalPoints += 3;
        } else if (medal.medal_type === 'silver') {
          operatorCounts[medal.operator_id].silverCount++;
          operatorCounts[medal.operator_id].totalPoints += 2;
        } else if (medal.medal_type === 'bronze') {
          operatorCounts[medal.operator_id].bronzeCount++;
          operatorCounts[medal.operator_id].totalPoints += 1;
        }
      });

      return Object.values(operatorCounts).sort((a, b) => b.totalPoints - a.totalPoints);
    },
    enabled,
  });
}

// Hook to save monthly medals (for month end finalization)
export function useSaveMonthlyMedals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month, rankings }: { 
      year: number; 
      month: number; 
      rankings: OperatorOvertimeRanking[] 
    }) => {
      // Delete existing medals for this month
      await supabase
        .from('overtime_monthly_medals')
        .delete()
        .eq('year', year)
        .eq('month', month);

      // Insert new medals for top 3
      const medalsToInsert = rankings
        .filter(r => r.medal)
        .map(r => ({
          operator_id: r.operatorId,
          year,
          month,
          medal_type: r.medal!,
          total_overtime_minutes: r.totalMinutes,
        }));

      if (medalsToInsert.length > 0) {
        const { error } = await supabase
          .from('overtime_monthly_medals')
          .insert(medalsToInsert);

        if (error) throw error;
      }

      return medalsToInsert;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['overtime-rankings', variables.year, variables.month] });
      queryClient.invalidateQueries({ queryKey: ['yearly-medal-summary', variables.year] });
    },
  });
}

// Helper to get medal for a specific operator
export function getOperatorMedal(
  rankings: OperatorOvertimeRanking[] | undefined,
  operatorId: string
): 'gold' | 'silver' | 'bronze' | null {
  if (!rankings) return null;
  const ranking = rankings.find(r => r.operatorId === operatorId);
  return ranking?.medal || null;
}
