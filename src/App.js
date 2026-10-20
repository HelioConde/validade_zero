import { useMemo, useState } from 'react';
import './App.css';
import {
  STORAGE_KEY, SECTORS, formatDate, isValidEntry, readEntries,
  sortByExpiry, statusLabel, statusOf, summarize, toCsv
} from './domain/validade';

const EMPTY = { name: '', code: '', sector: 'Mercearia', batch: '', quantity: '1', expiration: '' };
const FILTERS = [
  { id: 'all', label: 'Todos os lotes' },
  { id: 'expired', label: 'Vencidos' },
  { id: 'urgent', label: 'Até 7 dias' },
  { id: 'attention', label: '8 a 30 dias' },
  { id: 'ok', label: 'Em dia' }
];

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}

function StatusPill({ expiration }) {
  const status = statusOf(expiration);
  return <span className={'status status--' + status}><span className="status__dot" aria-hidden="true" />{statusLabel(expiration)}</span>;
}

function Metric({ name, value, description, kind, onClick }) {
  return (
    <button type="button" className={'metric metric--' + kind} onClick={onClick}>
      <span className="metric__label">{name}</span>
      <strong className="metric__value">{value.toLocaleString('pt-BR')}</strong>
      <span className="metric__description">{description} <span aria-hidden="true">↗</span></span>
    </button>
  );
}

