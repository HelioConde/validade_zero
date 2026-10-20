# Validade Zero

Controle de validade de produtos por lote para equipes de supermercado. Primeira versão funcional (MVP) de retomada do projeto de 2023.

## Recursos

- Cadastro, edição e exclusão de lotes, com código/EAN opcional, setor, quantidade e validade.
- Dashboard com lotes vencidos, vencendo até 7 dias e entre 8 e 30 dias.
- Busca, filtros e lista ordenada por FEFO (primeiro a vencer, primeiro a sair).
- Exportação CSV, impressão da lista filtrada e **backup/restauração JSON** com confirmação de substituição.
- Testes automatizados de regras de calendário, classificações e cadastro.

## Executar localmente

Node.js 20 e npm:

~~~sh
npm ci
npm start
~~~

Abra http://localhost:3000. Para validar:

~~~sh
CI=true npm test -- --watchAll=false
npm run build
~~~

## Cuidados com os dados

Esta versão salva lotes **somente no localStorage do navegador atual**. Sem autenticação, servidor, sincronização, auditoria ou cópias automáticas. Limpar dados do navegador pode apagar registros. Exporte backups JSON regularmente e guarde-os de maneira segura; restauração substitui os registros locais após confirmação. CSV serve apenas como relatório e não restaura dados. Não substitui inspeções e procedimentos oficiais de segurança alimentar.

As métricas contam lotes (não perdas financeiras). Regras de dias: vencido antes de hoje; urgente 0 a 7 dias; atenção 8 a 30 dias; em dia acima de 30.

## Infraestrutura

A base original Create React App/React 18 foi mantida na primeira rodada para minimizar riscos; modernização do bundler é etapa futura. O antigo workflow FTP fazia envio de uma pasta compilada versionada, sem construir o código atual. Foi substituído por CI de testes e build, sem deploy automático. Credenciais, destino remoto e homologação da Locaweb devem ser conferidos antes de configurar novo deploy.

Os diretórios compilados históricos ainda existem no Git. Passam a ser ignorados para novos commits e poderão ser removidos em uma limpeza posterior.

## Próximas entregas

1. Backend com PostgreSQL/Supabase, login, controle por loja, RLS, histórico/auditoria, backup e recuperação.
2. Entradas/baixas, FEFO por quantidade e relatórios de perdas.
3. Impressão de pallet/etiqueta, QR Code e avisos configuráveis.
4. QA E2E com Playwright, acessibilidade, atualização de tooling e publicação segura.

## Publicação no GitHub Pages

Endereço previsto: https://helioconde.github.io/validade_zero/

O workflow `.github/workflows/pages.yml` faz testes, build e publicação automática após push na `main`. Para ativar na primeira vez:

1. Acesse **Settings → Pages → Build and deployment**.
2. Em **Source**, selecione **GitHub Actions**.
3. Confira a execução **Publish GitHub Pages** na aba **Actions**. Pode ser disparada manualmente por `workflow_dispatch`.
4. O site é público, mas cada navegador mantém seu próprio armazenamento local. Não existe banco de dados compartilhado ainda.

A propriedade `homepage` configura o prefixo `/validade_zero/` no build do Create React App. O fluxo não usa o FTP nem requer PAT ou credenciais de hospedagem.

## Design, acessibilidade e testes de navegador

- Padrão visual: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- Auditoria de UX: [docs/UX_AUDIT.md](docs/UX_AUDIT.md).
- Componentes e navegação mobile foram revisados com rótulos visíveis, alvos de toque maiores, foco e validação por campo.
- A verificação `.github/workflows/e2e.yml` executa Playwright (Chromium desktop e mobile), captura screenshots das telas vazia e populada, e publica HTML report/traces como artefato do GitHub Actions.

Para reproduzir localmente, após `npm ci`:

~~~sh
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
npx playwright test
npx playwright show-report
~~~

O Playwright abre um servidor de desenvolvimento isolado. Para inspecionar os artefatos de CI: GitHub → Actions → Playwright - UX e regressão → execução → `playwright-ux-report`. Em casos de erro, o relatório inclui traces, screenshots e vídeos.


## Catálogo de EAN e códigos internos (fase local)

A tela oferece **Importar catálogo CSV** e **Identificação rápida do produto**:

1. Prepare arquivo de cabeçalhos: codigo;nome;setor_sugerido;revisar (UTF-8, separado por ponto e vírgula).
2. Use Importar catálogo CSV. O catálogo fica apenas no localStorage do navegador (chave validade-zero:catalogo:v1); não é enviado ao GitHub Pages nem sincronizado entre funcionários.
3. Informe ou leia um código com um leitor de barras conectado ao teclado, clique Buscar produto e depois Cadastrar lote deste produto. O nome e setor são sugeridos. Validade, lote e quantidade são confirmados pelo funcionário.
4. EANs, GTINs e códigos internos são tratados como TEXTO: 000123 não é igual a 123.
5. O setor ausente fica vazio e exige confirmação, assim como itens assinalados para revisão.
6. Importação substitui apenas o catálogo neste navegador; não apaga lotes já cadastrados.

Limites: CSV até 8 MB, até 30 mil registros, sujeito a cota do navegador, sem autenticação, fotos, OCR nem sincronização. A câmera do celular e OCR de validade ficam para as próximas etapas. Nenhuma base real foi publicada no repositório.
