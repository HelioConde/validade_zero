# Auditoria UX/UI e acessibilidade — 2026-10-20

## Estado inicial (antes do PR)
1. A navegação mobile zerava o font-size e ficava visualmente reduzida a ícones; baixa descoberta e alvos pequenos.
2. Font-size de 10–12px usado em quase todas as tabelas e controles, com pouca diferenciação de hierarquia.
3. Regras de CSS em uma linha, valores repetidos e nenhuma fonte de design tokens.
4. Formulário exibia um erro genérico, sem \`aria-invalid\`, \`aria-describedby\` ou foco no campo incorreto.
5. Sem link para pular ao conteúdo principal.
6. Tabela era rolável em mobile, mas sem foco de teclado no contêiner.
7. Mudar filtros durante edição descartava o formulário sem solicitar confirmação.
8. Apenas Jest/React Testing Library — sem navegação real nem screenshots padronizadas.
9. O build estático e Pages existiam, mas não havia teste de viewport antes do deploy.

## Mudanças implementadas
- Tokens centralizados, ícones SVG reutilizáveis, contraste semântico de estados.
- Sidebar responsiva com rótulos sempre visíveis; alvos móveis 44–48px.
- Foco visível, saltar conteúdo, formulário campo a campo e feedback com região viva.
- Confirmação para evitar perda acidental de alterações em andamento.
- Limpeza de filtros e estado vazio com recuperação.
- Testes de cadastro/validação e Playwright desktop/mobile; screenshots e artefatos de falhas via GitHub Actions.

## Critérios de aceite
- [ ] Jest e build passam no PR.
- [ ] Playwright: desktop 1440×900 e mobile 390×844 executam sem erros de script.
- [ ] Cadastro, filtros, edição, exclusão e busca passam no navegador.
- [ ] Capturas de estado vazio e com registros ficam disponíveis para revisão.
- [ ] A home do Pages atualiza apenas depois de testes e merge revisado.

## Limites
A aplicação continua estática, usa localStorage e não tem autenticação, sincronização, auditoria nem banco de dados. Não inserir dados reais ou pessoais sensíveis nessa versão.
