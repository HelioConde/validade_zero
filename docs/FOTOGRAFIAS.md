# Fotografias inteligentes do Validade Zero

## Comportamento

1. Entre na conta Supabase e pesquise um EAN já cadastrado.
2. Sem fotografia, a tela oferece Tirar foto e Escolher arquivo. A fotografia é opcional: o funcionário ainda pode cadastrar o lote.
3. O navegador converte JPG/PNG/WebP em JPEG comprimido de até 1200 pixels no maior lado e no máximo 2 MB, removendo os metadados da imagem.
4. O arquivo é enviado ao bucket privado validadezero-produtos. Apenas o caminho é salvo na coluna photo_path do cadastro do produto.
5. Na próxima busca pelo mesmo EAN na mesma conta, a foto existente é mostrada e não é solicitada novamente.
6. Trocar foto exige ação explícita do usuário. A antiga é removida pela API Storage após salvar a nova referência; erro de limpeza não bloqueia a foto nova.

## Segurança e privacidade

- Bucket não público, aceita só image/jpeg, limite de 2 MB.
- Caminho: UUID do proprietário / EAN / UUID aleatório.jpg.
- As políticas de storage.objects permitem SELECT/INSERT/DELETE apenas a usuários autenticados na própria pasta (auth.uid), sem acesso anônimo.
- Download autenticado pelo JWT do usuário. URL blob temporária é revogada quando a imagem sai da tela.
- RLS do catálogo restringe a atualização do photo_path à própria conta. A importação por CSV não sobrescreve a referência à foto.
- Foto de validade usada no OCR não é enviada ao bucket. É independente da foto de referência.

## Limites

- Formato HEIC precisa ser convertido para JPG/PNG/WebP antes de anexar.
- Fotos ainda são por conta, não compartilhadas entre funcionários distintos.
- Câmera do smartphone exige permissão e HTTPS.
- Testes automatizados simulam imagens e rede. Antes do uso profissional, testar em celulares reais Android/iPhone.