function EntryForm({ initial, onSave, onCancel }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [error, setError] = useState('');
  function set(key, value) {
    setValues(current => ({ ...current, [key]: value }));
    if (error) setError('');
  }
  function submit(event) {
    event.preventDefault();
    const entry = {
      ...values,
      id: initial?.id || createId(),
      name: values.name.trim(),
      code: values.code.trim(),
      batch: values.batch.trim(),
      quantity: Number(values.quantity)
    };
    if (!isValidEntry(entry)) {
      setError('Preencha produto, setor, lote, quantidade positiva e uma validade válida.');
      return;
    }
    onSave(entry);
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <label className="field">Nome do produto *
        <input required autoFocus maxLength="120" value={values.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Leite integral 1 L" />
      </label>
      <div className="form-row">
        <label className="field">Código / EAN
          <input maxLength="60" value={values.code} onChange={e => set('code', e.target.value)} placeholder="Opcional" />
        </label>
        <label className="field">Setor *
          <select required value={values.sector} onChange={e => set('sector', e.target.value)}>
            {SECTORS.map(sector => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="field">Lote *
          <input required maxLength="70" value={values.batch} onChange={e => set('batch', e.target.value)} placeholder="Ex.: L-2026-001" />
        </label>
        <label className="field">Quantidade *
          <input required type="number" min="1" step="1" value={values.quantity} onChange={e => set('quantity', e.target.value)} />
        </label>
      </div>
      <label className="field">Data de validade *
        <input required type="date" value={values.expiration} onChange={e => set('expiration', e.target.value)} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--subtle" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary">{initial ? 'Salvar alterações' : 'Cadastrar lote'}</button>
      </div>
    </form>
  );
}

export default function App() {
  const [entries, setEntries] = useState(() => readEntries(window.localStorage));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const counts = useMemo(() => summarize(entries), [entries]);
  const visible = useMemo(() => sortByExpiry(entries).filter(entry => {
    const matchesStatus = filter === 'all' || statusOf(entry.expiration) === filter;
    const matchesSector = sector === 'all' || sector === entry.sector;
    const text = [entry.name, entry.code, entry.batch, entry.sector].join(' ').toLocaleLowerCase('pt-BR');
    return matchesStatus && matchesSector && text.includes(search.trim().toLocaleLowerCase('pt-BR'));
  }), [entries, filter, search, sector]);

  function persist(next, message) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
      setFeedback(message);
      setEditing(null);
      setShowForm(false);
    } catch {
      setFeedback('Não foi possível salvar neste navegador. Verifique o armazenamento disponível.');
    }
  }
  function save(entry) {
    const next = editing ? entries.map(existing => existing.id === editing.id ? entry : existing) : [entry, ...entries];
    persist(next, editing ? 'Lote atualizado com sucesso.' : 'Lote cadastrado com sucesso.');
  }
  function remove(entry) {
    if (window.confirm('Excluir o lote ' + entry.batch + ' de ' + entry.name + '? Esta ação não pode ser desfeita.')) {
      persist(entries.filter(item => item.id !== entry.id), 'Lote excluído.');
    }
  }
  function openForm(entry = null) {
    setEditing(entry);
    setShowForm(true);
    setFeedback('');
  }
  function exportCsv() {
    if (!entries.length) return;
    const blob = new Blob([toCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'validade-zero-lotes.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback('Relatório CSV exportado. Guarde uma cópia dos seus registros.');
  }
  function chooseFilter(next) {
    setFilter(next);
    setShowForm(false);
  }
  return (
    <div className="app">
      <aside className="sidebar no-print" aria-label="Menu principal">
        <div className="brand"><span className="brand__mark" aria-hidden="true">V<span>✓</span></span><span>Validade <strong>Zero</strong><small>Gestão inteligente</small></span></div>
        <div className="sidebar__group">GESTÃO</div>
        <nav className="nav" aria-label="Navegação">
          <button type="button" className={filter === 'all' && !showForm ? 'nav__item is-current' : 'nav__item'} onClick={() => chooseFilter('all')}><span aria-hidden="true">▦</span> Visão geral</button>
          <button type="button" className="nav__item" onClick={() => openForm()}><span aria-hidden="true">＋</span> Novo lote</button>
          <button type="button" className={filter === 'urgent' && !showForm ? 'nav__item is-current' : 'nav__item'} onClick={() => chooseFilter('urgent')}><span aria-hidden="true">◷</span> Vencendo em breve</button>
          <button type="button" className={filter === 'expired' && !showForm ? 'nav__item is-current' : 'nav__item'} onClick={() => chooseFilter('expired')}><span aria-hidden="true">⚑</span> Vencidos</button>
        </nav>
        <div className="sidebar__bottom"><span className="storage-indicator" aria-hidden="true" /> Dados neste dispositivo<br /><small>Versão inicial · Sem sincronização</small></div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="topbar__identity"><span className="topbar__eyebrow">PAINEL OPERACIONAL</span><span className="topbar__separator" aria-hidden="true">/</span><span>Controle de validade</span></div>
          <span className="topbar__local">◉ Armazenamento local</span>
        </header>
        <main className="main">
          <div className="heading">
            <div><p className="eyebrow">OPERAÇÃO / CONTROLE DE ESTOQUE</p><h1>Visão geral <span className="heading__spark" aria-hidden="true">✳</span></h1><p className="heading__intro">Acompanhe cada lote e priorize os produtos que vencem primeiro.</p></div>
            <button type="button" className="btn btn--primary no-print" onClick={() => openForm()}><span aria-hidden="true">＋</span> Nova entrada</button>
          </div>

          <section aria-label="Indicadores de validade" className="metrics">
            <Metric name="Lotes cadastrados" value={counts.total} description="Ver todos" kind="neutral" onClick={() => chooseFilter('all')} />
            <Metric name="Vencidos" value={counts.expired} description="Exigem avaliação" kind="danger" onClick={() => chooseFilter('expired')} />
            <Metric name="Até 7 dias" value={counts.urgent} description="Ação prioritária" kind="warning" onClick={() => chooseFilter('urgent')} />
            <Metric name="8 a 30 dias" value={counts.attention} description="Acompanhar" kind="info" onClick={() => chooseFilter('attention')} />
          </section>

          <div className="notice" role="note"><span aria-hidden="true" className="notice__icon">ⓘ</span><p><strong>Trabalhe pela validade mais próxima (FEFO).</strong> Esta versão armazena informações somente neste navegador. Não substitui procedimentos de segurança alimentar nem sincroniza dados entre funcionários.</p></div>
          {feedback && <p className="feedback" role="status">{feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso">×</button></p>}

          {showForm && <section className="form-panel no-print" aria-labelledby="form-title"><div className="section-heading"><div><p className="eyebrow">MOVIMENTAÇÃO</p><h2 id="form-title">{editing ? 'Editar lote' : 'Cadastrar novo lote'}</h2></div><button type="button" className="close-form" aria-label="Fechar formulário" onClick={() => setShowForm(false)}>×</button></div><EntryForm key={editing?.id || 'new'} initial={editing} onSave={save} onCancel={() => setShowForm(false)} /></section>}

          <section className="list-panel" aria-labelledby="list-title">
            <div className="section-heading"><div><p className="eyebrow">INVENTÁRIO / FEFO</p><h2 id="list-title">Lotes e vencimentos <span className="count-bubble">{visible.length}</span></h2><p className="section-subtitle">Ordenados automaticamente pela data de validade.</p></div>
              <div className="list-actions no-print"><button type="button" className="btn btn--outline" onClick={exportCsv} disabled={!entries.length}>↓ Exportar CSV</button><button type="button" className="btn btn--outline" onClick={() => window.print()} disabled={!entries.length}>⎙ Imprimir</button></div>
            </div>
            <div className="filters no-print">
              <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar produto, código, lote ou setor</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto, código ou lote..." /></label>
              <label className="sector-select"><span className="sr-only">Filtrar por setor</span><select value={sector} onChange={event => setSector(event.target.value)}><option value="all">Todos os setores</option>{SECTORS.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            </div>
            <div className="tabs no-print" role="group" aria-label="Filtrar por vencimento">{FILTERS.map(item => <button key={item.id} type="button" className={'tab' + (filter === item.id ? ' tab--active' : '')} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
            <div className="table-scroller">
              <table><thead><tr><th scope="col">Produto / Código</th><th scope="col">Setor</th><th scope="col">Lote</th><th scope="col">Quantidade</th><th scope="col">Validade</th><th scope="col">Situação</th><th scope="col" className="no-print">Ações</th></tr></thead><tbody>
                {visible.map(entry => <tr key={entry.id}><td><strong className="product-name">{entry.name}</strong><span className="product-code">{entry.code || 'Sem código'}</span></td><td>{entry.sector}</td><td className="table-mono">{entry.batch}</td><td>{entry.quantity.toLocaleString('pt-BR')} un.</td><td><span className="date-value">{formatDate(entry.expiration)}</span></td><td><StatusPill expiration={entry.expiration} /></td><td className="no-print"><div className="row-actions"><button type="button" onClick={() => openForm(entry)} aria-label={'Editar lote ' + entry.batch}>Editar</button><button type="button" className="danger-action" onClick={() => remove(entry)} aria-label={'Excluir lote ' + entry.batch}>Excluir</button></div></td></tr>)}
              </tbody></table>
            </div>
            {!visible.length && <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">{entries.length ? '⌕' : '▤'}</span><h3>{entries.length ? 'Nenhum lote encontrado' : 'Seu controle começa aqui'}</h3><p>{entries.length ? 'Experimente ajustar os filtros ou sua busca.' : 'Cadastre o primeiro produto para acompanhar seus vencimentos de perto.'}</p>{!entries.length && <button type="button" className="btn btn--primary no-print" onClick={() => openForm()}>＋ Cadastrar primeiro lote</button>}</div>}
            <div className="table-footer"><span>{visible.length} lote(s) exibido(s)</span><span>{counts.units.toLocaleString('pt-BR')} unidade(s) registradas no total</span></div>
          </section>
          <footer className="footer">Validade Zero · Controle local de lotes <span>Feito para uma operação mais organizada.</span></footer>
        </main>
      </div>
    </div>
  );
}
