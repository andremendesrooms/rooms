# Entrega da issue #1 — revisão para painel-admin

Data: 16/11/2026. Base: `painel-admin`. Branch: `codex/issue-1-lancamento`.

## P0 — auditoria, estabilidade e segurança

Implementados `typecheck`, testes nativos do Node e pipeline de PR sem secrets. Instalação validada com `npm ci`; lockfile original preservado. A auditoria confirmou que o admin existente já editava imóveis e fazia upload: README corrigido. A dependência Next.js 16 funciona com React 18, mas emite aviso de depreciação desse suporte; migração para React 19 não integra esta entrega.

Consultas públicas usam somente `properties_public`, filtro explícito `available` e lista de campos permitidos. Endereço exato e coordenadas não são enviados ao público. URLs de mídia agora exigem o projeto Supabase configurado e o bucket correto, incluindo a configuração de `next/image`. URLs de filtros inválidas não provocam erro de consulta. Ausência de configuração e falha do catálogo não são apresentadas como ausência comprovada de imóveis.

Não houve acesso a dados reais, exclusão, importação automática, publicação de fixtures, execução de migrations ou SQL em produção. A rota paga existente precisa de habilitação explícita adicional e permanece desativada.

**Pendência de homologação:** o repositório não contém as migrations originais com a view, RLS e triggers. Verificar `hidden=false` e `validation_status=ok` na definição real da view, policies de fotos e autorização das escritas, auditoria e bloqueios de preço. O arquivo `checks/rls-audit.sql` contém somente consultas de inspeção e não foi executado.

## P1 — home comercial

Home, cabeçalho, cartões, busca e rodapé harmonizados com laranja, grafite e branco; tipografia, hierarquia, fotos reais quando disponíveis, navegação mobile, foco visível e redução de movimento. A home não duplica vitrines de destaques/novidades e não utiliza números, depoimentos ou garantias inventados.

Captação solicita tipo, região, ocupantes, orçamento/período, data e residência em Londres, com consentimento obrigatório antes do envio ao WhatsApp. Não armazena preferências no site nem promete reserva antecipada.

**Pendências externas:** logo oficial em arquivo binário não localizada; mantida a marca textual conforme AGENTS.md. Não há configuração Supabase/WhatsApp ou catálogo real no ambiente. A foto do hero utiliza o primeiro anúncio com fotografia; sem dados reais mostra um bloco tipográfico, sem imagem ou anúncio fictício.

## P2 — seis idiomas

Português, inglês, espanhol, italiano, francês e polonês no conteúdo editorial da home, navegação, filtros, cartões, detalhes, formulário, estados públicos de erro/indisponibilidade e metadata. Seletor visível em mobile e desktop, persistência por cookie HttpOnly/SameSite, atualização mantendo path/query. O admin permanece em português e não apresenta seletor. Dados originais do banco não passam por tradução automática. A escolha inicial é português; a preferência permanece ao voltar do admin para o catálogo.

## P3 — administração

Preservados cadastro, edição, autenticação e fotos existentes. Adicionados controles de ocultar, marcar como alugado e publicar. Revalidam usuário e perfil ativo, usam a sessão anon autenticada/RLS, conferem a versão `updated_at` para concorrência e não alteram validação nem preço. Publicação exige confirmação de anúncio real, validação `ok`, ausência de preço pendente e dados comerciais mínimos. Nenhum rascunho é aprovado automaticamente. As alterações do formulário precisam ser salvas antes das ações de publicação.

A organização gratuita preserva a primeira foto como capa, mantém as etiquetas manuais contíguas e não perde originais, inclusive fotografias que a análise não consegue ler. A heurística continua sujeita a erro; ambientes devem ser corrigidos pelas etiquetas manuais. A persistência de etiquetas depende da migration 006 já existente e ainda não executada nesta tarefa. A ordenação grava fotos individualmente; uma falha parcial exige revisão da ordem, como informado pela interface existente.

**Limite da validação:** fluxos com sessões reais, permissões RLS e triggers não foram executados sem um Supabase de homologação configurado. O painel não pode ser declarado homologado para produção com base apenas nos testes locais.

## Verificação realizada

- `npm ci`: passou com cache no workspace.
- `npm run typecheck` / `npx tsc --noEmit`: passaram.
- `npm test`: 15 testes, cobrindo regras de publicação, proteção de mídia, WhatsApp contextual, consultas públicas, filtros, capa/ambientes, traduções e renderização de cartões em seis idiomas. Mocks e fixtures somente em memória; nenhuma gravação externa.
- `npm run build`: passou sem credenciais reais. Next.js informa depreciação do suporte a React 18.
- `npm audit --omit=dev`: zero vulnerabilidades reportadas nas dependências de produção.
- Navegador Chromium/Playwright local: seis idiomas na home e catálogo, persistência após reload, preservação de query/preço/período, admin em português, estado sem configuração e redirecionamento sem sessão. Layouts 320, 375, 768 e 1440 px sem overflow horizontal ou erros de execução.

