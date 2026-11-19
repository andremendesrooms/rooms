# André Mendes Rooms — Exclusão permanente com duas confirmações

## Objetivo e interface
- Na tela **Admin → Imóveis**, escolha o filtro **Arquivados (recuperáveis)**.
- A opção **Excluir permanentemente** só aparece para `super_admin` em imóveis **arquivados e ocultos**.
- **Confirmação 1:** janela explica que o cadastro e fotos serão apagados sem recuperação pelo painel.
- **Confirmação 2:** a pessoa deve digitar a **referência exata do imóvel**.
- O servidor também exige JWT válido, `admin_users.active=true`, `role=super_admin`, status arquivado, `hidden=true`, versão `updated_at` inalterada, referência e frase de confirmação exatas.
- Arquivar continua sendo a exclusão reversível, disponível a gestores e administradores.

## Habilitação necessária — não foi executada automaticamente
O código está na branch `painel-admin`. **Esta funcionalidade não está operacional até que as etapas a seguir sejam feitas e testadas:**

1. Revisar o SQL `supabase/migrations/007_permanent_delete_archived_property.sql` e executá-lo no Supabase correto por operador autorizado. **Executar a migration não apaga nenhum imóvel**. A função SQL só apaga ao ser invocada com autenticação, autorização e confirmações corretas.
2. Configurar **`SUPABASE_SERVICE_ROLE_KEY` APENAS no ambiente do servidor** (Netlify Functions para produção; `.env.local` ignorado pelo Git em ambiente local). Nunca usar o prefixo `NEXT_PUBLIC_`, registrar valores em commits, prints ou mensagens.
3. Reiniciar o ambiente local/reimplantar o ambiente aprovado para carregar a variável.
4. Homologar com **um imóvel de teste criado especificamente para isso**, já arquivado e com fotos próprias de teste; não testar com catálogo real de locações.
5. Verificar as policies de Storage, referências de outras tabelas, auditoria e eventuais dependências. Se um vínculo de banco impedir exclusão, a transação inteira deve falhar e os registros devem permanecer.
6. Aprovar separadamente publicação no Netlify/`main`. Esta implementação **não altera `main`**, não executa SQL em produção e não apaga nenhum imóvel.

## Funcionamento técnico
- O frontend chama `POST /api/admin/imoveis/[id]/excluir-permanentemente` somente após duas confirmações.
- A rota autentica o token de sessão, consulta o papel **no servidor** e usa RPC `admin_permanently_delete_archived_property` com JWT do usuário.
- A função SQL elimina **o registro de imóvel e os metadados das fotos numa única transação**, só se o imóvel estiver arquivado e oculto e nenhuma sessão tiver alterado sua versão.
- Uma fila privada `property_permanent_deletion_jobs` preserva caminhos da mídia para remover os objetos do bucket `property-images` após a transação.
- A chave de serviço do Supabase é usada somente no servidor para verificar pré-requisitos, ler a fila e **apagar arquivos do Storage**. Ela jamais é enviada ao navegador.
- Se a limpeza do Storage falhar, a exclusão do cadastro já aconteceu; o painel avisa que há arquivos pendentes e o botão **Concluir limpeza pendente** permite tentar novamente.
- Fotos de URL externa ou não reconhecida causam bloqueio **antes** da exclusão; não tentamos apagar arquivos de outro bucket, projeto ou imóvel.
- O limite preventivo é 500 fotos por imóvel; exceder o limite bloqueia a operação até revisão.
- A exclusão do cadastro não necessariamente apaga logs legais, registros de auditoria ou dados de terceiros em outras tabelas. Alguns registros podem bloquear a remoção por integridade referencial. Avaliar retenção legal antes de usar com imóveis reais.

## Segurança e limites
- Duas confirmações na interface **não substituem** a autorização server-side. A função SQL valida os mesmos critérios.
- Não existe opção de desarquivar/recuperar depois da exclusão definitiva.
- O botão fica oculto para `manager` e `agent`.
- A aplicação precisa de configuração de servidor e migração antes de o usuário poder excluir; se faltar algum item, deve mostrar erro e não apagar nada.
- Verificar rollback/backup do Supabase conforme plano contratado e política de retenção — nenhuma garantia de restauração é oferecida.
