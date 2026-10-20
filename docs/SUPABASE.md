# Validade Zero — Supabase

## Projeto existente isolado
Instância Supabase: `pizzaria-db` (região São Paulo). Nenhuma tabela existente foi substituída. Os novos nomes começam por `validadezero_`.

### Tabelas
- `public.validadezero_catalogo`: `id uuid`, `user_id uuid`, `code text`, `name text`, `sector text`, `needs_review bool`, `photo_path text`, timestamps; índice único `(user_id, code)`.
- `public.validadezero_lotes`: `(user_id, id)` é chave composta; `name`, `code`, `sector`, `batch`, `quantity`, `expiration`, timestamps.

As políticas SELECT/INSERT/UPDATE/DELETE, em ambas, incluem `(select auth.uid()) = user_id`. O papel `anon` não tem SELECT nessas tabelas, e RLS está ativo. Conferido por consulta ao catálogo do Postgres.

## Frontend GitHub Pages
Somente `sb_publishable_` vai ao frontend, nos valores REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_PUBLISHABLE_KEY do build CRA, que são públicos por definição. NUNCA usar chave `sb_secret_`, service role ou senha de Postgres.

Nesta versão sem dependências npm novas, a aplicação usa API REST/PostgREST e GoTrue Auth por HTTPS, com sessão armazenada em uma chave específica do aplicativo. Há atualização do token de acesso usando refresh token, login e logout.

## Implantação
A configuração pública está no `.env.production` do repositório para que GitHub Pages possa gerar o bundle. O valor é chave publishable e não dá privilégio administrativo; a proteção depende de RLS.

O fluxo de e-mail pode exigir adicionar esta URL na allowlist de **Authentication > URL Configuration > Redirect URLs**:
`https://helioconde.github.io/validade_zero/`
O registro por e-mail pode exigir confirmação na caixa do usuário.

## Migração e importação
O CSV local corrigido com cerca de 19 mil produtos **não foi copiado ao repositório público e não foi importado sob uma conta desconhecida**. Para associar os produtos ao proprietário correto, primeiro entrar na aplicação e então importar o CSV. O sistema processa 200 linhas por envio, podendo repetir após falhas. Mantém fotos existentes e setor vazio onde não informado.

Lotes antigos são migrados explicitamente pelo botão de migração; a operação é aditiva (ignora IDs já existentes) e não remove os dados do localStorage.

## Limitações honestas
- Um usuário por escopo de dados; funcionários distintos ainda não compartilham catálogos/lotes.
- Sem armazenamento de fotografia (somente campo `photo_path`), sem scanner por câmera ou OCR da validade.
- Sem fila offline. Falhas de rede devem ser resolvidas antes de repetir as ações.
- Contas do Supabase são geridas pelo mesmo projeto que outros aplicativos, mas nenhuma tabela dos outros aplicativos é consultada.

### Importação segura preservando fotos
Para não apagar a futura fotografia de um produto durante a atualização de nomes/setores, o site chama a função SQL `public.validadezero_importar_catalogo(p_items jsonb)`, em blocos de até 200. A função usa `SECURITY INVOKER` (mantém RLS), exige `auth.uid()` e atualiza apenas nome, setor e indicador de revisão. `photo_path` não é modificado. Execução é revogada de `anon` e concedida somente a `authenticated`.
