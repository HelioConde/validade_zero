# Notificações Web Push — Validade Zero

## Regra de horário
A preferência é por usuário, não pelo horário de um produto individual.

- O banco registra cada novo lote em um agregado por dia e turno, sem gravar nomes de produtos no histórico de atividade.
- Manhã vai de 05h até 11h59; tarde de 12h até 18h59. Período noturno não altera a comparação manhã/tarde.
- Janela móvel dos últimos 30 dias. Cada dia contribui no máximo com cinco cadastros por turno.
- Maioria matinal (ou empate): 07h; maioria à tarde: 13h. Um cadastro isolado à tarde não muda uma rotina predominante de manhã.
- A preferência automática pode ser substituída manualmente por 07h ou 13h.
- O fuso horário IANA é obtido do aparelho ao ativar e armazenado no Supabase.

## Regras de envio
- Apenas contas Supabase autenticadas e com permissão explícita do navegador.
- Um resumo de lotes vencendo hoje e lotes já vencidos ainda não avisados (até 30 dias).
- Deduplicação por dispositivo, lote e data de vencimento: nunca enviar repetidamente o mesmo lote para aquele aparelho.
- O backend agenda na janela local de 07h00–07h14 ou 13h00–13h14; precisão exata depende do sistema de push.
- Os lotes e assinaturas permanecem privados. Os avisos incluem quantidade, não nome ou fotografia.
- O modo sem login continua local e sem push remoto, pois não tem identidade/estoque no servidor.
- No iPhone, o site pode precisar ser instalado na Tela de Início.

## Configuração administrativa obrigatória (Supabase)

A Edge Function validadezero-push foi implantada sem segredos. Ela responde 503 para chave pública enquanto não houver configuração Web Push, e 401 ao receber um disparo sem credencial. Esse é o comportamento de segurança esperado.

1. No Dashboard do Supabase, projeto bnlvvsjgpywpbfhwdcan, abra Edge Functions > Secrets.
2. Cadastre a variável VZ_VAPID_KEYS_JWK com um par P-256 no formato JSON JWK (propriedades publicKey e privateKey). Gere em ambiente privado; não envie chave privada para GitHub ou chat. Com Deno:

   import * as webpush from "jsr:@negrel/webpush@0.5.0";
   const pair = await webpush.generateVapidKeys({ extractable: true });
   console.log(JSON.stringify(await webpush.exportVapidKeys(pair)));

3. Cadastre VZ_CRON_TOKEN com uma senha aleatória longa (pelo menos 32 bytes) nesse mesmo painel.
4. No Supabase SQL Editor, adicione ao Vault o MESMO segredo VZ_CRON_TOKEN e a URL do projeto (substitua SEU_TOKEN_PRIVADO):

   select vault.create_secret('SEU_TOKEN_PRIVADO','vz_push_cron_token');
   select vault.create_secret('https://bnlvvsjgpywpbfhwdcan.supabase.co','vz_push_project_url');

5. Somente após configurar os segredos, ative o cron PostgreSQL:

   select cron.schedule('validadezero-push-expiry','*/5 * * * *',$job$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name='vz_push_project_url') || '/functions/v1/validadezero-push',
       headers := jsonb_build_object('Content-Type','application/json','x-vz-cron-token',
         (select decrypted_secret from vault.decrypted_secrets where name='vz_push_cron_token')),
       body := '{}'::jsonb,
       timeout_milliseconds := 10000
     );
   $job$);

O projeto já tem pg_cron, pg_net e Vault habilitados. A função só considera usuários que ativaram notificações. Não coloque o token cron ou VAPID privado em arquivos versionados.

## Testes recomendados
1. Na conta logada e com navegador compatível, clique Ativar notificações push e autorize.
2. Cadastre 3 dias pela manhã e um lote à tarde; horário previsto deve continuar 7h.
3. Cadastre mais lotes à tarde por dias diferentes para identificar 13h quando esse turno dominar.
4. Registre um lote com validade hoje, aguarde o horário habitual, confira a entrega.
5. Verifique cron.job_run_details e logs da Edge Function; qualquer erro 401 ou 503 indica segredo incompleto.
6. Para desativar, use Desativar alertas. O usuário também pode revogar permissão pelo navegador.

## Limites
O horário de entrega não é garantido ao minuto. O usuário precisa ter optado por push, ter assinatura válida, o aparelho precisa permitir notificações e a rede deve estar disponível. Cadastros antigos não geram retroativamente eventos de turno.
