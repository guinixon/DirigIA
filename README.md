# 🚦 DirigIA – OCR Inteligente para Multas de Trânsito

DirigIA é uma aplicação que utiliza Inteligência Artificial para:

- 📄 Ler notificações de multa (PDF ou imagem)
- 🧠 Extrair dados estruturados automaticamente
- 💾 Salvar os dados no Supabase
- ⚖️ Servir como base para geração automática de recurso

---

## 🏗 Arquitetura

Frontend (React)
↓
Upload (PDF ou imagem)
↓
Supabase Edge Function (`process-ocr`)
↓
OpenAI API (`gpt-4o-mini`)
↓
Extração estruturada
↓
Tabela `ocr_raw` no banco

---

## 🧠 Tecnologias Utilizadas

- Supabase (Edge Functions + Database)
- OpenAI API (`gpt-4o-mini`)
- pdf-parse (extração de texto de PDF editável)
- Vision API (OCR para imagens)
- React (frontend)

---

## 📂 Estrutura Principal

```
supabase/
└── functions/
    └── process-ocr/
        └── index.ts
```

---

## 🔄 Fluxo de Processamento

### 📄 PDF

1. Detecta se o arquivo é `application/pdf`
2. Usa `pdf-parse` para extrair texto
3. Se texto < 30 caracteres → retorna erro:
   > "PDF escaneado. Envie foto."
4. Se texto válido → envia texto puro para OpenAI
5. Recebe JSON estruturado

---

### 🖼 Imagem (JPEG, PNG, WebP, GIF)

1. Converte para Base64
2. Envia como `image_url`
3. Modelo realiza OCR automaticamente
4. Retorna JSON estruturado

---

## 🤖 Modelo Utilizado

Modelo:
```
gpt-4o-mini
```

Endpoint:
```
POST https://api.openai.com/v1/chat/completions
```

---

## 🔐 Variáveis de Ambiente (Supabase)

Configurar no Dashboard:

| Nome | Descrição |
|------|-----------|
| OPENAI_API_KEY | Chave da OpenAI |
| SUPABASE_URL | URL do projeto |
| SUPABASE_SERVICE_ROLE_KEY | Service Role Key |

---

## 📥 Entrada Esperada

A Edge Function espera `multipart/form-data` contendo:

```
file: <arquivo PDF ou imagem>
```

---

## 📤 Resposta de Sucesso

```json
{
  "success": true,
  "extractedData": {
    "isTrafficFine": true,
    "aitNumber": "1234567890",
    "dataInfracao": "10/01/2026",
    "local": "Av. Exemplo, 1000",
    "placa": "ABC1D23",
    "renavam": "12345678901",
    "artigo": "Art. 218",
    "orgaoAutuador": "DETRAN-MG",
    "nomeCondutor": null,
    "cpfCondutor": null,
    "enderecoCondutor": null
  }
}
```

---

## ❌ Possíveis Erros

### 400 – PDF Escaneado
PDF não possui texto editável.
Solução: enviar foto da multa.

### 400 – Documento Não É Multa
Retorna:
```
isTrafficFine: false
```

### 401 – Invalid JWT
Token de autenticação não enviado ou inválido.

### 500 – AI Gateway Error 400
Formato incorreto na requisição enviada para OpenAI.

---

## 🧪 Parsing da Resposta

A resposta da OpenAI é processada com:

```ts
const content = data.choices?.[0]?.message?.content;
const jsonMatch = content.match(/\{[\s\S]*\}/);
const extractedData = JSON.parse(jsonMatch[0]);
```

O prompt força retorno em JSON puro:

```
Responda APENAS com JSON válido.
Não inclua explicações.
Não use markdown.
```

---

## 💾 Banco de Dados

Tabela:
```
ocr_raw
```

Campos:

- user_id
- uploaded_file_url
- extracted_text (JSON)
- created_at

---

## 🚀 Como Rodar

1. Configurar variáveis de ambiente no Supabase
2. Deploy da Edge Function `process-ocr`
3. Testar upload pelo frontend
4. Ver logs no Dashboard

---

## 📌 Limitações Atuais (MVP)

- PDF escaneado não é convertido automaticamente (exige foto)
- Parsing via regex (não usa function calling)
- Ainda não gera recurso automaticamente

---

## 🎯 Próximos Passos

- Geração automática de recurso administrativo
- Validação jurídica dos dados extraídos
- Melhorar OCR para PDF escaneado
- Controle de custo por usuário
- Sistema de planos

---

## 👨‍💻 Autor

Guilherme Santiago  
Engenharia da Computação  

---

## ⚖️ Aviso

Este projeto é uma ferramenta de apoio e não substitui análise jurídica profissional.