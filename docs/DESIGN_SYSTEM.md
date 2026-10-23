# Validade Zero — Design System v3 (identidade Ofertamática)

## Direção (Taste / Awesome Design)
Interface operacional para varejo: **clara, rápida, serena e confiável**. O produto deve permitir identificar problemas antes de distrações estéticas. A identidade usa azul Ofertamática #1d63e9, cartões brancos e fundos azulados muito claros. Vermelho, âmbar, azul-petróleo e verde continuam indicando estados operacionais (vencido, urgente, atenção e em dia). Evitar efeitos decorativos sem função.

Fonte principal: **Inter** (com Segoe UI / fonte de sistema como fallback, sem carregar fontes remotas). Títulos com peso 760–780 e tracking levemente negativo. Texto legível a partir de 14px; metadados 11–12px só quando não forem informação primária.

## Fundamentos
Arquivo fonte da verdade: \`src/styles/tokens.css\`. A camada `src/styles/ofertamatica-theme.css` aplica a identidade à interface existente. Não duplicar cores, sombras e raios quando existir token reutilizável.

| Token | Valor | Aplicação |
| --- | --- | --- |
| \`--brand\` | \`#1d63e9\` | Botões, foco contextual, navegação selecionada |
| \`--brand-hover\` | \`#174fbc\` | Hover contrastante |
| \`--surface-canvas\` | \`#f4f7fb\` | Plano de fundo |
| \`--surface-card\` | \`#ffffff\` | Cards e painéis |
| \`--ink\` | \`#26344f\` | Texto |
| \`--ink-secondary\` | \`#566780\` | Subtítulos e descrições |
| \`--border\` | \`#d9e2ee\` | Divisórias |
| \`--danger\` | \`#a93337\` | Vencido / exclusão |
| \`--warning\` | \`#946114\` | Vence em 0–7 dias |
| \`--info\` | \`#216e83\` | Vence em 8–30 dias |
| \`--success\` | \`#146a4e\` | Em dia |

Escala de espaçamento: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Radius: 8, 12, 16, 20px. Usar sombras em duas camadas e bordas suaves.

## Componentes existentes
- **Sidebar + nav:** menu claro, seleção azul, rótulos sempre visíveis, \`aria-current\` na rota/visão escolhida; em mobile vira menu horizontal rolável.
- **Metric:** botão, não card passivo; cor + descrição da situação (jamais cor sozinha).
- **Insight:** destaca prioridade operacional e oferece próxima ação.
- **Form / Field:** rótulos acima, obrigatoriedade explícita, validação junto ao campo, \`aria-invalid\` e \`aria-describedby\`. Erro focaliza o primeiro campo inválido.
- **StatusPill:** 4 estados com mensagem textual e cor redundante.
- **Data table:** cabeçalho semântico, legenda acessível, scroll horizontal focalizável em telas pequenas.
- **Feedback:** região viva para mensagens de confirmação / erro.
- **Empty state:** instrução útil + ação primária para iniciar; lista vazia após filtro oferece reset.

## Responsividade
- \`>1250px\`: sidebar 256px, KPIs em 4 colunas.
- \`901–1250px\`: sidebar 220px e ações quebram linha.
- \`621–900px\`: navegação horizontal, KPIs em 2 colunas.
- \`<=620px\`: formulários de 1 coluna, campos com >=16px e ações >=44px; grade 2x2 para KPIs.
- Tabela permite rolagem horizontal **dentro do painel**; a página não deve desenvolver overflow horizontal.

## Qualidade (Web Interface Guidelines)
- Navegação por teclado e link “Pular para o conteúdo”; \`:focus-visible\` de alto contraste.
- Controle de alterações não salvas antes de sair do formulário, confirmação de exclusões e restauros.
- Formulário usa \`noValidate\` para mostrar erros personalizados, evita bloquear paste e usa nomes de campo / autocomplete coerentes.
- Elementos decorativos SVG com \`aria-hidden\` e botões com nomes textuais.
- \`prefers-reduced-motion\`, números tabulares, data/quantidades \`pt-BR\`, sem flash/scroll desnecessário.
- A navegação mobile deve preservar texto legível, não ocultar a informação em ícones.
- Testes unitários e E2E com Playwright são requisitos antes de mesclar mudanças importantes de UI.

Referência externa: [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines).

## Image to Code / referências visuais
A primeira rodada foi feita a partir do código e da estrutura da interface já publicada. **Nenhuma imagem externa foi enviada** como referência, portanto não foi possível avaliar fidelidade a uma screenshot fornecida. Capturas reais de Playwright entram nos artefatos da CI para comparação futura. Quando houver imagens aprovadas, documentar o estado-alvo por viewport e ajustar JSX/CSS sem inserir apenas screenshots ou elementos decorativos não funcionais.

## Escopo atual
Existe **um dashboard com estados de cadastro, edição, filtro, inventário e vazio**, não um sistema de múltiplas rotas React. Não introduzir “páginas” falsas apenas para multiplicar a UI. Expandir este sistema visual para páginas futuras como Relatórios e Equipe quando essas funções existirem de fato.

## Identidade atual — família Ofertamática

- Azul `#1d63e9` é a cor primária de botões, foco, links e seleção em fundo claro.
- Menu lateral branco, seleção azul e marca com nome escuro e detalhe azul; navegação mobile continua com rótulos.
- Superfícies, filtros e campos claros para leitura de EAN, lote, quantidade e validade.
- Vermelho, âmbar, azul-petróleo e verde indicam vencimento e sucesso, sempre com rótulos textuais.
- `src/styles/tokens.css` é a fonte de tokens; `src/styles/ofertamatica-theme.css` centraliza as adaptações visuais.
- O navegador e o manifesto PWA usam `#1d63e9`.
- O Ofertamática continua aplicativo separado; link externo em nova aba com `noopener noreferrer`. Não há compartilhamento automático de conta, dados ou sessão.
- Scanner, OCR, modo local, Supabase, cadastros e notificações Push permanecem intocados funcionalmente.
- Testar com Jest, compilação CRA e Playwright desktop/mobile antes do merge para a `main`.
