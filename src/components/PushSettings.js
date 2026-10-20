import { useEffect, useState } from 'react';
import Icon from './Icon';
import { pushSupported, enablePush, disablePush, getPushStatus } from '../push/client';

export default function PushSettings({ cloud, user }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    getPushStatus(cloud).then(s => { if (active) setStatus(s); })
      .catch(() => { if (active) setMessage('Não foi possível consultar preferências de alerta.'); });
    return () => { active = false; };
  }, [cloud, user?.id]);

  async function toggle() {
    setBusy(true); setMessage('');
    try {
      if (status?.enabled) await disablePush(cloud, user.id);
      else await enablePush(cloud, user.id);
      setStatus(await getPushStatus(cloud));
      setMessage(status?.enabled ? 'Alertas push desativados.' : 'Notificações ativadas neste dispositivo.');
    } catch (error) { setMessage(error.message || 'Não foi possível alterar os alertas.'); }
    finally { setBusy(false); }
  }

  async function changePeriod(value) {
    if (!status) return;
    setBusy(true); setMessage('');
    try {
      await cloud.savePushPreferences({
        userId: user.id, enabled: status.enabled, timezone: status.timezone || 'America/Sao_Paulo', preferred_period: value
      });
      setStatus(await getPushStatus(cloud));
      setMessage('Preferência de horário atualizada.');
    } catch (error) { setMessage(error.message || 'Falha ao atualizar preferência.'); }
    finally { setBusy(false); }
  }

  return <section className="push-settings no-print" aria-label="Notificações inteligentes de vencimento">
    <div className="push-settings__heading"><Icon name="bell" size={19}/>
      <div><strong>Alertas inteligentes de vencimento</strong>
        <p>Um aviso no seu período habitual de cadastro, não no horário de um produto isolado.</p></div>
    </div>
    <div className="push-settings__controls">
      <span>Horário previsto: <strong>{status?.schedule || '7h'}</strong></span>
      <label>Período
        <select aria-label="Preferência do horário de notificações"
          value={status?.preferred_period || 'auto'} disabled={busy || !status}
          onChange={e => changePeriod(e.target.value)}>
          <option value="auto">Automático (atividade dos últimos 30 dias)</option>
          <option value="morning">Manhã — 7h</option>
          <option value="afternoon">Tarde — 13h</option>
        </select>
      </label>
      <button type="button" className="btn btn--outline" disabled={busy || !status || (!status.enabled && !pushSupported())}
        onClick={toggle}>{busy ? 'Atualizando…' : status?.enabled ? 'Desativar alertas' : 'Ativar notificações push'}</button>
    </div>
    <small>Somente para conta na nuvem e com permissão do navegador. Avisos são agrupados por vencimento e não são repetidos para o mesmo lote.</small>
    {message && <p role="status" className="push-settings__message">{message}</p>}
  </section>;
}
