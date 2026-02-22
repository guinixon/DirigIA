import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em multas de trânsito brasileiras.
Analise os dados fornecidos e extraia as informações.
Responda APENAS com JSON válido. Não inclua explicações nem markdown.
Use exatamente este formato:
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
Se um campo não for encontrado, use null.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('Nenhum arquivo foi enviado.');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('Configuração OPENAI_API_KEY ausente.');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Cabeçalho de autorização ausente.');
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log(`Processando arquivo: ${file.name} (${file.type}) para o usuário: ${userId}`);

    // Build messages based on file type
    let messages: any[];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // PDF flow: extract text with pdf-parse
      const buffer = new Uint8Array(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      const extractedText = (pdfData.text || '').trim();

      console.log(`PDF texto extraído: ${extractedText.length} caracteres`);

      if (extractedText.length < 30) {
        return new Response(
          JSON.stringify({ error: 'Este PDF parece ser escaneado e não contém texto extraível. Por favor, envie uma foto/imagem da multa.', isTrafficFine: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extraia os dados desta notificação de multa de trânsito:\n\n${extractedText}` }
      ];
    } else {
      // Image flow: send as base64 image_url
      let binary = "";
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:${file.type};base64,${base64}`;

      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extraia os dados desta notificação de multa.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
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
    const rawContent = aiData.choices[0].message.content;

    // Extract JSON from response (handle possible markdown wrapping)
    let extractedData;
    try {
      extractedData = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Não foi possível extrair JSON da resposta da IA.');
      }
    }

    if (!extractedData.isTrafficFine) {
      return new Response(
        JSON.stringify({ error: 'O documento enviado não foi identificado como uma multa de trânsito.', isTrafficFine: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabase
      .from('ocr_raw')
      .insert({
        user_id: userId,
        uploaded_file_url: file.name,
        extracted_text: extractedData,
      });

    if (insertError) console.error('Erro ao salvar no banco:', insertError);

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
