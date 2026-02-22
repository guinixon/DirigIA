import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pixQrCodeId } = await req.json();
    
    if (!pixQrCodeId) {
      return new Response(
        JSON.stringify({ error: 'pixQrCodeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    if (!apiKey) {
      console.error('ABACATE_PAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Simulating payment for pixQrCodeId:', pixQrCodeId);

    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${pixQrCodeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ metadata: {} })
    });

    const data = await response.json();
    console.log('Simulate payment response:', JSON.stringify(data));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error || 'Failed to simulate payment', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error simulating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
