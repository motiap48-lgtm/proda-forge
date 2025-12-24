import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting compensation status update check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Get all non-completed/cancelled absence_compensations with their records
    const { data: compensations, error: fetchError } = await supabase
      .from("absence_compensations")
      .select(`
        id,
        operator_id,
        absence_date,
        absence_hours,
        status,
        compensation_records (
          id,
          compensation_date,
          hours_worked,
          status
        )
      `)
      .in("status", ["pending", "partial"]);

    if (fetchError) {
      console.error("Error fetching compensations:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${compensations?.length || 0} compensations to check`);

    let updatedCount = 0;

    for (const comp of compensations || []) {
      const records = comp.compensation_records || [];
      
      if (records.length === 0) {
        // No records, status should be pending
        if (comp.status !== "pending") {
          await supabase
            .from("absence_compensations")
            .update({ status: "pending" })
            .eq("id", comp.id);
          updatedCount++;
          console.log(`Compensation ${comp.id} updated to pending (no records)`);
        }
        continue;
      }

      // Calculate confirmed hours
      const totalConfirmedHours = records.reduce(
        (sum: number, r: any) => r.status === "confirmed" ? sum + Number(r.hours_worked) : sum,
        0
      );

      // If all hours confirmed -> completed
      if (totalConfirmedHours >= Number(comp.absence_hours)) {
        if (comp.status !== "completed") {
          await supabase
            .from("absence_compensations")
            .update({ status: "completed" })
            .eq("id", comp.id);
          updatedCount++;
          console.log(`Compensation ${comp.id} updated to completed`);
        }
        continue;
      }

      // Check if any dates have passed (should be partial)
      const hasPassedDates = records.some((r: any) => {
        if (r.status === "confirmed") return true;
        const compDate = new Date(r.compensation_date);
        compDate.setHours(0, 0, 0, 0);
        return compDate <= today;
      });

      if (hasPassedDates || totalConfirmedHours > 0) {
        // Should be partial
        if (comp.status !== "partial") {
          await supabase
            .from("absence_compensations")
            .update({ status: "partial" })
            .eq("id", comp.id);
          updatedCount++;
          console.log(`Compensation ${comp.id} updated to partial (date passed)`);
        }
      } else {
        // All dates in future -> pending
        if (comp.status !== "pending") {
          await supabase
            .from("absence_compensations")
            .update({ status: "pending" })
            .eq("id", comp.id);
          updatedCount++;
          console.log(`Compensation ${comp.id} updated to pending (future dates)`);
        }
      }
    }

    console.log(`Status update complete. Updated ${updatedCount} compensations.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${compensations?.length || 0} compensations, updated ${updatedCount}`,
        updated: updatedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in update-compensation-statuses:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
