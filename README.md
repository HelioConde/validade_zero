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
