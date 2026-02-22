

## Corrigir headers CORS da Edge Function `process-ocr`

### Problema
A função `process-ocr` tem headers CORS incompletos, causando erro "Failed to fetch" porque o cliente Supabase JS envia headers extras (`x-supabase-client-platform`, etc.) que não estão listados no `Access-Control-Allow-Headers`.

### Alteração
Atualizar os `corsHeaders` em `supabase/functions/process-ocr/index.ts` (linha 7) de:

```text
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

Para:

```text
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

Apenas uma linha será modificada. Nenhum outro arquivo precisa ser alterado.

