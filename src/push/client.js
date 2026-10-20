import { preferredPushPeriod, pushScheduleLabel } from './schedule';

const URL_BASE = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '';

export function pushSupported() {
  return typeof window !== 'undefined' && window.isSecureContext &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function toVapidBytes(raw) {
  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export async function getPushPublicKey(fetcher = fetch) {
  if (!URL_BASE || !KEY) throw new Error('A nuvem Supabase não está configurada.');
  const res = await fetcher(URL_BASE + '/functions/v1/validadezero-push', {
    headers: { apikey: KEY }
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.publicKey) throw new Error(
    'O servidor de notificações ainda não foi configurado. Informe ao administrador.'
  );
  return payload.publicKey;
}

export async function enablePush(cloud, userId) {
  if (!pushSupported()) throw new Error('Este navegador não oferece push em segundo plano. No iPhone, instale o site na Tela de Início.');
  // Pedir permissão somente após clique do usuário.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('As notificações não foram autorizadas neste navegador.');
  const publicKey = await getPushPublicKey();
  const swUrl = (process.env.PUBLIC_URL || '') + '/push-sw.js';
  const reg = await navigator.serviceWorker.register(swUrl, { scope: (process.env.PUBLIC_URL || '') + '/' });
  const subscription = await reg.pushManager.getSubscription()
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toVapidBytes(publicKey) });
  if (!subscription) throw new Error('Não foi possível registrar o dispositivo.');
  const json = subscription.toJSON();
  await cloud.upsertPushSubscription(userId, json);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  await cloud.savePushPreferences({ userId, enabled: true, timezone, preferred_period: 'auto' });
  return true;
}

export async function disablePush(cloud, userId) {
  await cloud.savePushPreferences({ userId, enabled: false });
  if (pushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration((process.env.PUBLIC_URL || '') + '/');
    const sub = await registration?.pushManager?.getSubscription();
    if (sub) {
      await cloud.deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
  }
}

export async function getPushStatus(cloud) {
  const [preferences, activity] = await Promise.all([cloud.getPushPreferences(), cloud.getPushActivity()]);
  const preference = preferences || { enabled: false, preferred_period: 'auto' };
  const period = preferredPushPeriod(activity, preference.preferred_period);
  return { ...preference, activity, period, schedule: pushScheduleLabel(period) };
}
