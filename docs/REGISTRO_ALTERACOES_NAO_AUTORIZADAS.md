# Registro de alterações não autorizadas — André Mendes Rooms

## Registro 001 — ALTERAÇÃO NÃO AUTORIZADA

**Registrado em:** 16/11/2026
**Status:** ALTERAÇÃO NÃO AUTORIZADA PELO PROPRIETÁRIO
**Origem:** mudanças realizadas pelo assistente durante o desenvolvimento do lançamento, no PR #3, branch `painel-admin`.

### Mudanças questionadas
1. **Página inicial:** remoção da imagem automaticamente selecionada da galeria de imóveis e substituição do banner por composição da marca.
2. **Painel administrativo:** adição do botão **“Retirar foto do anúncio”**, que desvincula uma fotografia do anúncio sem apagar o arquivo original do Supabase Storage.

### Motivo do registro
O proprietário esclareceu que sua solicitação original tratava **exclusivamente da sequência de fotografias dentro da galeria de cada imóvel**: depois de sair de um ambiente (por exemplo, quarto) e passar para outro (cozinha ou banheiro), o primeiro ambiente não pode aparecer novamente mais adiante. As duas mudanças acima foram implementadas sem uma autorização específica para alterar a página inicial ou adicionar um comando de retirada de fotos.

### Determinação e limites
- **Não interpretar as mudanças deste registro como aprovadas.**
- **Não incorporar essas mudanças ao lançamento em produção sem aprovação explícita e específica do proprietário.**
- Manter distinção entre a alteração não autorizada acima e o requisito legítimo de **agrupar fotografias por ambiente sem repetição**.
- Este documento é um **registro de auditoria**, não uma autorização para executar exclusões, fazer deploy ou alterar a `main`.
- **Nenhum rollback foi solicitado neste registro**: eventual reversão deverá ser tratada de forma controlada, sem apagar dados de anúncios ou fotos reais.

### Referências técnicas
- PR #3: https://github.com/andremendesrooms/rooms/pull/3
- Arquivos envolvidos: `app/page.tsx` e `components/admin/PropertyPhotosEditor.tsx`.
