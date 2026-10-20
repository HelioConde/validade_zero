import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const allowHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-vz-cron-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...allowHeaders, 'Content-Type': 'application/json; charset=utf-8' }
});

let serverPromise: Promise<webpush.ApplicationServer> | null = null;
function vapidServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const keysText = Deno.env.get('VZ_VAPID_KEYS_JWK');
      if (!keysText) throw new Error('Chaves VAPID ainda não configuradas no projeto.');
      const keys = await webpush.importVapidKeys(JSON.parse(keysText));
      return webpush.ApplicationServer.new({
        contactInformation: 'https://helioconde.github.io/validade_zero/',
        vapidKeys: keys
      });
    })().catch(error => { serverPromise = null; throw error; });
  }
  return serverPromise;
}
function safePushHost(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'fcm.googleapis.com' || host === 'fcm-xm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'web.push.apple.com' || host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com')
    );
  } catch { return false; }
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: allowHeaders });
  if (req.method === 'GET') {
    try {
      const server = await vapidServer();
      return respond({ publicKey: await webpush.exportApplicationServerKey(server.vapidKeys) });
    } catch { return respond({ configured: false, message: 'Serviço push aguardando configuração.' }, 503); }
  }
  if (req.method !== 'POST') return respond({ error: 'Método indisponível.' }, 405);
  const token = Deno.env.get('VZ_CRON_TOKEN');
  if (!token || req.headers.get('x-vz-cron-token') !== token) {
    return respond({ error: 'Agendamento não autorizado.' }, 401);
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return respond({ error: 'Configuração interna ausente.' }, 503);
  let server: webpush.ApplicationServer;
  try { server = await vapidServer(); }
  catch { return respond({ error: 'VAPID não configurado.' }, 503); }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: pending, error: queryError } = await db.rpc('validadezero_push_pending');
  if (queryError) return respond({ error: 'Não foi possível consultar os alertas pendentes.' }, 500);
  let delivered = 0; let failures = 0;
  for (const row of pending || []) {
    if (!safePushHost(row.endpoint)) { failures++; continue; }
    try {
      const countToday = Number(row.today_count || 0);
      const countOverdue = Number(row.overdue_count || 0);
      const text = [
        countToday ? countToday + ' produto(s) vencem hoje' : '',
        countOverdue ? countOverdue + ' produto(s) já vencido(s)' : ''
      ].filter(Boolean).join(' • ');
      await server.subscribe({ endpoint: row.endpoint, keys: row.keys }).pushTextMessage(
        JSON.stringify({
          title: 'Validade Zero • Vencimentos',
          body: text || 'Confira os lotes com vencimento.',
          date: row.local_day
        }), { ttl: 86400 }
      );
      const { error: markError } = await db.rpc('validadezero_push_mark_sent', {
        p_subscription_id: row.subscription_id, p_items: row.lot_items
      });
      if (markError) failures++;
      else delivered++;
    } catch (error) {
      failures++;
      const msg = String(error?.message || '');
      if (/\b(404|410)\b/.test(msg)) {
        await db.from('validadezero_push_subscriptions').delete().eq('id', row.subscription_id);
      }
    }
  }
  return respond({ attempted: (pending || []).length, delivered, failures });
});
