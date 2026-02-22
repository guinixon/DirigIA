import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Arquivo não enviado');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada no Supabase');

    // Autenticação do Usuário via JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Não autorizado');
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log(`Processando: ${file.name} (${file.type})`);

    // Chamada unificada para OpenAI GPT-4o-Mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Nome corrigido
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt()
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados deste documento de multa.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }, // Garante retorno JSON
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro OpenAI:', errorData);
      throw new Error(`OpenAI Error: ${response.status}`);
    }

    const aiResult = await response.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);

    // Validação de segurança
    if (!extractedData.isTrafficFine) {
      return new Response(JSON.stringify({ error: 'Documento não reconhecido como multa.', isTrafficFine: false }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Salvar no Banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('ocr_raw').insert({
      user_id: userId,
      uploaded_file_url: file.name,
      extracted_text: extractedData,
    });

    return new Response(JSON.stringify({ extractedData, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(): string {
  return `Você é um extrator de dados de multas brasileiras. 
  Responda obrigatoriamente em JSON:
  {
    "isTrafficFine": boolean,
    "aitNumber": string,
    "dataInfracao": string,
    "local": string,
    "placa": string,
    "renavam": string,
    "artigo": string,
    "orgaoAutuador": string
  }
  Se não encontrar um campo, use null.`;
}