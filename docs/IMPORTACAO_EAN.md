# Integração segura do catálogo corrigido

## Origem dos dados
All0.xlsx não trazia cabeçalho nem setor; continha nomes e códigos numéricos. O catálogo corrigido foi entregue em arquivos locais para o proprietário, sem publicar seus 19.175 registros.

**Não versionar XLSX ou CSV contendo a base real em um repositório público.** A interface importa o arquivo que o usuário seleciona, permanecendo no armazenamento local do navegador. O repositório inclui somente código e testes com dados fictícios.

## CSV aceito
Cabeçalho: codigo;nome;setor_sugerido;revisar

- Obrigatórios: codigo e nome. O setor sugerido e a marcação de revisão são opcionais.
- Aspas e delimitadores ; ou , são aceitos, assim como BOM UTF-8.
- Código de 1 a 14 dígitos é mantido como string; códigos internos também são admitidos.
- Linhas inválidas e duplicatas de código são ignoradas e contabilizadas, sem sobrescrever outros registros.
- Setor só será usado se corresponder a opção existente. Ausente ou não reconhecido fica vazio para confirmação.
- Esta fase não envia dados para servidores e não compartilha produtos entre dispositivos.

## Próximas etapas
1. Banco de dados isolado por empresa/loja, autenticação e RLS.
2. Importação administrativa com auditoria e busca centralizada por EAN.
3. Leitura do EAN por câmera com alternativa de digitação/leitor externo.
4. OCR da validade com revisão humana antes de salvar.
5. Fotografias associadas ao cadastro, com regras de permissão e substituição.

Não confundir produto (EAN, nome, foto, categoria) com lote (identificador, vencimento, quantidade, movimentações). Um EAN comum não contém data de vencimento.
