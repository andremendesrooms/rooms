# André Mendes Rooms — seleção automática de capa e ordem das fotografias

## Estado
- Implementado no código da branch `painel-admin`; **ainda não foi testado com uma chave de API real**.
- Não faz chamadas pagas se `ANTHROPIC_API_KEY` não estiver configurada.
- Após o upload, tenta uma análise visual do lote **uma única vez**, salva a sequência em `property_photos.sort_order` e recarrega a galeria.
- O primeiro `sort_order` (zero) é a **capa**, porque o site público ordena por `sort_order`.
- A qualquer momento é possível clicar em **Reorganizar fotos existentes com IA** (nova chamada, com custo).
- Não apaga ou modifica pixels/arquivos originais.
- Limite inicial de análise: 30 fotos por imóvel. Mais fotos permanecem na ordem anterior; para um imóvel com mais de 30 fotos, será preciso ampliar a rotina.
- A análise prioriza iluminação, nitidez, enquadramento, apresentação fiel e diversidade visual dos ambientes. Não é garantia de conversões.

## É necessária uma assinatura do Claude?
**Não.** Claude Pro e acesso à API são produtos separados. Para habilitar o uso com Claude, use uma conta no Claude Console e adquira créditos de API ou utilize créditos já elegíveis. A API é cobrada conforme uso. Leia os preços antes de ativar.

## Como ativar
1. Acessar https://platform.claude.com/ e criar/obter uma chave de API.
2. Adicionar a variável de ambiente **exclusivamente no servidor**: `ANTHROPIC_API_KEY`.
3. Para testes locais: inserir a variável em `.env.local` **nunca versionar** (o .gitignore já ignora `.env*.local`).
4. Reiniciar `npm run dev`.
5. Para o site Netlify: **Project configuration → Environment variables** (criar segredo com o nome `ANTHROPIC_API_KEY`), habilitado para Functions e redeploy.
6. Não inserir a chave em campos `NEXT_PUBLIC_...`, no GitHub, em screenshots ou no chat.
7. Testar primeiro em um imóvel fictício e conferir que a capa escolhida é apropriada.

Configuração opcional: `ANTHROPIC_VISION_MODEL` (padrão `claude-sonnet-4-6`).

## Pasta de referência
O navegador não pode ler o computador por conta própria. Na edição do imóvel, o usuário pode selecionar a pasta correspondente ao mesmo imóvel/unidade via seletor de pastas; o upload ocorre com confirmação e a análise visual vem depois.

**NÃO IMPLEMENTADO:** sincronização automática contínua da biblioteca local `LISTA ATUAL` ou Google Drive, varredura de todas as pastas ou correspondência automática entre diretórios e imóveis. Essa etapa exige um importador explícito com correspondência por landlord + postcode + unidade; casos ambíguos exigem confirmação e a mera presença da foto nunca define disponibilidade.

## Cuidados
- Ao analisar, a API de IA recebe URLs públicas das fotos selecionadas. Não enviar documentos ou fotos confidenciais.
- A IA apenas altera `sort_order` em `property_photos`, sem mudar `status`, `hidden` ou preços.
- Se não houver chave, créditos, resposta válida ou ocorrer timeout, as fotos permanecem no sistema e a ordem anterior é preservada na medida do possível.
- Em imóveis já publicados, fotos podem ficar visíveis após o upload, antes da conclusão da análise. Para um lançamento, validar com rascunhos ocultos primeiro.
