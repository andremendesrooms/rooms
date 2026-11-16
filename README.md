# André Mendes Rooms | London

Catálogo comercial de imóveis em Londres, com foco em brasileiros que já vivem na cidade e querem mudar. Next.js App Router, TypeScript, Tailwind e Supabase. Desenvolvimento em `painel-admin`; as alterações da issue #1 estão em branch própria para revisão.

## Desenvolvimento e validação

Requer Node.js 22 ou superior. Há lockfile versionado.

```sh
npm ci
cp .env.local.example .env.local
# Preencha as três variáveis NEXT_PUBLIC_ com a configuração do ambiente de homologação.
npm run dev
```

```sh
npm run typecheck
npx tsc --noEmit
npm test
npm run build
```

`npm test` usa o runner nativo do Node e o TypeScript já instalado: regras comerciais, consultas públicas com mocks, mídia, fotos, WhatsApp, traduções e renderização de cartões. Não acessa nem altera banco de dados.

Para o smoke test do navegador, disponibilize Playwright e Chromium no ambiente, inicie o app local com `npm run build && npm start` e execute `npm run test:browser`. Playwright já está disponível no ambiente Codex usado nesta entrega; não foi adicionado como dependência do produto. `BROWSER_PATH`, `TEST_BASE_URL` e `SCREENSHOT_DIR` são opcionais. O smoke cobre os cinco idiomas, persistência, filtros, larguras 320/375/768/1440 e redirecionamento sem sessão. Execute contra uma instância local **sem credenciais reais**: esse smoke verifica também os estados de configuração ausente. Capturas ficam somente no diretório indicado.

GitHub Actions executa instalação reproduzível, TypeScript, testes e build nos pushes `codex/**` e PRs para `painel-admin`, sem secrets. O antigo comando `next lint`, removido do Next 16, foi retirado; não representa uma checagem que passava.

## Funcionalidades implementadas

- Home com busca, vitrine sem anúncios inventados, etapas de atendimento, diferenciais, perguntas frequentes e captação por WhatsApp mediante consentimento. Orçamento com período semanal/mensal explícito; o formulário não persiste dados no site.
- Catálogo com filtros por tipo, ocupação, região, preço/período e data. URLs inválidas são normalizadas. Indisponibilidade do serviço é apresentada separadamente de catálogo vazio.
- Detalhes e cartões com fotografia, valores, região/postcode, disponibilidade, ocupação e WhatsApp contextual. Sem número válido, o contato mostra indisponibilidade em vez de abrir um destinatário vazio.
- Português padrão, inglês, espanhol, italiano e francês: seletor desktop/mobile, cookie persistente, metadata, navegação e controles públicos traduzidos. Títulos, descrições, tipos, regiões e condições fornecidos pelo banco permanecem no idioma original. O admin fica em português.
- Marca textual temporária, laranja/grafite/branco. **Logo original binária ainda não disponível** no repositório ou no ambiente desta tarefa. Nenhuma logo substituta foi criada.
- Admin com login, recuperação de senha, consulta, cadastro de rascunhos, edição, upload e ordenação de fotos; perfis ativos `manager`/`super_admin` para mutações. Controles para ocultar, marcar como alugado e publicar com confirmação comercial explícita. Validação `ok` e revisão de preço resolvida são necessárias para publicar; o painel não aprova validações automaticamente.
- Fotos: ordenação gratuita no navegador, etiquetas manuais por ambiente, preservação da capa existente e de todos os originais. A heurística não reconhece cômodos com garantia. `room_group` depende da migration 006 existente; há fallback para schemas sem essa coluna.
- Rota opcional de análise paga bloqueada por padrão (`ENABLE_PAID_PHOTO_ANALYSIS=false`). Nenhuma API paga foi chamada.

## Limite de segurança do banco

O público consulta exclusivamente `properties_public`, com seleção explícita de colunas e `status=available`. Endereço exato, coordenadas e campos internos não são solicitados. Fotos são restritas ao bucket público `property-images` do projeto configurado.

**O contrato da view deve impor também `hidden=false` e `validation_status=ok`.** Essas colunas não constam do tipo público atual. As definições completas da view, policies RLS e triggers de auditoria/preço não estão versionadas: as migrations disponíveis começam na 004. Portanto, os testes locais **não certificam as permissões do banco de produção**. A chave anon e checagens de papel na interface não substituem RLS. Verifique o checklist de homologação em [docs/LANCAMENTO_ISSUE_1.md](docs/LANCAMENTO_ISSUE_1.md) antes do lançamento.

Sem variáveis, o build passa e o site exibe estado de indisponibilidade, sem fabricar imóveis. Para imagens reais, as variáveis devem estar presentes no momento do build do Next.js.

## Revisão e eventual deploy

Nenhum deploy é executado por estes comandos de validação. O `ignore` do Netlify bloqueia builds/deploy previews da branch `codex/issue-1-lancamento`, para que a revisão não publique um site automaticamente. O relatório e o checklist para futura publicação no Netlify estão em [docs/LANCAMENTO_ISSUE_1.md](docs/LANCAMENTO_ISSUE_1.md). A publicação exige concluir a homologação e autorização do proprietário. Não aplicar migrations, alterar `main` ou habilitar serviços pagos como parte desta revisão.
