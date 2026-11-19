# André Mendes Rooms — escolha automática da capa e ordenação das fotos

## Modo atual: GRATUITO, sem API paga

- Após adicionar fotos no painel de edição, o sistema tenta analisar iluminação, contraste, detalhes/nitidez aproximada, resolução, proporção e semelhança entre as imagens.
- Analisa localmente no navegador (Canvas), sem enviar fotos a modelos de IA de terceiros.
- Escolhe a capa entre as fotos tecnicamente mais adequadas e agrupa imagens visualmente semelhantes em **blocos contíguos**. Não alterna fotos semelhantes e diferentes como na versão antiga.
- A ordem fica em `property_photos.sort_order` no Supabase. A primeira foto da sequência é a capa exibida no site.
- Há o botão **Reorganizar fotos automaticamente (grátis)** para fotos já cadastradas.
- O processamento ocorre após o upload ou quando solicitado, nunca para cada visita do cliente.
- Não altera arquivos nem publica imóveis ocultos; apenas a sequência de exibição.
- Pode-se dar um **rótulo de ambiente** (Quarto 1, Banheiro 1, Cozinha etc.) às fotos. A classificação por rótulo tem prioridade e **garante que todas as fotos identificadas do mesmo ambiente fiquem juntas**.
- Para habilitar essa correção manual, executar uma vez no Supabase SQL Editor a migração `supabase/migrations/006_photo_room_groups.sql` (adiciona coluna opcional `room_group`). O painel funciona em modo automático também antes da migração, mas sem rótulos.
- Depois de identificar ambientes nas fotos no painel, clicar em **Reorganizar fotos automaticamente (grátis)** para aplicar a sequência.
- É uma heurística: fotos do mesmo cômodo vistas de ângulos muito diferentes podem não ser agrupadas automaticamente; o rótulo de ambiente resolve essa ambiguidade.
- Nenhuma chave de API ou assinatura Claude é necessária.
- Limite de até **30 fotografias por imóvel** para avaliação gratuita atual; o upload permite até 30 por lote.
- Essa avaliação **não é IA semântica**: não identifica tipos de cômodo, decoração ou atratividade comercial e não garante aumento de conversões. Revise a capa antes de publicar.
- Se o navegador não conseguir carregar imagens remotas devido a CORS/conectividade, mantém a ordem anterior e informa o problema.
- Ordenação é feita atualizando sort_order na tabela, sob as permissões do admin autenticado. Em caso de falha parcial deve-se conferir a ordem exibida.
- Validação com imagens reais e testes no navegador ainda necessária.

## Integração futura com IA de visão (OPCIONAL/PAGA)

- Código de rota `/api/admin/imoveis/[id]/ordenar-fotos` foi preparado para Anthropic, mas **não é chamado** pelo painel no modo gratuito.
- Para usar IA de visão futuramente, será preciso configurar uma chave de API no servidor e testar custos, privacidade e permissões.
- Assinaturas Claude Pro não substituem créditos de API.
- A decisão de contratar pode ficar para depois, sem interromper o uso do catálogo.

## Pastas de referência

- Em cada imóvel, pode-se escolher **manualmente a pasta certa** para upload, com autorização explícita do navegador e confirmação da unidade.
- **Ainda NÃO existe** sincronização automática da árvore inteira `LISTA ATUAL` / Google Drive e correspondência automática das pastas com imóveis.
- Para criar importação centralizada, validar por landlord + postcode + unidade; fotos armazenadas não comprovam disponibilidade e jamais devem mudar o status por si.

## Segurança

- Jamais subir documentos pessoais em buckets públicos do Supabase.
- Não colocar chaves privadas no GitHub, em conversas ou em variáveis `NEXT_PUBLIC_`.
- A análise gratuita é local, não faz chamadas de API de IA.
- Imóvel publicado pode receber fotos visíveis assim que o upload termina. Testar primeiro com rascunhos ocultos.
