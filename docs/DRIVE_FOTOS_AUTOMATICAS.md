# André Mendes Rooms — vínculo inventário ↔ fotos do Drive

## Fonte e estado (19/11/2026)
- Inventário interno: 300 registros de `Inventario_Atualizado_19-11-2026.json`.
- Pasta Drive: `LISTA ATUAL`, com subpastas landlord → postcode → unidade.
- Supabase de produção: `piavfxoxewaakkisqfpv`.
- Tabelas privadas: `inventory_source_records`, `drive_media_folders`, `drive_media_files`.
- 5 vínculos exatos, 81 arquivos na fila. 11 outras pastas indexadas para conferência.
- 5 registros de imóveis criados como `inactive`, `hidden=true`, `validation_status=incomplete`.
- Nenhuma foto transferida ou publicação efetuada até essa checagem.

## Regra obrigatória para vinculação exata
1. Landlord consistente; alias conhecido deve ser validado antes do match.
2. Postcode normalizado idêntico.
3. Unidade/quarto/studio/flat normalizada idêntica e não vazia.
4. Exatamente UM registro candidato no inventário.
5. Fotos provenientes exclusivamente da pasta atribuída àquela unidade.
6. Anúncio de destino permanece oculto até verificação comercial de preço, data e condições.
7. Pastas 'ALUGADO' e fotografias de testes devem ficar excluídas.

Sem unidade ou com duplicidade: `postcode_only`/`ambiguous`, nunca upload automático.
Pastas que não aparecem no inventário: `no_inventory_match`, nunca upload automático.

## Transferência controlada
- Worker `scripts/sync-drive-photos.mjs`, server-only, usa Google Drive readonly e Supabase service_role exclusivamente no servidor.
- Aceita somente imagens JPG/PNG/WEBP até 8 MB.
- Exige folder `exact` e link a imóvel `inactive + hidden + incomplete` com mesmo postcode + unidade.
- Sem `DELETE`, sem sobrescrita, sem atualização de preço/status/publicação.
- Caminho determinístico por ID do arquivo para facilitar repetição segura; metadados `property_photos` só depois do Storage.
- Atualiza a fila somente após sucesso; erro permanece pendente.
- Ordem comercial de capa deve ser revisada depois (a transferência não interpreta cômodos nem escolhe automaticamente a melhor foto).
- Bucket `property-images` é público por configuração do catálogo; não subir documentos pessoais ou fotos confidenciais.

## Credenciais necessárias — ainda NÃO configuradas
- `GOOGLE_DRIVE_SA_CLIENT_EMAIL`: e-mail da conta de serviço autorizada como Leitora da pasta original no Drive.
- `GOOGLE_DRIVE_SA_PRIVATE_KEY`: chave privada da conta de serviço.
- `SUPABASE_URL`: API de produção.
- `SUPABASE_SERVICE_ROLE_KEY`: segredo de servidor; jamais expor em `NEXT_PUBLIC_*` ou no navegador.

Guardar segredos APENAS no GitHub Actions Secrets / ambiente de servidor, nunca em arquivos versionados, logs ou chat.

`.github/workflows/import-matched-photos.yml` só permite disparo manual; recorrência automática depende de autorização específica e credenciais configuradas. A conexão Google Drive↔ChatGPT não concede acesso Google Drive ao GitHub/Netlify.

## Checklist para ativação
1. Criar conta de serviço no projeto Google Cloud do usuário com Drive API, sem ativar serviços pagos.
2. Conceder à conta apenas leitura da pasta de imóveis do Drive.
3. Instalar os segredos no ambiente do worker, sem compartilhá-los na conversa.
4. Habilitar usuário administrativo no Supabase (Auth e `admin_users`).
5. Testar 1 foto de imóvel oculto, conferir MIME, Storage e vínculo.
6. Executar lote pequeno; auditar 81 arquivos identificados e ordem editorial.
7. Só então avaliar execução automática e homologar antes de publicação.

## Limites atuais
- O worker e workflow estão somente na branch `painel-admin`, sem execução real por ausência de credenciais.
- Não modificar `main`/Netlify sem autorização e testes.
