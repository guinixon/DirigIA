import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Headers para permitir chamadas do seu Frontend (CORS)
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Responde a requisições de pre-flight do navegador
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validações Iniciais
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nenhum arquivo foi enviado.');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('Configuração OPENAI_API_KEY ausente.');

    // 2. Autenticação (Extração do ID do Usuário pelo JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Cabeçalho de autorização ausente.');
    
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    // 3. Conversão Segura de Imagem para Base64 (Evita erro de Stack Size)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log(`Processando arquivo: ${file.name} para o usuário: ${userId}`);

    // 4. Chamada para a OpenAI (GPT-4o-Mini com Visão)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em multas de trânsito brasileiras. 
            Analise a imagem e extraia os dados. 
            Responda obrigatoriamente no formato JSON abaixo:
            {
              "isTrafficFine": boolean,
              "aitNumber": string,
              "dataInfracao": string,
              "local": string,
              "placa": string,
              "renavam": string,
              "artigo": string,
              "orgaoAutuador": string,
              "nomeCondutor": string,
              "cpfCondutor": string
            }
            Se um campo não for encontrado, use null.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados desta notificação de multa.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro OpenAI:', errorText);
      throw new Error(`OpenAI API falhou com status ${response.status}`);
    }

    const aiData = await response.json();
    const extractedData = JSON.parse(aiData.choices[0].message.content);

    // 5. Verificação se é uma multa válida
    if (!extractedData.isTrafficFine) {
      return new Response(
        JSON.stringify({ error: 'O documento enviado não foi identificado como uma multa de trânsito.', isTrafficFine: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Persistência no Banco de Dados (Supabase)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabase
      .from('ocr_raw')
      .insert({
        user_id: userId,
        uploaded_file_url: file.name,
        extracted_text: extractedData, // O campo no banco deve aceitar JSONB ou Text
      });

    if (insertError) console.error('Erro ao salvar no banco:', insertError);

    // 7. Retorno de Sucesso
    return new Response(
      JSON.stringify({ success: true, extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});