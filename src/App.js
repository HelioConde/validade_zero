import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Icon from './components/Icon';
import { MAX_CATALOG_CSV_BYTES, findProductByCode, loadCatalog, parseProductCatalogCsv, saveCatalog } from './domain/catalogo';
import {
  STORAGE_KEY, SECTORS, createBackup, formatDate, isValidEntry, parseBackup,
  parseDateOnly, readEntries, sortByExpiry, statusLabel, statusOf, summarize, toCsv
} from './domain/validade';

const EMPTY = { name: '', code: '', sector: 'Mercearia', batch: '', quantity: '1', expiration: '' };
const FILTERS = [
  { id: 'all', label: 'Todos', icon: 'layers' },
  { id: 'expired', label: 'Vencidos', icon: 'alert' },
  { id: 'urgent', label: 'Até 7 dias', icon: 'clock' },
  { id: 'attention', label: '8 a 30 dias', icon: 'calendar' },
  { id: 'ok', label: 'Em dia', icon: 'check' }
];

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}

function Field({ label, required, field, error, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={'entry-' + field}>
        {label}{required && <span className="required"> *</span>}
      </label>
      {children}
      {error && <p className="field__error" id={'error-' + field} role="alert">{error}</p>}
    </div>
  );
}

function EntryForm({ initial, onSave, onCancel, onDirtyChange, fromCatalog = false }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const fields = useRef({});
  useEffect(() => { fields.current.name?.focus(); }, []);

  function update(field, value) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    onDirtyChange(true);
  }

  function inputProps(field) {
    return {
      id: 'entry-' + field,
      name: field,
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? 'error-' + field : undefined,
      ref: node => { fields.current[field] = node; }
    };
  }

  function submit(event) {
    event.preventDefault();
    const name = values.name.trim();
    const batch = values.batch.trim();
    const quantity = Number(values.quantity);
    const nextErrors = {};
    if (!name || name.length > 120) nextErrors.name = 'Informe o nome do produto (até 120 caracteres).';
    if (!SECTORS.includes(values.sector)) nextErrors.sector = 'Selecione um setor válido.';
    if (!batch || batch.length > 70) nextErrors.batch = 'Informe o lote do produto.';
    if (values.quantity === '' || !Number.isSafeInteger(quantity) || quantity < 1) nextErrors.quantity = 'Informe uma quantidade inteira maior que zero.';
    if (!parseDateOnly(values.expiration)) nextErrors.expiration = 'Informe uma data de validade válida.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      fields.current[Object.keys(nextErrors)[0]]?.focus();
      return;
    }
    const entry = {
      ...values, id: initial?.id || createId(), name,
      code: values.code.trim(), batch, quantity
    };
    if (!isValidEntry(entry)) {
      setErrors({ name: 'Revise os campos e tente novamente.' });
      fields.current.name?.focus();
      return;
    }
    onSave(entry);
  }

  return (
    <form className="entry-form" noValidate onSubmit={submit}>
      {fromCatalog && <p className="catalog-form-notice" role="note">Dados preenchidos pelo catálogo. Confira o setor sugerido, informe o lote e confirme a validade impressa na embalagem.</p>}
      <div className="form-intro">
        <span className="form-icon"><Icon name="box" size={21}/></span>
        <div><h3>Dados do produto e do lote</h3><p>Preencha os campos obrigatórios para acompanhar a validade.</p></div>
      </div>
      <Field label="Nome do produto" required field="name" error={errors.name}>
        <input {...inputProps('name')} autoComplete="off" required maxLength="120"
          value={values.name} onChange={e => update('name', e.target.value)}
          placeholder="Ex.: Leite integral 1 L" />
      </Field>
      <div className="form-row">
        <Field label="Código / EAN" field="code" error={errors.code}>
          <input {...inputProps('code')} autoComplete="off" spellCheck={false} maxLength="60"
            value={values.code} onChange={e => update('code', e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Setor" required field="sector" error={errors.sector}>
          <select {...inputProps('sector')} required value={values.sector} onChange={e => update('sector', e.target.value)}>
            <option value="">Selecione o setor...</option>
            {SECTORS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Lote" required field="batch" error={errors.batch}>
          <input {...inputProps('batch')} autoComplete="off" spellCheck={false} required maxLength="70"
            value={values.batch} onChange={e => update('batch', e.target.value)}
            placeholder="Ex.: L-2026-001" />
        </Field>
        <Field label="Quantidade" required field="quantity" error={errors.quantity}>
          <input {...inputProps('quantity')} required type="number" inputMode="numeric" min="1" step="1"
            value={values.quantity} onChange={e => update('quantity', e.target.value)} />
        </Field>
      </div>
      <Field label="Data de validade" required field="expiration" error={errors.expiration}>
        <input {...inputProps('expiration')} required type="date" value={values.expiration}
          onChange={e => update('expiration', e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary"><Icon name="check" size={17}/>{initial?.id ? 'Salvar alterações' : 'Cadastrar lote'}</button>
      </div>
    </form>
  );
}

function StatusPill({ expiration }) {
  const status = statusOf(expiration);
  return <span className={'status status--' + status}><span className="status__dot"/>{statusLabel(expiration)}</span>;
}

function Metric({ name, value, detail, icon, kind, onClick }) {
  return <button type="button" className={'metric metric--' + kind} onClick={onClick}>
    <span className="metric__head"><span className="metric__label">{name}</span><span className="metric__icon"><Icon name={icon}/></span></span>
    <strong className="metric__value">{value.toLocaleString('pt-BR')}</strong>
    <span className="metric__foot"><span>{detail}</span><Icon name="chevron" size={17}/></span>
  </button>;
}

export default function App() {
  const [entries, setEntries] = useState(() => readEntries(window.localStorage));
  const [catalog, setCatalog] = useState(() => loadCatalog(window.localStorage));
  const [catalogCode, setCatalogCode] = useState('');
  const [catalogFound, setCatalogFound] = useState(null);
  const [catalogNotice, setCatalogNotice] = useState('');
  const [prefill, setPrefill] = useState(null);
  const catalogInputRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [feedback, setFeedback] = useState('');
  const backupInputRef = useRef(null);
  const counts = useMemo(() => summarize(entries), [entries]);
  const visible = useMemo(() => sortByExpiry(entries).filter(entry => {
    const matchingFilter = filter === 'all' || statusOf(entry.expiration) === filter;
    const matchingSector = sector === 'all' || sector === entry.sector;
    const haystack = [entry.name, entry.code, entry.batch, entry.sector].join(' ').toLocaleLowerCase('pt-BR');
    return matchingFilter && matchingSector && haystack.includes(search.trim().toLocaleLowerCase('pt-BR'));
  }), [entries, filter, search, sector]);

  useEffect(() => {
    if (!formDirty || !showForm) return undefined;
    function warn(event) { event.preventDefault(); event.returnValue = ''; }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formDirty, showForm]);

  function closeForm() {
    if (showForm && formDirty && !window.confirm('Descartar as alterações não salvas?')) return false;
    setShowForm(false);
    setFormDirty(false);
    return true;
  }

  function chooseFilter(value) {
    if (!closeForm()) return;
    setFilter(value);
  }

  function openForm(entry = null, fromProduct = null) {
    if (!closeForm()) return;
    setEditing(entry);
    setPrefill(fromProduct);
    setFormDirty(false);
    setShowForm(true);
    setFeedback('');
  }

  async function importCatalog(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_CATALOG_CSV_BYTES) throw new Error('O CSV deve ter no máximo 8 MB.');
      const parsed = parseProductCatalogCsv(await file.text());
      if (catalog.length && !window.confirm('Substituir o catálogo local de ' + catalog.length + ' produto(s) por ' + parsed.products.length + ' produto(s)? Os lotes cadastrados não serão alterados.')) return;
      saveCatalog(window.localStorage, parsed.products);
      setCatalog(parsed.products);
      setCatalogFound(null);
      setCatalogNotice('Catálogo importado: ' + parsed.products.length.toLocaleString('pt-BR') + ' produtos. ' + parsed.invalid + ' linhas inválidas e ' + parsed.duplicates + ' códigos repetidos foram ignorados.');
    } catch (error) {
      setCatalogNotice('Não foi possível importar o catálogo: ' + (error instanceof Error ? error.message : 'arquivo inválido.'));
    } finally {
      event.target.value = '';
    }
  }

  function searchCatalog(event) {
    event.preventDefault();
    const code = catalogCode.trim();
    const found = findProductByCode(catalog, code);
    setCatalogFound(found);
    setCatalogNotice(found ? 'Produto encontrado. Confira os dados antes de registrar a validade.' : 'Código não encontrado neste catálogo. Verifique a leitura ou cadastre o lote manualmente.');
  }

  function createLotFromCatalog() {
    if (!catalogFound) return;
    openForm(null, { ...EMPTY, name: catalogFound.name, code: catalogFound.code, sector: catalogFound.sector || '' });
  }

  function persist(next, message) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEntries(next);
      setFeedback(message);
      setEditing(null);
      setFormDirty(false);
      setShowForm(false);
    } catch {
      setFeedback('Não foi possível salvar. Verifique se o armazenamento do navegador está disponível e tente novamente.');
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

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!entries.length) return;
    download('validade-zero-lotes.csv', toCsv(entries), 'text/csv;charset=utf-8');
    setFeedback('CSV exportado. Guarde uma cópia dos seus registros.');
  }

  function downloadBackup() {
    download('validade-zero-backup.json', createBackup(entries), 'application/json;charset=utf-8');
    setFeedback('Backup JSON gerado. Guarde o arquivo em local seguro.');
  }

  async function restoreBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('O arquivo excede 2 MB.');
      const imported = parseBackup(await file.text());
      if (!window.confirm('Restaurar ' + imported.length + ' lote(s)? Os registros atuais serão substituídos.')) return;
      persist(imported, 'Backup restaurado: ' + imported.length + ' lote(s).');
      setSearch(''); setSector('all'); setFilter('all');
    } catch (error) {
      setFeedback('Não foi possível restaurar: ' + (error instanceof Error ? error.message : 'arquivo inválido.'));
    } finally {
      event.target.value = '';
    }
  }

  const atRisk = counts.expired + counts.urgent;
  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <aside className="sidebar no-print" aria-label="Menu principal">
        <div className="brand" translate="no">
          <span className="brand__mark"><Icon name="leaf" size={23}/></span>
          <span className="brand__text">Validade<span>Zero</span><small>GESTÃO DE VENCIMENTOS</small></span>
        </div>
        <div className="sidebar__caption">MENU PRINCIPAL</div>
        <nav className="nav" aria-label="Navegação do sistema">
          <button type="button" onClick={() => chooseFilter('all')} className={'nav__item' + (filter === 'all' && !showForm ? ' is-current' : '')} aria-current={filter === 'all' && !showForm ? 'page' : undefined}>
            <Icon name="grid" size={19}/> <span>Visão geral</span>
          </button>
          <button type="button" onClick={() => chooseFilter('urgent')} className={'nav__item' + (filter === 'urgent' && !showForm ? ' is-current' : '')} aria-current={filter === 'urgent' && !showForm ? 'page' : undefined}>
            <Icon name="clock" size={19}/> <span>Próximos 7 dias</span>
          </button>
          <button type="button" onClick={() => chooseFilter('expired')} className={'nav__item' + (filter === 'expired' && !showForm ? ' is-current' : '')} aria-current={filter === 'expired' && !showForm ? 'page' : undefined}>
            <Icon name="alert" size={19}/> <span>Vencidos</span>
          </button>
          <button type="button" onClick={() => openForm()} className={'nav__item' + (showForm ? ' is-current' : '')}>
            <Icon name="plus" size={19}/> <span>Novo lote</span>
          </button>
        </nav>
        <div className="sidebar__footer">
          <span className="sidebar__footer-icon"><Icon name="shield" size={20}/></span>
          <div><strong>Modo local</strong><p>Dados salvos somente neste navegador.</p></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="breadcrumbs"><span>Operação</span><Icon name="chevron" size={15}/><strong>Controle de validade</strong></div>
          <span className="topbar__pill"><span className="online-dot"/> Armazenamento local</span>
        </header>
        <main id="conteudo" className="main" tabIndex={-1}>
          <header className="heading">
            <div><div className="eyebrow"><span className="eyebrow__line"/> PAINEL DE ESTOQUE</div>
              <h1>Visão geral <span className="heading__accent">.</span></h1>
              <p className="heading__intro">Mais visibilidade sobre seus produtos. Menos perdas por vencimento.</p>
            </div>
            <button type="button" className="btn btn--primary btn--new no-print" onClick={() => openForm()}><Icon name="plus" size={19}/> Nova entrada</button>
          </header>

          <section className="metrics" aria-label="Indicadores de vencimento">
            <Metric name="Lotes cadastrados" value={counts.total} detail="Ver inventário" icon="box" kind="neutral" onClick={() => chooseFilter('all')}/>
            <Metric name="Lotes vencidos" value={counts.expired} detail="Exigem verificação" icon="alert" kind="danger" onClick={() => chooseFilter('expired')}/>
            <Metric name="Até 7 dias" value={counts.urgent} detail="Prioridade imediata" icon="clock" kind="warning" onClick={() => chooseFilter('urgent')}/>
            <Metric name="De 8 a 30 dias" value={counts.attention} detail="Acompanhar de perto" icon="calendar" kind="info" onClick={() => chooseFilter('attention')}/>
          </section>

          <section className={'insight insight--' + (atRisk ? 'warning' : 'clear')} aria-label="Resumo de prioridades">
            <div className="insight__icon"><Icon name={atRisk ? 'alert' : 'check'} size={22}/></div>
            <div className="insight__copy"><strong>{atRisk ? atRisk + ' lote(s) precisam de atenção' : 'Tudo organizado por prioridade'}</strong>
              <p>{atRisk ? 'Consulte os itens vencidos e próximos do vencimento para orientar a conferência.' : 'Os lotes são ordenados pela menor validade (FEFO). Comece cadastrando um produto.'}</p>
            </div>
            <button type="button" className="insight__action no-print" onClick={() => chooseFilter(atRisk && counts.expired ? 'expired' : atRisk ? 'urgent' : 'all')}>
              {atRisk ? 'Ver prioridades' : 'Ver todos'} <Icon name="arrow" size={17}/>
            </button>
          </section>
          <p className="privacy-hint"><Icon name="info" size={16}/> Versão de demonstração local: sem sincronização entre funcionários e sem substituição dos procedimentos oficiais de segurança alimentar.</p>

          <section className="catalog-panel no-print" aria-labelledby="catalog-title">
            <div className="catalog-panel__head">
              <div>
                <span className="eyebrow">CADASTRO INTELIGENTE / EAN</span>
                <h2 id="catalog-title">Identificação rápida do produto</h2>
                <p>Digite ou leia o EAN com um leitor conectado para preencher o cadastro do lote.</p>
              </div>
              <div className="catalog-panel__actions">
                <span className="catalog-counter">{catalog.length.toLocaleString('pt-BR')} produto(s) na base local</span>
                <button type="button" className="btn btn--outline" onClick={() => catalogInputRef.current?.click()}><Icon name="upload" size={17}/>Importar catálogo CSV</button>
                <input type="file" ref={catalogInputRef} className="sr-only" tabIndex={-1}
                  aria-label="Arquivo CSV do catálogo" accept=".csv,text/csv" onChange={importCatalog}/>
              </div>
            </div>
            <form className="catalog-search" onSubmit={searchCatalog}>
              <label htmlFor="catalog-code">Código EAN / código interno</label>
              <div className="catalog-search__controls">
                <input id="catalog-code" type="text" inputMode="numeric" autoComplete="off"
                  placeholder="Ex.: 7891234567895" value={catalogCode} maxLength={14}
                  onChange={event => { setCatalogCode(event.target.value); setCatalogFound(null); setCatalogNotice(''); }}/>
                <button className="btn btn--primary" type="submit"><Icon name="search" size={17}/>Buscar produto</button>
              </div>
            </form>
            {catalogNotice && <p className="catalog-notice" role="status" aria-live="polite">{catalogNotice}</p>}
            {catalogFound && <div className="catalog-match" aria-label="Produto encontrado">
              <div><strong>{catalogFound.name}</strong><small>Código: {catalogFound.code} · Setor: {catalogFound.sector || 'não informado'}</small>
                {(catalogFound.review || !catalogFound.sector) && <small className="catalog-match__warning">Confira {catalogFound.review ? 'o nome, código e ' : ''}o setor antes de salvar.</small>}
              </div>
              <button type="button" className="btn btn--primary" onClick={createLotFromCatalog}><Icon name="plus" size={17}/>Cadastrar lote deste produto</button>
            </div>}
            <p className="catalog-privacy"><Icon name="shield" size={15}/> Arquivo CSV e produtos ficam neste navegador. Nada é enviado automaticamente ao GitHub ou a um servidor. Não há sincronização entre dispositivos.</p>
          </section>

          {feedback && <div className="feedback" role="status" aria-live="polite"><Icon name="info" size={17}/><span>{feedback}</span><button type="button" aria-label="Fechar aviso" onClick={() => setFeedback('')}><Icon name="close" size={18}/></button></div>}

          {showForm && <section className="form-panel no-print" aria-labelledby="form-title">
            <div className="form-panel__head"><div><span className="eyebrow">MOVIMENTAÇÃO DE ESTOQUE</span><h2 id="form-title">{editing ? 'Editar lote' : 'Cadastrar novo lote'}</h2></div>
              <button type="button" className="icon-button" aria-label="Fechar formulário" onClick={closeForm}><Icon name="close" size={20}/></button>
            </div>
            <EntryForm key={editing?.id || prefill?.code || 'new'} initial={editing || prefill} fromCatalog={Boolean(prefill)} onSave={save} onCancel={closeForm} onDirtyChange={setFormDirty}/>
          </section>}

          <section className="list-panel" aria-labelledby="list-title">
            <header className="list-panel__header">
              <div><div className="eyebrow">INVENTÁRIO / FEFO</div><h2 id="list-title">Lotes e vencimentos <span className="count-bubble">{visible.length}</span></h2>
                <p>Gerencie e acompanhe todos os lotes em um só lugar.</p>
              </div>
              <div className="list-actions no-print" aria-label="Exportação e backup">
                <button type="button" className="btn btn--outline" onClick={downloadBackup} disabled={!entries.length}><Icon name="download" size={17}/>Backup</button>
                <button type="button" className="btn btn--outline" onClick={() => backupInputRef.current?.click()}><Icon name="upload" size={17}/>Restaurar</button>
                <input className="sr-only" type="file" accept=".json,application/json" ref={backupInputRef} onChange={restoreBackup} aria-label="Selecionar backup JSON" tabIndex={-1}/>
                <button type="button" className="btn btn--outline" onClick={exportCsv} disabled={!entries.length}><Icon name="file" size={17}/>CSV</button>
                <button type="button" className="btn btn--outline" onClick={() => window.print()} disabled={!entries.length}><Icon name="printer" size={17}/>Imprimir</button>
              </div>
            </header>
            <div className="filters no-print">
              <label className="search-field" htmlFor="inventory-search"><Icon name="search" size={20}/>
                <span className="sr-only">Buscar produto, código ou lote</span>
                <input id="inventory-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar produto, código ou lote…" autoComplete="off"/>
              </label>
              <label className="sector-select" htmlFor="sector-filter"><Icon name="filter" size={18}/>
                <span className="sr-only">Filtrar por setor</span>
                <select id="sector-filter" value={sector} onChange={event => setSector(event.target.value)}>
                  <option value="all">Todos os setores</option>
                  {SECTORS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="tabs no-print" role="group" aria-label="Filtrar por vencimento">
              {FILTERS.map(item => <button key={item.id} type="button" className={'tab' + (filter === item.id ? ' tab--active' : '')}
                aria-pressed={filter === item.id} onClick={() => chooseFilter(item.id)}>{item.label}</button>)}
            </div>
            <div className="table-scroller" role="region" aria-label="Tabela de lotes" tabIndex={0}>
              <table><caption className="sr-only">Lotes ordenados da validade mais próxima para a mais distante</caption>
                <thead><tr><th scope="col">Produto</th><th scope="col">Setor</th><th scope="col">Lote</th><th scope="col">Quantidade</th><th scope="col">Validade</th><th scope="col">Situação</th><th scope="col" className="no-print">Ações</th></tr></thead>
                <tbody>{visible.map(entry => <tr key={entry.id}>
                  <td><strong className="product-name">{entry.name}</strong><small className="product-code">{entry.code || 'Sem código'}</small></td>
                  <td>{entry.sector}</td><td className="table-mono">{entry.batch}</td><td className="table-number">{entry.quantity.toLocaleString('pt-BR')} un.</td>
                  <td className="date-value">{formatDate(entry.expiration)}</td><td><StatusPill expiration={entry.expiration}/></td>
                  <td className="no-print"><div className="row-actions"><button type="button" onClick={() => openForm(entry)} aria-label={'Editar lote ' + entry.batch}>Editar</button>
                    <button type="button" className="danger-action" onClick={() => remove(entry)} aria-label={'Excluir lote ' + entry.batch}>Excluir</button></div></td>
                </tr>)}</tbody></table>
            </div>
            {!visible.length && <div className="empty-state">
              <span className="empty-state__icon"><Icon name={entries.length ? 'search' : 'box'} size={27}/></span>
              <h3>{entries.length ? 'Nenhum lote encontrado' : 'Seu controle começa aqui'}</h3>
              <p>{entries.length ? 'Experimente ajustar os filtros ou sua busca.' : 'Cadastre seu primeiro produto e acompanhe os vencimentos com facilidade.'}</p>
              {entries.length ? <button type="button" className="btn btn--outline no-print" onClick={() => { setSearch(''); setSector('all'); chooseFilter('all'); }}>Limpar filtros</button>
                : <button type="button" className="btn btn--primary no-print" onClick={() => openForm()}><Icon name="plus" size={18}/> Cadastrar primeiro lote</button>}
            </div>}
            <footer className="list-panel__foot"><span>{visible.length} lote(s) exibido(s)</span><span>{counts.units.toLocaleString('pt-BR')} unidade(s) cadastradas</span></footer>
          </section>
          <footer className="footer">© {new Date().getFullYear()} Validade Zero <span>Organização que evita desperdícios.</span></footer>
        </main>
      </div>
    </div>
  );
}
