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

    console.log(`Processing Cakto event: ${event}`);

    // ================================
    // PURCHASE APPROVED
    // ================================
    if (event === 'purchase_approved') {

      const customerEmail = customer?.email;

      if (!customerEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing customer email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing purchase approval for: ${customerEmail}`);

      // Buscar usuário pelo email
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id, email, plan')
        .eq('email', customerEmail)
        .single();

      if (profileFetchError || !profile) {
        console.error('User not found:', profileFetchError);
        return new Response(
          JSON.stringify({ success: true, message: 'User not found but webhook received' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar plano para premium
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ================================
      // PASSO 3 - EVITAR DUPLICIDADE
      // ================================
      const orderId = order?.id || payload.id || `cakto-${Date.now()}`;
      const amount = order?.amount || order?.price || payload.amount || 0;

      // Verificar se já existe pagamento com esse billing_id
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('billing_id', orderId.toString())
        .maybeSingle();

      if (existingPayment) {
        console.log(`Payment ${orderId} already exists. Skipping insert.`);
      } else {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: profile.id,
            billing_id: orderId.toString(),
            plan: 'premium',
            amount: typeof amount === 'number'
              ? amount
              : parseInt(amount) || 4990,
            status: 'PAID',
            payment_method: 'CAKTO',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (paymentError) {
          console.error('Error saving payment record:', paymentError);
        } else {
          console.log(`Payment ${orderId} saved successfully.`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User upgraded to premium' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ================================
    // REFUND / CHARGEBACK
    // ================================
    if (event === 'refund' || event === 'chargeback') {

      const customerEmail = customer?.email;

      if (customerEmail) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('email', customerEmail);

        if (updateError) {
          console.error('Error downgrading profile:', updateError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Refund processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ================================
    // SUBSCRIPTION CANCELED
    // ================================
    if (event === 'subscription_canceled') {

      const customerEmail = customer?.email;

      if (customerEmail) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('email', customerEmail);

        if (updateError) {
          console.error('Error downgrading profile:', updateError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription canceled processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Outros eventos
    return new Response(
      JSON.stringify({ success: true, message: `Event ${event} received` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});