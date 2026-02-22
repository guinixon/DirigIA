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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    // Auth do Supabase
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt?.split('.')[1] || ""));
    const userId = payload.sub;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isPdf = file.type === 'application/pdf';

    let extractedText = "";
    
    // 1. Tenta extrair texto (Opcional, não trava mais se falhar)
    if (isPdf) {
      try {
        const pdfData = await pdfParse(Buffer.from(bytes));
        extractedText = pdfData.text?.trim() || "";
      } catch (e) {
        console.log("PDF escaneado detectado. Prosseguindo com análise visual...");
      }
    }

    // 2. Prepara o Base64 para o Gemini
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    // 3. Chamada Gemini 1.5 Flash (Suporta PDF nativamente)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Você é um especialista em multas brasileiras. Extraia os dados e responda APENAS em JSON. Se não for multa, isTrafficFine deve ser false." },
            {
              inline_data: {
                mime_type: isPdf ? "application/pdf" : file.type,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Gemini: ${errorText}`);
    }

    const result = await response.json();
    const rawContent = result.candidates[0].content.parts[0].text;
    const extractedData = JSON.parse(rawContent);

    // 4. Salva no banco (OCR_RAW)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabase.from('ocr_raw').insert({
      user_id: userId,
      uploaded_file_url: file.name,
      extracted_text: extractedData
    });

    return new Response(JSON.stringify({ success: true, extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Erro na Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});