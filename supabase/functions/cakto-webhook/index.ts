import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Cakto webhook received:', JSON.stringify(payload, null, 2));

    const event = payload.event || payload.custom_id;
    const customer = payload.customer || payload.data?.customer;
    const order = payload.order || payload.data?.order;

    if (!event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload - missing event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing event: ${event}`);

    // =====================================================
    // PIX GERADO → Criar pagamento como PENDING
    // =====================================================
    if (
      event === 'pix_gerado' ||
      event === 'purchase_created' ||
      event === 'waiting_payment' ||
      event === 'pix_generated'
    ) {
      const customerEmail = customer?.email;
      const orderId = order?.id || payload.id;
      const amount = order?.amount || order?.price || payload.amount || 0;

      if (!customerEmail || !orderId) {
        return new Response(
          JSON.stringify({ success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('billing_id', orderId.toString())
        .maybeSingle();

      if (!existingPayment) {
        await supabase
          .from('payments')
          .insert({
            user_id: profile.id,
            billing_id: orderId.toString(),
            plan: 'premium',
            amount: typeof amount === 'number'
              ? amount
              : parseInt(amount) || 0,
            status: 'PENDING',
            payment_method: 'PIX',
            paid_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        console.log(`Payment ${orderId} created as PENDING`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // PAGAMENTO APROVADO → Atualizar para PAID + Premium
    // =====================================================
    if (event === 'purchase_approved') {
      const customerEmail = customer?.email;
      const orderId = order?.id || payload.id;
      const amount = order?.amount || order?.price || payload.amount || 0;

      if (!customerEmail || !orderId) {
        return new Response(
          JSON.stringify({ success: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar plano para premium
      await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      // Atualizar pagamento para PAID
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('billing_id', orderId.toString())
        .maybeSingle();

      if (existingPayment) {
        await supabase
          .from('payments')
          .update({
            status: 'PAID',
            amount: typeof amount === 'number'
              ? amount
              : parseInt(amount) || 0,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('billing_id', orderId.toString());

        console.log(`Payment ${orderId} updated to PAID`);
      } else {
        await supabase
          .from('payments')
          .insert({
            user_id: profile.id,
            billing_id: orderId.toString(),
            plan: 'premium',
            amount: typeof amount === 'number'
              ? amount
              : parseInt(amount) || 0,
            status: 'PAID',
            payment_method: 'PIX',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        console.log(`Payment ${orderId} inserted as PAID`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // REFUND / CHARGEBACK
    // =====================================================
    if (event === 'refund' || event === 'chargeback') {
      const customerEmail = customer?.email;

      if (customerEmail) {
        await supabase
          .from('profiles')
          .update({
            plan: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('email', customerEmail);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // OUTROS EVENTOS
    // =====================================================
    return new Response(
      JSON.stringify({ success: true, message: `Event ${event} received` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});