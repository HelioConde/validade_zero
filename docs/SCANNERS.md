# Scanner de EAN + reconhecimento OCR da validade

## Objetivo operacional
1. Entre na conta Supabase e importe o catálogo corrigido por CSV.
2. Clique em **Escanear EAN** e aponte a câmera para o código de barras.
3. Aguarde a busca automática pelo código reconhecido.
4. Confira o produto e clique em **Cadastrar lote deste produto**.
5. Clique em **Ler validade pela câmera (OCR)**, enquadre a validade ou escolha uma fotografia.
6. Confira as datas sugeridas e **escolha manualmente** a correta.
7. Informe lote e quantidade, confira o setor e salve.

## Compatibilidade e alternativas

- A câmera requer permissão e HTTPS (GitHub Pages oferece HTTPS).
- O EAN usa BarcodeDetector nativo quando o navegador oferece EAN/UPC; caso contrário, carrega ZXing Browser v0.1.5 por CDN sob demanda.
- EAN-8, UPC-12, EAN-13 e GTIN-14 numéricos são aceitos após leitura por câmera. Códigos internos curtos continuam no campo de digitação.
- Quando a câmera estiver indisponível ou bloqueada, o usuário pode digitar o código e escolher imagem no OCR.
- O app fecha o stream de câmera na saída e após leitura.

## OCR e segurança

- Pode abrir a câmera ao vivo, usar o app de câmera do celular ou escolher uma imagem salva.
- Usa Tesseract.js 5.1.1, modelo eng, carregado sob demanda por CDN. Pode consumir memória e demorar no primeiro acesso.
- As fotos não são enviadas ao Supabase; o OCR e as imagens são processados localmente.
- A extração aceita somente datas completas e válidas, prioriza rótulos VAL/VENC/EXP. Datas de FAB/PROD/LOTE são ignoradas quando identificáveis.
- Datas parciais como 10/2026 não são completadas por suposição. Todas as sugestões exigem escolha explícita; não há salvamento automático.
- O reconhecimento pode errar em impressões apagadas, curvas, reflexos e múltiplas datas; conferência visual obrigatória.

## Ainda pendente
A foto de referência do produto será desenvolvida com Supabase Storage e acesso protegido, em etapa própria. A câmera do OCR não grava a foto.

## Testes
- Unitários para parsing de datas e validação de códigos.
- Playwright para câmera simulada, retorno manual, OCR simulado e exigência de escolha.
- Ainda é preciso teste físico em aparelhos iPhone/Android reais para validar iluminação e foco.
