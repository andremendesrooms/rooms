# André Mendes Rooms — Site Público (MVP)

Site do catálogo, mobile-first, consumindo exclusivamente a view `properties_public`
do Supabase (nunca a tabela `properties` diretamente).

## Rodando localmente

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API no Supabase)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` (formato internacional, só números)
3. `npm run dev`
4. Abra http://localhost:3000

## O que existe nesta etapa

- Homepage com busca rápida, destaques e novidades
- `/imoveis` — listagem com filtros dinâmicos (tipo, ocupação, região, preço máx., data)
- `/property/[id]` — página do imóvel, galeria, características, botão WhatsApp
- Registro básico de analytics (`property_view`, `search` com filtros/contagem, `whatsapp_click`)

## O que ainda NÃO está aqui (de propósito, por fase)

- Painel administrativo (próxima etapa)
- Google Maps / Places
- Importação por foto (OCR)
- Login / autenticação

## Deploy no Netlify

1. Suba este projeto para um repositório no GitHub.
2. No Netlify: **Add new site → Import an existing project → GitHub** → selecione o repositório.
3. Build command: `npm run build` (já configurado em `netlify.toml`).
4. Em **Site settings → Environment variables**, adicione as mesmas 3 variáveis do `.env.local`.
5. Deploy.

## Limitações conhecidas (documentadas, não são bugs)

- O número de WhatsApp vem de variável de ambiente, não do banco — a tabela
  `admin_settings` ainda não tem leitura pública. Isso é resolvido quando o
  painel (próxima fase) criar uma view pública restrita a esse campo.
- Quando um imóvel sai de `properties_public` (foi alugado), a página não
  consegue mostrar "imóveis parecidos" (mesma região/tipo) porque esse dado
  já não é mais público — mostra uma sugestão genérica dos imóveis mais
  recentes em vez disso.
