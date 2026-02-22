import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('Arquivo não enviado');

    // Logs para debug de performance
    console.log(`Recebido: ${file.name} | Tipo: ${file.type} | Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    // Extração do Usuário
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt?.split('.')[1] || ""));
    const userId = payload.sub;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isPdf = file.type === 'application/pdf';

    let extractedText = "";
    let base64Data = "";

    // 1. TENTATIVA DE EXTRAÇÃO DE TEXTO (Para PDFs digitais)
    if (isPdf) {
      try {
        const pdfData = await pdfParse(Buffer.from(bytes));
        extractedText = pdfData.text?.trim() || "";
      } catch (e) {
        console.log("PDF sem camada de texto técnica, mudando para análise visual.");
      }
    }

    // 2. CONVERSÃO PARA BASE64 (Para imagens ou PDFs escaneados)
    // Se o texto for muito curto ou inexistente, usamos a visão computacional
    if (!extractedText || extractedText.length < 50 || !isPdf) {
      let binary = "";
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    }

    // 3. MONTAGEM DO PAYLOAD OPENAI
    const messages = [
      { 
        role: 'system', 
        content: 'Você é um especialista em multas brasileiras. Extraia os dados e responda APENAS em JSON. Use null para campos vazios.' 
      }
    ];

    const userContent: any[] = [{ type: 'text', text: 'Analise este documento de trânsito e extraia os dados estruturados.' }];

    if (extractedText && extractedText.length > 50) {
      // Se tivermos texto, enviamos o texto (mais barato e rápido)
      userContent.push({ type: 'text', text: `Texto extraído do documento: ${extractedText}` });
    } else {
      // Se for imagem ou PDF escaneado (como o do Guilherme), enviamos a imagem
      userContent.push({ 
        type: 'image_url', 
        image_url: { 
          url: `data:${isPdf ? 'application/pdf' : file.type};base64,${base64Data}`,
          detail: "low" // 'low' economiza muitos tokens e geralmente basta para OCR
        } 
      });
    }

    messages.push({ role: 'user', content: userContent as any });

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
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      throw new Error(`Erro na API OpenAI: ${errorDetail}`);
    }

    const aiResult = await response.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);

    // 4. PERSISTÊNCIA NO BANCO
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('ocr_raw').insert({
      user_id: userId,
      uploaded_file_url: file.name,
      extracted_text: extractedData
    });

    return new Response(JSON.stringify({ success: true, extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Erro final:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});