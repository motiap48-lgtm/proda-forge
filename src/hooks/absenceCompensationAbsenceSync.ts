import { addDays, format, parseISO, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { COMPENSABLE_ABSENCE_TYPES, type OperatorAbsence } from "@/hooks/useOperatorAbsences";

type OperatorAbsenceInsert = Omit<OperatorAbsence, "id" | "created_at" | "updated_at">;

const toDateOnly = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Cancels the absence *for one specific day*.
 * If the absence is a range, it will be split into: [before] + [cancelled day] + [after].
 */
export async function cancelCompensableAbsenceDay(params: {
  operatorId: string;
  absenceDate: string; // yyyy-MM-dd
}): Promise<{ cancelledAbsenceIds: string[]; split: number; direct: number } > {
  const { operatorId, absenceDate } = params;

  const { data, error: fetchError } = await supabase
    .from("operator_absences")
    .select("*")
    .eq("operator_id", operatorId)
    .in("absence_type", COMPENSABLE_ABSENCE_TYPES)
    .lte("start_date", absenceDate)
    .gte("end_date", absenceDate)
    .eq("status", "approved");

  if (fetchError) throw fetchError;

  const matches = (data as OperatorAbsence[]) ?? [];

  const cancelledAbsenceIds: string[] = [];
  let split = 0;
  let direct = 0;

  if (matches.length === 0) {
    return { cancelledAbsenceIds, split, direct };
  }

  const absenceDateObj = parseISO(absenceDate);
  const beforeDay = toDateOnly(subDays(absenceDateObj, 1));
  const afterDay = toDateOnly(addDays(absenceDateObj, 1));

  for (const absence of matches) {
    // Single-day record: just cancel
    if (absence.start_date === absenceDate && absence.end_date === absenceDate) {
      const { data: updatedRows, error: updateError } = await supabase
        .from("operator_absences")
        .update({ status: "cancelled" })
        .eq("id", absence.id)
        .select("id");

      if (updateError) throw updateError;
      if (updatedRows && updatedRows.length > 0) {
        cancelledAbsenceIds.push(absence.id);
        direct += 1;
      }
      continue;
    }

    // Range record: split into before/after and turn original into cancelled single-day
    const inserts: OperatorAbsenceInsert[] = [];

    if (absence.start_date < absenceDate) {
      inserts.push({
        operator_id: absence.operator_id,
        absence_type: absence.absence_type,
        start_date: absence.start_date,
        end_date: beforeDay,
        status: absence.status,
        notes: absence.notes,
        created_by: absence.created_by,
      });
    }

    if (absence.end_date > absenceDate) {
      inserts.push({
        operator_id: absence.operator_id,
        absence_type: absence.absence_type,
        start_date: afterDay,
        end_date: absence.end_date,
        status: absence.status,
        notes: absence.notes,
        created_by: absence.created_by,
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("operator_absences").insert(inserts);
      if (insertError) throw insertError;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from("operator_absences")
      .update({ start_date: absenceDate, end_date: absenceDate, status: "cancelled" })
      .eq("id", absence.id)
      .select("id");

    if (updateError) throw updateError;
    if (updatedRows && updatedRows.length > 0) {
      cancelledAbsenceIds.push(absence.id);
      split += 1;
    }
  }

  return { cancelledAbsenceIds, split, direct };
}

export async function restoreCompensableAbsenceDay(params: {
  operatorId: string;
  absenceDate: string; // yyyy-MM-dd
}): Promise<{ restored: number } > {
  const { operatorId, absenceDate } = params;

  const { data, error } = await supabase
    .from("operator_absences")
    .update({ status: "approved" })
    .eq("operator_id", operatorId)
    .in("absence_type", COMPENSABLE_ABSENCE_TYPES)
    .eq("start_date", absenceDate)
    .eq("end_date", absenceDate)
    .eq("status", "cancelled")
    .select("id");

  if (error) throw error;
  return { restored: data?.length ?? 0 };
}
