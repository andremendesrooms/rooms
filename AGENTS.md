# André Mendes Rooms — instruções para agentes de código

## Objetivo do produto
Site de locação em Londres, focado principalmente em pessoas que **já moram em Londres** e querem mudar de quarto, suíte, studio, flat ou casa. Público secundário: pessoas ainda fora do Reino Unido. Atendimento em português, com idiomas adicionais inglês, espanhol, italiano e francês. Prioridade: concluir rapidamente uma versão comercial **premium, segura e utilizável**.

## Ambiente
- Next.js App Router + TypeScript + Tailwind, Supabase e Netlify.
- Repositório: `andremendesrooms/rooms`.
- Branch de desenvolvimento: `painel-admin`; **não modificar nem fazer merge em `main` sem aprovação expressa do proprietário**.
- O site público usa exclusivamente a view Supabase `properties_public`; nunca consultar `properties` em rotas ou componentes públicos.
- Área administrativa autenticada em `/admin`, permissões RLS com papéis `super_admin`, `manager`, `agent`; não expor `service_role` nem secrets ao navegador.
- Variáveis públicas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WHATSAPP_NUMBER`; **não registrar valores sensíveis**.
- O código existente contém recursos incrementais. Leia os arquivos atuais: o README pode estar desatualizado.

## Regras comerciais que não podem ser inventadas
- O público prioritário **já vive em Londres**. Nunca descrever o negócio como destinado principalmente a quem está se mudando para Londres pela primeira vez.
- Imóveis só aparecem no catálogo se `status='available'`, `hidden=false` e `validation_status='ok'`; nunca transformar testes/rascunhos em anúncios públicos.
- Existência de fotos não comprova disponibilidade, endereço, preço ou comodidades.
- Preços, depósitos, datas e condições variam por imóvel; mostrar apenas o que estiver confirmado no banco.
- Não expor landlord, comissões, notas internas, contato privado ou endereço exato não autorizado.
- `Pague com a chave na mão` é um diferencial da comunicação, mas não deve ser apresentado como proteção jurídica/garantia universal; confirmar condições no atendimento.
- Não criar depoimentos, números de clientes ou métricas fictícias.
- WhatsApp é o principal canal de conversão. O formulário de procura deve ser curto (tipo, pessoas, orçamento, região, data; residente em Londres ou fora).
- Clientes que procuram com muita antecedência entram em acompanhamento, sem promessa de reserva do imóvel.

## Identidade visual
- Marca: **André Mendes | London Rooms** (material gráfico fornecido pelo proprietário, com símbolo de casa, localização e cores laranja, cinza escuro e branco).
- Priorizar visual premium e moderno, fotografias reais, excelente tipografia, contraste acessível e responsividade mobile.
- **Não inventar nem redesenhar a logo** se o arquivo original ainda não estiver em `public/`: marcar a pendência de upload e manter fallback textual.
- O padrão visual atual em azul e dourado pode ser refinado, mas a marca real laranja/cinza deve orientar a harmonização.

## Regras de mídia
- Galerias respeitam `property_photos.sort_order`; primeira foto é capa.
- Fotos do mesmo ambiente devem aparecer juntas. A versão gratuita usa agrupamento visual e etiquetas opcionais `room_group`; isso não é reconhecimento semântico perfeito.
- Não depender de uma API paga para o lançamento; rota Anthropic existente é opcional, não está ativada.
- Não apagar fotos originais, alterar imagens ou associar fotos automaticamente a imóveis sem confirmação de postcode + unidade.

## Qualidade e trabalho
- Antes de implementar: auditar o estado real do repositório e preservar recursos funcionando.
- Entregar em blocos comerciais completos: páginas públicas/idiomas, depois administração e segurança, depois QA e lançamento.
- Rodar `npm ci` quando lockfile estiver disponível; `npx tsc --noEmit`, `npm run build` e testes relevantes. Documentar impedimentos (por exemplo, falta de variáveis).
- Não adicionar serviços pagos, analytics invasivos, APIs externas, novas dependências pesadas ou mudanças destrutivas sem necessidade e aprovação.
- Verificar acessibilidade, navegação mobile, links WhatsApp, mensagens de erro, segurança de acesso e dados.
- Nunca publicar a `main`, executar migrações no Supabase de produção ou gerar custos sem autorização.
- Em cada entrega: lista de arquivos alterados, testes executados e resultados, riscos/pendências e passos mínimos para validar.
