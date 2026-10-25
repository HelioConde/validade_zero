<div align="center">

<h1>📦 Validade Zero</h1>

<strong>Controle de vencimentos pensado para quem trabalha com produtos e lotes</strong>

<p>Pesquise por código EAN, cadastre validades, priorize vencimentos e organize a rotina de conferência.</p>

<a href="https://helioconde.github.io/validade_zero/"><img alt="Experimentar versão web" src="https://img.shields.io/badge/EXPERIMENTAR-Vers%C3%A3o%20Web-111827?style=for-the-badge"></a>

<p><a href="https://helioconde.github.io/validade_zero/"><strong>Abrir demonstração</strong></a> · <a href="#executar-localmente"><strong>Executar localmente</strong></a> · <a href="docs/README_HISTORY_2026-10-25.md"><strong>Histórico técnico</strong></a></p>

</div>

---

## Por que existe?

Controlar a validade de muitos produtos é uma tarefa repetitiva e sujeita a erros. O **Validade Zero** organiza os lotes e dá visibilidade ao que vence primeiro, com foco em uso rápido no varejo.

**Status:** MVP em evolução; há funcionalidades locais para demonstração e integrações com Supabase em desenvolvimento. A disponibilidade de sincronização, câmera, catálogo e notificações depende do modo de execução e da configuração do backend.

## Recursos centrais

| Área | Funcionalidade |
| --- | --- |
| **Lotes** | Registro de produto, setor, quantidade, lote e data de validade |
| **Prioridade** | Listagem FEFO (*first expired, first out*: primeiro a vencer, primeiro a sair) |
| **Alertas visuais** | Identificação de lotes vencidos e próximos do vencimento |
| **Identificação** | Busca por EAN/código interno e catálogo importado ou remoto, conforme configuração |
| **Câmera** | Fluxos experimentais de leitura de código e captura de validade em dispositivos compatíveis |
| **Dados** | Exportação CSV, backup/restauração JSON no modo local e persistência remota quando configurada |

O projeto pode ser experimentado **sem login**, mas isso não transforma automaticamente o armazenamento do navegador em um banco compartilhado.

## Como testar

**Web:** [Abrir no GitHub Pages](https://helioconde.github.io/validade_zero/).

**Local (Node.js e npm):**

```bash
git clone https://github.com/HelioConde/validade_zero.git
cd validade_zero
npm ci
npm start
```

A interface de desenvolvimento usa normalmente `http://localhost:3000`. Para validar o build:

```bash
CI=true npm test -- --watchAll=false
npm run build
```

A base do frontend usa React 18 / Create React App, ainda que a aplicação já inclua recursos complementares para câmera e integração com Supabase.

## Fluxo de uso

```text
Buscar / escanear EAN
        ↓
Reaproveitar identificação do produto
        ↓
Informar lote, quantidade e validade
        ↓
Salvar e consultar lista de vencimentos
        ↓
Priorizar retirada ou conferência
```

Quando um produto não existe no catálogo, é preciso completar ou revisar os dados. **A leitura de validade por imagem é assistida e deve sempre permitir conferência manual.**

## Segurança e limites

- O armazenamento em `localStorage` pertence ao navegador atual e pode ser perdido ao limpar dados do site.
- Para uso com vários funcionários, é necessário autenticação, políticas de acesso e persistência remota configuradas e verificadas.
- Faça backup antes de substituir o catálogo ou importar registros.
- Alertas e classificações **não substituem os procedimentos oficiais de segurança alimentar**.

## Documentação e evolução

[Design system](docs/DESIGN_SYSTEM.md) · [Auditoria UX](docs/UX_AUDIT.md) · [Documentação e integrações anteriores](docs/README_HISTORY_2026-10-25.md)

O foco do desenvolvimento continua sendo **agilidade no cadastro**, leitura por câmera, confiabilidade da identificação por EAN e controles adequados para utilização operacional.

---

<div align="center"><strong>Criado por <a href="https://github.com/HelioConde">Hélio Conde</a></strong></div>
