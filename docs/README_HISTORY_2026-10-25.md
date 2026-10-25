# Histórico da documentação — validade_zero

> Versão anterior do README preservada em 25/10/2026. Para o início rápido e estado atual, consulte [README principal](../README.md).

---

# Validade Zero — Controle de validade para o varejo

**Acompanhe lotes e vencimentos de produtos com buscas, filtros e organização por data de validade.**

![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white) ![Status](https://img.shields.io/badge/status-MVP%20em%20evolução-64748b)

## Visão geral

O projeto ajuda equipes de lojas a registrar lotes, identificar vencimentos próximos e priorizar produtos pelo método **FEFO** (primeiro a vencer, primeiro a sair). Há um modo local para experimentação; o repositório também documenta a integração com Supabase para persistência autenticada.

| Recurso | Observação |
| --- | --- |
| Gestão de lotes | Cadastro, edição, filtros e alertas visuais |
| Busca de produtos | Catálogo local por código/EAN e identificação rápida |
| Dados locais | `localStorage`, sujeito à limpeza do navegador |
| Persistência remota | Integração Supabase documentada abaixo; verificar configuração antes de produção |
| Saída de dados | Exportação CSV e backups JSON |

**Teste local:** com Node.js e npm instalados, execute `npm ci` e `npm start`. Acesse `http://localhost:3000`.

> **Atenção:** não confie exclusivamente no armazenamento local para dados operacionais. Faça backups e valide permissões, integração, privacidade e procedimentos de segurança alimentar antes de usar em produção.

[**Ver versão GitHub Pages**](https://helioconde.github.io/validade_zero/) · [**Documentação de design**](docs/DESIGN_SYSTEM.md)

---

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


## Persistência Supabase (produção)

O GitHub Pages usa Supabase no build de produção com uma chave **publishable** (pública, não secreta). Duas tabelas exclusivas, `public.validadezero_catalogo` e `public.validadezero_lotes`, possuem políticas RLS vinculadas a `auth.uid()`. Cada usuário acessa somente os seus registros; não existe sincronização entre contas de funcionários nesta versão.

- Entre com e-mail e senha, ou crie conta e confirme e-mail quando solicitado. Caso o e-mail de confirmação não volte ao site, configure `https://helioconde.github.io/validade_zero/` em **Authentication > URL Configuration > Redirect URLs** no Supabase.
- Ao autenticar, importe o catálogo CSV corrigido. A importação salva lotes de 200 produtos e atualiza registros de mesmo EAN, mantendo `photo_path` sem alteração. O arquivo real **não é publicado** no GitHub.
- Para migrar lotes que já existiam no navegador, use **Migrar lotes para a nuvem**. A operação preserva os registros locais como backup e ignora IDs já cadastrados.
- Na nuvem, cadastrar, editar, excluir, pesquisar, exportar e restaurar lotes usa Supabase; restauração é **aditiva**, sem excluir lotes antigos.
- Caso fique sem internet, as operações remotas mostram erro e não gravam alterações apenas no navegador; reconecte-se e repita.
- Em desenvolvimento local, sem `.env.production`, o modo legado mantém armazenamento local. Os testes Playwright usam `REACT_APP_CLOUD_MODE=off` para simular esse modo sem credenciais.
- Nunca utilize `service_role` ou chave `sb_secret_` no navegador, `.env.production` nem em GitHub Pages.

Detalhes em [docs/SUPABASE.md](docs/SUPABASE.md).


## Leitura por câmera (fase inicial)

Depois de entrar e importar o catálogo, use **Escanear EAN** para abrir a câmera e buscar o produto automaticamente. Quando a API de detecção nativa não existir, o site tenta ZXing. Se a câmera for negada, digite o EAN.

No formulário do lote, **Ler validade pela câmera (OCR)** abre a câmera, permite fotografar ou escolher imagem existente e extrai sugestões de datas usando Tesseract.js. O usuário **sempre confirma a data** antes de cadastrar o lote. Nenhuma foto do OCR é enviada ao Supabase.

Documentação de compatibilidade, privacidade e limites: [docs/SCANNERS.md](docs/SCANNERS.md).


## Fotos de produtos (Supabase Storage)

Após pesquisar um EAN com login, o site oferece tirar foto caso ainda não exista imagem desse produto. A foto é comprimida e armazenada no bucket privado validadezero-produtos, e será reutilizada nas próximas consultas. Caso já exista uma imagem, a ação é Trocar foto. As imagens do OCR de validade continuam locais e não são enviadas. Consulte docs/FOTOGRAFIAS.md para detalhes.


## Experimente sem login — versão local no GitHub Pages

O Validade Zero abre **direto no modo de teste local** para visitantes sem sessão ativa. Não precisa criar conta, conectar ao Supabase ou fornecer e-mail. É possível cadastrar, editar e filtrar lotes, importar CSV de EAN, escanear código de barras e usar OCR de validade no próprio navegador. Os dados ficam no localStorage somente daquele navegador, **não** são sincronizados; fotos persistentes do produto continuam exclusivas do modo nuvem. A captura de câmera/OCR pode exigir HTTPS, permissão e download das bibliotecas.

Na faixa **Teste o Validade Zero antes de criar uma conta**, o botão **Salvar na nuvem** abre o login/cadastro sem excluir nada do modo local. O formulário de login tem **Continuar sem login** para voltar imediatamente ao teste. Após entrar, a opção **Migrar dados locais para a nuvem** copia tanto os lotes quanto o catálogo; registros remotos existentes de mesmo ID/EAN **não são sobrescritos**, e o conteúdo local é preservado. Se a cópia falhar no meio, a operação é repetível com segurança. O uso da nuvem continua opcional.

Visitantes devem baixar o backup JSON regularmente: limpeza dos dados do navegador, troca de aparelho, navegação privada ou redefinição do perfil podem apagar a cópia local. Usuários com sessão Supabase válida continuam entrando automaticamente na nuvem ao revisitar.

Esta é a experiência de aquisição "teste antes do cadastro". Sem rastreamento comportamental ou telemetria invasiva.


## Catálogo público central sem login (19.175 produtos)

A base de referência para EAN e códigos internos foi importada ao banco na tabela `validadezero_catalogo_central`. **Qualquer visitante pode consultar o produto por EAN sem criar conta e sem importar o CSV**. A busca prioriza o catálogo local/privado do usuário e consulta o catálogo público somente quando o código não está nele. O servidor retorna somente nome, código, setor e indicador de revisão; não tem acesso aos seus lotes.

Exemplo confirmado na importação: `7898276970072` → `ESPUMANTE CASA VALDUGA 750ML 130 ANOS` (`Bebidas`). Dados importados do catálogo do projeto, não de uma fonte oficial de validação GS1; conferir nomes, códigos e setores nas operações reais.

Para registrar foto quando um produto foi encontrado no catálogo central, usuários autenticados podem **Adicionar ao meu catálogo e habilitar foto**. Veja [docs/CATALOGO_CENTRAL.md](docs/CATALOGO_CENTRAL.md). A versão local continua sem login e os lotes continuam salvos só no navegador.


## EAN obrigatório e câmera nos dois campos

Para **criar ou editar** um lote, informe um **EAN/código interno numérico de 1 a 14 dígitos**. O campo é obrigatório e não permite salvar vazio nem com letras. O ícone de câmera fica dentro do campo e abre o mesmo scanner EAN usado na identificação rápida. Na identificação rápida, o ícone também aparece ao lado do código, sem precisar de botão separado. A captura preenche o campo; a data de validade continua sendo confirmada separadamente via OCR ou digitação.

Por compatibilidade, lotes antigos que já existam sem código continuam legíveis no histórico e nos backups, mas ao editá-los será necessário preencher o EAN/código interno antes de salvar. Códigos internos numéricos curtos do catálogo continuam aceitos e zeros à esquerda são preservados.


## Scanner no campo de validade e fotografia automática do EAN

- O botão **Ler validade pela câmera** fica **dentro do input Data de validade**, ao lado do seletor de data. O OCR continua mostrando datas candidatas e só preenche o input após escolha explícita. Nenhuma fotografia do rótulo é enviada ao servidor.
- Ao escanear o EAN no formulário ou buscá-lo em Identificação rápida, a aplicação procura nome e setor no catálogo particular/local e depois no catálogo central. Quando existe **foto do produto**, mostra a imagem. Se não existir, oferece **Cadastrar foto com câmera** ou escolher uma imagem.
- **Modo sem login:** fotos JPEG comprimidas ficam no **IndexedDB** local, associadas ao código, e reaparecem nas buscas no mesmo navegador. Elas não são publicadas nem sincronizadas; limpar dados do navegador as apaga, e o backup JSON de lotes não inclui fotos.
- **Conta Supabase:** a primeira fotografia de um produto do catálogo central associa automaticamente o código ao catálogo privado da conta antes de enviar a imagem para o Supabase Storage com RLS. A imagem privada reaparece quando o EAN é encontrado novamente nessa conta.
- Se o EAN não existir no catálogo, é possível informar o nome manualmente no formulário e capturar a imagem. A foto é opcional e não bloqueia o cadastro do lote.
- Testar a câmera e a leitura de embalagens reais em Android/iPhone; os testes automatizados usam câmeras e fotos simuladas.


## Foco automático do leitor EAN (dispositivos móveis)

O leitor tenta selecionar a câmera traseira com resolução ideal Full HD. Após abrir, consulta as capacidades reais do dispositivo com `MediaStreamTrack.getCapabilities()` e pede `focusMode: continuous` via `applyConstraints` quando disponível; caso contrário tenta `auto`. Em aparelhos que não permitem controlar o foco por API, a câmera continua operando normalmente, com instruções de distância e iluminação. **O site não pode obrigar o hardware a focar se o navegador não expuser o recurso.**

A imagem tem moldura para centralizar o EAN. Se o aparelho oferecer ajuste de foco, aparece o botão **Reajustar foco**; se oferecer zoom óptico/digital por API, aparece controle **Zoom**; se suportar lanterna, **Ligar luz**. Os controles não suportados ficam ocultos, e qualquer falha de ajuste não interrompe a leitura. O mesmo scanner é usado na Identificação rápida e no cadastro de lote. A câmera é liberada após reconhecimento ou fechamento.

Testes unitários de capacidades e limites de zoom; Playwright com APIs de câmera simuladas. Verificar o foco físico num smartphone Android/iPhone real antes de concluir a validação do dispositivo.


## Push inteligente de vencimentos (Supabase)

Clientes com login podem optar por notificações Web Push. A preferência automática considera os últimos 30 dias de cadastros (peso diário limitado): se o usuário costuma cadastrar de manhã, o resumo é enviado às 07h, mesmo que tenha registrado pontualmente um produto vencido à tarde. Para quem atua mais à tarde, o aviso vai às 13h. Também existe escolha manual de turno. Alertas são deduplicados por vencimento e dispositivo.

O backend (tabelas privadas e Edge Function validadezero-push) foi implantado. A entrega automática só ficará operacional após o administrador cadastrar os segredos Web Push e ligar o cron conforme docs/PUSH.md. O modo local não envia push remoto.
