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
    const { ocrData, userExplanation, selectedArguments } = await req.json();
    
    console.log('Generating resource with data:', { ocrData, userExplanation, selectedArguments });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build arguments text
    const argumentsText = selectedArguments && selectedArguments.length > 0
      ? `Argumentos selecionados: ${selectedArguments.join(', ')}`
      : '';

    // Create AI prompt
    const systemPrompt = `Você é um especialista em legislação de trânsito brasileira com experiência em recursos administrativos.
Gere um recurso de multa formal e sucinto, com linguagem jurídica precisa conforme o CTB.

REGRAS DE FORMATAÇÃO:
- NÃO use caracteres markdown como "#", "**", "*" ou qualquer formatação especial
- Escreva em texto corrido, natural e humanizado
- Use apenas quebras de linha e espaçamento para organizar o documento
- NÃO inclua lista de documentos anexos

ESTRUTURA DO RECURSO:
1. Cabeçalho com órgão destinatário
2. Qualificação do requerente (nome, CPF, endereço)
3. Dados do auto de infração (número, data, local, placa, artigo)
4. Breve exposição dos fatos (máximo 2 parágrafos)
5. Fundamentação legal concisa (citar artigos relevantes do CTB)
6. Pedido direto de cancelamento ou arquivamento

O texto deve ser:
- Formal, respeitoso e direto ao ponto
- Sucinto mas completo (sem repetições)
- Pronto para impressão
- Humanizado, como se escrito por uma pessoa real

IMPORTANTE: Use apenas as informações fornecidas. Se faltar dado essencial, indique "[PREENCHER]".`;

    const userPrompt = `Gere um recurso de multa de trânsito sucinto e direto com base nos dados:

NOTIFICAÇÃO:
- Auto de Infração: ${ocrData.aitNumber || 'NÃO INFORMADO'}
- Data: ${ocrData.dataInfracao || 'NÃO INFORMADO'}
- Local: ${ocrData.local || 'NÃO INFORMADO'}
- Placa: ${ocrData.placa || 'NÃO INFORMADO'}
- RENAVAM: ${ocrData.renavam || 'NÃO INFORMADO'}
- Artigo: ${ocrData.artigo || 'NÃO INFORMADO'}
- Órgão: ${ocrData.orgaoAutuador || 'NÃO INFORMADO'}

CONDUTOR:
- Nome: ${ocrData.nomeCondutor || 'NÃO INFORMADO'}
- CPF: ${ocrData.cpfCondutor || 'NÃO INFORMADO'}
- Endereço: ${ocrData.enderecoCondutor || 'NÃO INFORMADO'}

RELATO:
${userExplanation || 'Não fornecido'}

${argumentsText}

Gere o recurso completo, sem markdown e sem lista de documentos anexos.`;

    console.log('Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
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
    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      console.error('No text generated:', data);
      throw new Error('Falha ao gerar recurso');
    }

    console.log('Resource generated successfully');

    // Validate and clean data_infracao
    let cleanedDataInfracao = null;
    if (ocrData.dataInfracao && ocrData.dataInfracao.trim() !== '') {
      const dateStr = ocrData.dataInfracao.trim();
      
      // Try to parse different date formats
      let parsedDate = null;
      
      // Format: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        parsedDate = new Date(dateStr);
      }
      // Format: DD/MM/YYYY
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        parsedDate = new Date(`${year}-${month}-${day}`);
      }
      // Format: DD-MM-YYYY
      else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        parsedDate = new Date(`${year}-${month}-${day}`);
      }
      
      // Validate that the date is valid and not in the future
      if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
        // Convert to YYYY-MM-DD format for PostgreSQL
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        cleanedDataInfracao = `${year}-${month}-${day}`;
      } else {
        console.warn('Invalid date format or future date, ignoring:', dateStr);
      }
    }

    // Get user from JWT (already verified by Supabase due to verify_jwt = true)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Decode JWT to get user ID
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Create Supabase client with service role for backend operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user profile for resource count tracking
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, resources_count')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Error fetching profile');
    }

    // Limit check disabled for testing - system de pagamento em desenvolvimento

    // Save resource to database
    const { data: resource, error: insertError } = await supabase
      .from('resources')
      .insert({
        user_id: userId,
        ait_number: ocrData.aitNumber || null,
        placa: ocrData.placa || null,
        artigo: ocrData.artigo || null,
        data_infracao: cleanedDataInfracao,
        local: ocrData.local || null,
        orgao_autuador: ocrData.orgaoAutuador || null,
        renavam: ocrData.renavam || null,
        generated_text: generatedText,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting resource:', insertError);
      throw new Error('Error saving resource');
    }

    // Update resources count
    await supabase
      .from('profiles')
      .update({ resources_count: profile.resources_count + 1 })
      .eq('id', userId);

    console.log('Resource saved with id:', resource.id);

    return new Response(
      JSON.stringify({ 
        generatedText,
        resourceId: resource.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-resource function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
