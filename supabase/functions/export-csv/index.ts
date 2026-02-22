import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const table = url.searchParams.get("table");

    const allowedTables: Record<string, string[]> = {
      profiles: ["id", "name", "email", "plan", "resources_count", "created_at", "updated_at"],
      resources: ["id", "user_id", "ait_number", "placa", "renavam", "artigo", "local", "orgao_autuador", "data_infracao", "generated_text", "pdf_url", "created_at"],
      payments: ["id", "user_id", "amount", "payment_method", "plan", "status", "billing_id", "br_code", "paid_at", "created_at", "updated_at"],
      ocr_raw: ["id", "user_id", "uploaded_file_url", "extracted_text", "created_at"],
    };

    if (!table || !allowedTables[table]) {
      return new Response(
        JSON.stringify({ error: "Tabela inválida", allowed: Object.keys(allowedTables) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to fetch all data for this user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const columns = allowedTables[table];

    let query = adminClient.from(table).select(columns.join(","));

    // For profiles, only show user's own profile; for others filter by user_id
    if (table === "profiles") {
      query = query.eq("id", user.id);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to CSV
    const rows = data || [];
    if (rows.length === 0) {
      const csvHeader = columns.join(",");
      return new Response(csvHeader, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${table}.csv"`,
        },
      });
    }

    const csvHeader = columns.join(",");
    const csvRows = rows.map((row: Record<string, unknown>) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${table}.csv"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
