# Catálogo central online por EAN (acesso sem login)

## Fonte
Arquivo de origem: `All0_catalogo_para_importacao.csv` (preparado a partir do All0.xlsx enviado pelo proprietário). Importação realizada administrativamente diretamente no Supabase; o catálogo real **não foi publicado como arquivo no GitHub**.

- Total importado: **19.175 códigos únicos**.
- 586 produtos com `needs_review=true` (nome e/ou código exigem revisão).
- 13.099 produtos com setor vazio: o usuário deve confirmar o setor ao criar o lote.
- Exemplo validado: `7898276970072` — `ESPUMANTE CASA VALDUGA 750ML 130 ANOS`, `Bebidas`.
- Códigos são armazenados como texto, sem perder zeros iniciais. A origem não é um cadastro GS1 oficial, e dados podem estar incompletos ou incorretos.

## Banco e acesso
Tabela: `public.validadezero_catalogo_central`. Campos `code`, `name`, `sector`, `needs_review`, `published`, `source`, `updated_at`.

RLS obrigatório; política de SELECT apenas em linhas `published=true` para `anon` e `authenticated`. Nenhum privilégio INSERT/UPDATE/DELETE concedido a esses dois papéis. Somente operação administrativa pode atualizar os nomes. Esta tabela **não contém lotes, validade, imagem, usuário, custos ou dados pessoais**. Os dados privados permanecem em `validadezero_catalogo` e `validadezero_lotes`, com RLS por `user_id`.

## Fluxo de pesquisa
1. Digitar ou escanear EAN/código interno com 1 a 14 dígitos.
2. Buscar primeiro no catálogo do próprio usuário (ou catálogo local do visitante), preservando correções individuais.
3. Quando não existir, consultar apenas as colunas públicas através do REST com chave publishable e **sem exigir login**.
4. Se encontrado, preencher nome, código e setor (quando houver) no formulário do lote. A data de validade, lote e quantidade exigem confirmação.
5. Se não encontrado ou servidor indisponível, manter cadastro manual e dados já armazenados.
6. Usuários logados podem optar por adicionar um item central ao próprio catálogo para salvar uma fotografia no Storage privado. Esta operação ignora códigos já presentes e preserva eventuais fotos existentes.

O modo local acessa a internet *somente quando a pessoa inicia a pesquisa por um código desconhecido*. Não envia o CSV local, lote ou validade ao Supabase. Não é um modo offline integral para a pesquisa pública.

## Testes de segurança
Confirmar `relrowsecurity=true`, `anon SELECT=true`, `anon INSERT=false`, `authenticated UPDATE=false`. Auditorias RLS adicionais podem ser verificadas no Supabase Dashboard.
