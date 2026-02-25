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
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, file.type, file.size);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const isPdf = file.type === 'application/pdf';
    const isImage = supportedImageTypes.includes(file.type);

    if (!isPdf && !isImage) {
      return new Response(
        JSON.stringify({ error: 'Formato não suportado. Envie uma foto (JPEG, PNG, WebP) da notificação de multa.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PDFs should be converted to images on the client side before reaching here
    // If a PDF still arrives, reject it gracefully
    if (isPdf) {
      return new Response(
        JSON.stringify({ error: 'PDFs devem ser convertidos para imagem antes do envio. Tente novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    const mediaType = file.type || 'image/jpeg';

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildSystemPrompt() },
          { type: 'text', text: 'Analise este documento. Primeiro verifique se é uma multa de trânsito. Se for, extraia os dados estruturados.' },
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${base64}` }
          }
        ]
      }
    ];

    console.log('Calling OpenAI API for OCR extraction...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: [buildExtractionTool()],
        tool_choice: { type: "function", function: { name: "extract_traffic_fine_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    // Validate if it's a traffic fine
    if (!extractedData.isTrafficFine) {
      return new Response(
        JSON.stringify({ 
          error: 'O documento enviado não parece ser uma notificação de multa de trânsito. Por favor, envie uma notificação válida.',
          isTrafficFine: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to ocr_raw table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: insertError } = await supabase
      .from('ocr_raw')
      .insert({
        user_id: userId,
        uploaded_file_url: file.name,
        extracted_text: JSON.stringify(extractedData),
      });

    if (insertError) {
      console.error('Error saving OCR data:', insertError);
    }

    return new Response(
      JSON.stringify({ extractedData, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-ocr function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(): string {
  return `Você é um especialista em extração de dados de notificações de multas de trânsito brasileiras.

PRIMEIRO: Determine se o documento enviado é realmente uma notificação de multa de trânsito. Se NÃO for uma multa (ex: conta de luz, boleto, documento pessoal, etc.), defina isTrafficFine como false e não extraia os demais campos.

Se FOR uma multa de trânsito, extraia as seguintes informações:
1. Número do Auto de Infração (AIT) - geralmente um número longo
2. Data da Infração - formato DD/MM/YYYY
3. Local da Infração - endereço completo
4. Placa do veículo - formato ABC-1234 ou ABC1D23
5. RENAVAM - código numérico de 11 dígitos
6. Artigo/Código da Infração - artigo do CTB infringido
7. Órgão Autuador - nome do órgão que aplicou a multa
8. Nome do Condutor - nome completo (se disponível)
9. CPF do Condutor - CPF completo (se disponível)
10. Endereço do Condutor - endereço completo (se disponível)

IMPORTANTE: Se você não conseguir identificar alguma informação com certeza, retorne null para esse campo.
Seja preciso e extraia apenas informações que estão claramente visíveis no documento.`;
}

function buildExtractionTool() {
  return {
    type: "function",
    function: {
      name: "extract_traffic_fine_data",
      description: "Extrai dados estruturados de notificações de multas de trânsito",
      parameters: {
        type: "object",
        properties: {
          isTrafficFine: { type: "boolean", description: "true se o documento é uma notificação de multa de trânsito, false caso contrário" },
          aitNumber: { type: "string", description: "Número do Auto de Infração" },
          dataInfracao: { type: "string", description: "Data da infração no formato DD/MM/YYYY" },
          local: { type: "string", description: "Local completo da infração" },
          placa: { type: "string", description: "Placa do veículo" },
          renavam: { type: "string", description: "Código RENAVAM do veículo" },
          artigo: { type: "string", description: "Artigo ou código da infração" },
          orgaoAutuador: { type: "string", description: "Nome do órgão autuador" },
          nomeCondutor: { type: "string", description: "Nome completo do condutor" },
          cpfCondutor: { type: "string", description: "CPF do condutor" },
          enderecoCondutor: { type: "string", description: "Endereço completo do condutor" },
        },
        required: ["isTrafficFine"],
        additionalProperties: false
      }
    }
  };
}