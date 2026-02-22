

## Corrigir OCR: Separar fluxo PDF (texto) e Imagem (visao)

### Problema
O endpoint `/v1/responses` retorna erro 400 ao receber `data:application/pdf;base64,...` como `input_image`. PDF nao e aceito como imagem.

### Solucao
Arquivo alterado: `supabase/functions/process-ocr/index.ts`

### Mudancas

1. **Adicionar import do pdf-parse** no topo do arquivo:
   - `import pdfParse from "npm:pdf-parse@1.1.1";`

2. **Trocar endpoint** de `/v1/responses` para `/v1/chat/completions`

3. **Separar logica por tipo de arquivo** antes da chamada API:
   - **PDF**: extrair texto com `pdf-parse(Buffer.from(bytes))`. Se texto < 30 chars, retornar erro 400 pedindo foto. Senao, montar `messages` com role `user` e content tipo `text` contendo o prompt + texto extraido.
   - **Imagem**: montar `messages` com role `user` e content array com `type: "text"` (prompt) e `type: "image_url"` com `{ url: "data:image/...;base64,..." }`.

4. **Modelo**: `gpt-4o-mini` (suporta vision e texto)

5. **Prompt**: incluir instrucao "Responda APENAS com JSON valido. Nao inclua explicacoes nem markdown."

6. **Parsing da resposta**: trocar de `data.output` (Responses API) para `data.choices[0].message.content` (Chat Completions). Extrair JSON com regex e fazer `JSON.parse`.

7. **Manter tudo o resto igual**: validacao de multa, salvamento no Supabase, tratamento de erros.

### Fluxo resultante

```text
Upload
  |
  +-- PDF --> pdf-parse --> texto < 30 chars? --> erro "envie foto"
  |                    |
  |                    +--> texto ok --> chat/completions (texto)
  |
  +-- Imagem --> base64 --> chat/completions (vision)
  |
  v
JSON estruturado --> validacao --> salva no Supabase
```

