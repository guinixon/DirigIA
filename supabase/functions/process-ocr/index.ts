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

    // Chave do Gemini configurada via 'supabase secrets set GEMINI_API_KEY=...'
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada.');

    // Autenticação do Usuário (JWT do Supabase Auth)
    const authHeader = req.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt?.split('.')[1] || ""));
    const userId = payload.sub;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isPdf = file.type === 'application/pdf';

    let extractedText = "";
    let base64Data = "";

    // 1. TENTATIVA DE EXTRAÇÃO DE TEXTO (PDFs Digitais)
    if (isPdf) {
      try {
        const pdfData = await pdfParse(Buffer.from(bytes));
        extractedText = pdfData.text?.trim() || "";
      } catch (e) {
        console.log("PDF sem camada de texto técnica. Usaremos Visão.");
      }
    }

    // 2. CONVERSÃO PARA BASE64 (Sempre preparamos para o Gemini ler visualmente)
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);

    // 3. CHAMADA API DO GEMINI
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Você é um especialista em multas de trânsito brasileiras. Extraia os dados do documento abaixo (seja via texto ou imagem). 
                     Responda estritamente em JSON com as chaves: isTrafficFine (boolean), aitNumber, dataInfracao, local, placa, renavam, artigo, orgaoAutuador. 
                     Se não for multa, isTrafficFine: false.` },
            // Se houver texto extraído do PDF, incluímos para ajudar a IA
            ...(extractedText ? [{ text: `Texto extraído do PDF: ${extractedText}` }] : []),
            // Enviamos o arquivo (Imagem ou PDF Escaneado) como dado inline
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
      const errorDetail = await response.text();
      throw new Error(`Gemini API Error: ${errorDetail}`);
    }

    const result = await response.json();
    // O Gemini retorna o conteúdo em candidates[0].content.parts[0].text
    const rawContent = result.candidates[0].content.parts[0].text;
    const extractedData = JSON.parse(rawContent);

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

  } catch (error: any) {
    console.error("Erro OCR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});