Os testes de banco foram substituídos por mocks nesta entrega; isso **não** valida RLS nem dados comerciais reais.

## Arquivos por área

- Público: `app/page.tsx`, `app/imoveis/page.tsx`, `app/property/[id]/page.tsx`, `app/layout.tsx`, `app/error.tsx`, `app/globals.css`, componentes de cabeçalho/rodapé/cartões/busca/filtros/WhatsApp e `LeadForm.tsx`/`ArrowIcon.tsx`.
- Idiomas: `lib/i18n*.ts`, `lib/translations.json`, `components/Language*.tsx`, `app/api/language/route.ts` e `proxy.ts`.
- Admin: edição, login, layout sem indexação, `PublicationControls.tsx`, `PropertyPhotosEditor.tsx`, `lib/publication.ts`, `lib/photo-order.ts` e bloqueio da rota paga existente.
- Segurança/qualidade: `lib/queries.ts`, `lib/filters.ts`, `lib/photo-url.ts`, clientes Supabase, `lib/types.ts`, `lib/format.ts`, `next.config.mjs`, `tailwind.config.ts`, `package.json`, `.env.local.example`, `.github/workflows/validate.yml`, `tests/` e documentação.

## Checklist antes de autorizar publicação no Netlify

- [ ] Receber e inserir o arquivo original da logo, com versão adequada para tela.
- [ ] Configurar Supabase e número WhatsApp no ambiente de homologação; reconstruir o app.
- [ ] Inspecionar a view: somente `available`, `hidden=false`, `validation_status=ok`, sem campos internos.
- [ ] Testar como anon: imóvel real disponível visível; rascunho, oculto, inválido e alugado ausentes, inclusive por ID; tabela privada e fotos não autorizadas inacessíveis.
- [ ] Testar perfis: `agent`, usuário inativo e não membro não alteram imóveis/fotos; `manager`/`super_admin` autorizados conseguem fazê-lo; confirmar RLS no servidor, não apenas controles da interface.
- [ ] Validar edição, preço pendente/bloqueado, auditoria, conflito de sessão, upload, capa, etiquetas e publicação/ocultação em dados de homologação. Fixtures nunca devem ser publicadas como anúncios reais.
- [ ] Confirmar que o enum de status do banco aceita `rented` e que a migration 006 está disponível antes de salvar etiquetas; qualquer mudança de schema precisa de revisão própria.
- [ ] Verificar preço, período, depósito, ocupação, data, fotos e condições de cada anúncio real com a fonte comercial.
- [ ] Abrir WhatsApp e confirmar destinatário/mensagem em cartões, detalhes e formulário; testar consentimento obrigatório.
- [ ] Fazer revisão editorial nativa dos seis idiomas e verificar fotos reais em desktop/mobile.
- [ ] Revisar PR e obter CI verde para `painel-admin`; manter `main` preservada.
- [ ] Somente após autorização do proprietário: revisar configuração Netlify, variáveis no build, domínio e procedimento de retorno à versão anterior. Nenhum deploy foi iniciado por esta entrega. O guard de build Netlify pula a branch `codex/issue-1-lancamento`, inclusive previews automáticos.

## Ampliação de público e polonês

A pedido do proprietário, a comunicação passou a acolher todas as nacionalidades e tanto residentes em Londres quanto pessoas que planejam chegar do exterior. Home, FAQ, rodapé, metadata e instruções do projeto refletem essa orientação, sem prometer disponibilidade ou reserva antecipada. O formulário mantém a pergunta sobre residência em Londres e a data de mudança para contextualizar o atendimento.

O cabeçalho apresenta botão direto **English** e seletor **Escolha outro idioma** em destaque, também no mobile. Polonês (`pl`, Polski) integra o catálogo completo, o cookie persistente e as mensagens de WhatsApp. As mensagens de contato agora usam o idioma selecionado e preservam referência e título originais do imóvel. Nenhuma campanha paga foi criada ou publicada.

Arquivos desta ampliação: `AGENTS.md`, `README.md`, home/layout, cabeçalho/rodapé, seletor de idioma, formulário/WhatsApp, formatação de links, catálogo de traduções, testes e este relatório. Validação: TypeScript, build, 15 testes e smoke de navegador com seis idiomas, atalho English, persistência de filtros e larguras 320–1440 px. As pendências de logo e homologação Supabase permanecem.
