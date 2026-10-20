import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Icon from './components/Icon';
import BarcodeCamera from './scanning/BarcodeCamera';
import ProductPhoto from './components/ProductPhoto';
import { findCentralProduct, canSearchCentralCatalog } from './cloud/centralCatalog';
import ExpiryCamera from './scanning/ExpiryCamera';
import { CLOUD_ENABLED, cloudApi, hasStoredCloudSession, restoreSession, signIn, signOut, signUp } from './cloud/api';
import { MAX_CATALOG_CSV_BYTES, findProductByCode, loadCatalog, parseProductCatalogCsv, saveCatalog } from './domain/catalogo';
import {
  STORAGE_KEY, SECTORS, createBackup, formatDate, isValidEntry, parseBackup,
  isValidProductCode, parseDateOnly, readEntries, sortByExpiry, statusLabel, statusOf, summarize, toCsv
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
  const [lotScannerOpen, setLotScannerOpen] = useState(false);
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
    if (!isValidProductCode(values.code)) nextErrors.code =
      'Informe o EAN ou código interno numérico (de 1 a 14 dígitos).';
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
        <Field label="EAN / código interno" required field="code" error={errors.code}>
          <div className="ean-input-wrap">
            <input {...inputProps('code')} autoComplete="off" spellCheck={false} inputMode="numeric"
              required maxLength="14" pattern="[0-9]{1,14}"
              value={values.code} onChange={e => update('code', e.target.value)}
              placeholder="Ex.: 7898276970072" />
            <button type="button" className="ean-input-camera"
              aria-label="Escanear EAN do lote com a câmera" title="Escanear EAN do lote com a câmera"
              aria-expanded={lotScannerOpen} onClick={() => setLotScannerOpen(true)}>
              <Icon name="camera" size={20}/>
            </button>
          </div>
          {lotScannerOpen && <BarcodeCamera
            onDetected={code => { update('code', code); setLotScannerOpen(false); fields.current.code?.focus(); }}
            onClose={() => setLotScannerOpen(false)}/>}
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
      <ExpiryCamera onConfirm={value => update('expiration', value)}/>
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

function InventoryApp({ cloud = null, user = null, onSignOut = null, onActivateCloud = null }) {
  const [entries, setEntries] = useState(() => cloud ? [] : readEntries(window.localStorage));
  const [cloudCount, setCloudCount] = useState(0);
  const [cloudBusy, setCloudBusy] = useState(Boolean(cloud));
  const [localMigrated, setLocalMigrated] = useState(false);
  const localLots = cloud && !localMigrated ? readEntries(window.localStorage) : [];
  const localProducts = cloud && !localMigrated ? loadCatalog(window.localStorage) : [];
  const [catalog, setCatalog] = useState(() => cloud ? [] : loadCatalog(window.localStorage));
  const [catalogCode, setCatalogCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [catalogFound, setCatalogFound] = useState(null);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const catalogSearchId = useRef(0);
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
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    (async () => {
      try {
        const [items, count] = await Promise.all([cloud.listLots(), cloud.countCatalog()]);
        if (!active) return;
        setEntries(items);
        setCloudCount(count);
        setFeedback('');
      } catch (error) {
        if (active) setFeedback('Erro ao carregar dados da nuvem: ' + error.message + '. Nenhum dado foi substituído.');
      } finally { if (active) setCloudBusy(false); }
    })();
    return () => { active = false; };
  }, [cloud, user?.id]);

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
    setCloudBusy(Boolean(cloud));
    try {
      if (file.size > MAX_CATALOG_CSV_BYTES) throw new Error('O CSV deve ter no máximo 8 MB.');
      const parsed = parseProductCatalogCsv(await file.text());
      if (cloud) {
        if (!window.confirm('Importar ou atualizar ' + parsed.products.length.toLocaleString('pt-BR') + ' produtos na nuvem? Os lotes e fotos existentes serão preservados.')) return;
        await cloud.importProducts(parsed.products, n => setCatalogNotice('Enviando ao Supabase: ' + n.toLocaleString('pt-BR') + ' / ' + parsed.products.length.toLocaleString('pt-BR') + ' produtos.'));
        setCloudCount(await cloud.countCatalog());
      } else {
        if (catalog.length && !window.confirm('Substituir o catálogo local de ' + catalog.length + ' produto(s) por ' + parsed.products.length + ' produto(s)? Os lotes cadastrados não serão alterados.')) return;
        saveCatalog(window.localStorage, parsed.products);
        setCatalog(parsed.products);
      }
      setCatalogFound(null);
      setCatalogNotice('Catálogo importado: ' + parsed.products.length.toLocaleString('pt-BR') + ' produtos. ' + parsed.invalid + ' linhas inválidas e ' + parsed.duplicates + ' códigos repetidos foram ignorados.');
    } catch (error) {
      setCatalogNotice('Falha na importação: ' + error.message + (cloud ? '. Produtos enviados em lotes anteriores podem ter sido salvos; você pode reenviar o mesmo arquivo.' : ''));
    } finally {
      setCloudBusy(false);
      event.target.value = '';
    }
  }

  async function lookupCatalogCode(code) {
    const cleanCode = String(code || '').trim();
    const thisSearch = ++catalogSearchId.current;
    setCatalogCode(cleanCode);
    setCatalogFound(null);
    if (!/^\d{1,14}$/.test(cleanCode)) {
      setCatalogNotice('Informe um EAN ou código interno numérico com até 14 dígitos.');
      return;
    }
    setCatalogSearching(true);
    setCatalogNotice('Pesquisando produto…');
    try {
      const ownProduct = cloud
        ? await cloud.findProduct(cleanCode)
        : findProductByCode(catalog, cleanCode);
      const found = ownProduct
        ? { ...ownProduct, source: cloud ? 'private' : 'local' }
        : await findCentralProduct(cleanCode);
      if (catalogSearchId.current !== thisSearch) return;
      setCatalogFound(found);
      if (found) {
        setCatalogNotice(found.source === 'central'
          ? 'Produto encontrado no catálogo central do servidor. Confira o nome e o setor antes de registrar a validade.'
          : 'Produto encontrado no seu catálogo. Confira os dados antes de registrar a validade.');
      } else {
        setCatalogNotice('Código não encontrado. Confira o EAN ou cadastre o lote manualmente.');
      }
    } catch (error) {
      if (catalogSearchId.current !== thisSearch) return;
      setCatalogFound(null);
      setCatalogNotice('Não foi possível consultar o servidor: ' + error.message +
        ' Você ainda pode cadastrar um lote manualmente.');
    } finally {
      if (catalogSearchId.current === thisSearch) setCatalogSearching(false);
    }
  }

  function searchCatalog(event) {
    event.preventDefault();
    lookupCatalogCode(catalogCode);
  }

  function onBarcodeDetected(code) {
    setScannerOpen(false);
    lookupCatalogCode(code);
  }

  function createLotFromCatalog() {
    if (!catalogFound) return;
    openForm(null, { ...EMPTY, name: catalogFound.name, code: catalogFound.code, sector: catalogFound.sector || '' });
  }

  function photoSaved(code, photoPath) {
    setCatalogFound(current => current?.code === code ? { ...current, photoPath } : current);
  }

  async function saveCentralToMyCatalog() {
    const item = catalogFound;
    if (!cloud || !item || item.source !== 'central') return;
    setCatalogSearching(true);
    try {
      const result = await cloud.adoptCentralProduct(item);
      if (catalogFound?.code === item.code) {
        setCatalogFound({ ...result, source: 'private' });
        setCloudCount(await cloud.countCatalog());
      }
      setCatalogNotice('Produto adicionado à sua conta. Agora você pode cadastrar uma fotografia privada.');
    } catch (error) {
      setCatalogNotice('Não foi possível adicionar o produto à conta: ' + error.message);
    } finally { setCatalogSearching(false); }
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
      setFeedback('Não foi possível salvar. Verifique o armazenamento do navegador.');
    }
  }

  async function save(entry) {
    if (cloud) {
      setCloudBusy(true);
      try {
        await cloud.upsertLot(entry, Boolean(editing));
        setEntries(await cloud.listLots());
        setFeedback(editing ? 'Lote atualizado na nuvem.' : 'Lote salvo na nuvem.');
        setEditing(null); setPrefill(null); setFormDirty(false); setShowForm(false);
      } catch (error) {
        setFeedback('Erro ao salvar na nuvem: ' + error.message + '. O formulário foi mantido.');
      } finally { setCloudBusy(false); }
      return;
    }
    const next = editing ? entries.map(existing => existing.id === editing.id ? entry : existing) : [entry, ...entries];
    persist(next, editing ? 'Lote atualizado com sucesso.' : 'Lote cadastrado com sucesso.');
  }

  async function remove(entry) {
    if (!window.confirm('Excluir o lote ' + entry.batch + ' de ' + entry.name + '? Esta ação não pode ser desfeita.')) return;
    if (cloud) {
      setCloudBusy(true);
      try { await cloud.deleteLot(entry.id); setEntries(await cloud.listLots()); setFeedback('Lote excluído na nuvem.'); }
      catch (error) { setFeedback('Erro ao excluir na nuvem: ' + error.message); }
      finally { setCloudBusy(false); }
    } else {
      persist(entries.filter(item => item.id !== entry.id), 'Lote excluído.');
    }
  }

  async function migrateLocalData() {
    if (!cloud || (!localLots.length && !localProducts.length)) return;
    const confirmed = window.confirm(
      'Copiar para sua conta ' + localLots.length.toLocaleString('pt-BR') + ' lote(s) e ' +
      localProducts.length.toLocaleString('pt-BR') + ' produto(s) locais? ' +
      'Os dados deste navegador serão preservados; registros já existentes com o mesmo identificador na nuvem não serão sobrescritos.'
    );
    if (!confirmed) return;
    setCloudBusy(true);
    try {
      if (localProducts.length) {
        await cloud.migrateLocalCatalog(localProducts, count => {
          setFeedback('Enviando catálogo: ' + count.toLocaleString('pt-BR') + '/' +
            localProducts.length.toLocaleString('pt-BR') + ' produto(s) processados.');
        });
      }
      if (localLots.length) await cloud.migrateLocalLots(localLots);
      const [updatedLots, updatedCatalogCount] = await Promise.all([cloud.listLots(), cloud.countCatalog()]);
      setEntries(updatedLots);
      setCloudCount(updatedCatalogCount);
      setLocalMigrated(true);
      setFeedback('Migração concluída. Lotes e produtos do teste estão na sua conta; o conteúdo local foi mantido como cópia.');
    } catch (error) {
      setFeedback('Migração interrompida: ' + error.message +
        '. Parte dos dados pode ter sido enviada. É seguro tentar novamente: registros existentes não são sobrescritos.');
    } finally { setCloudBusy(false); }
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
      if (cloud) {
        if (!window.confirm('Adicionar ' + imported.length + ' lote(s) ao Supabase? Lotes já existentes com mesmo ID serão preservados.')) return;
        setCloudBusy(true);
        await cloud.migrateLocalLots(imported);
        setEntries(await cloud.listLots());
        setFeedback('Backup enviado à nuvem: ' + imported.length + ' lote(s) processados.');
        setCloudBusy(false);
      } else {
        if (!window.confirm('Restaurar ' + imported.length + ' lote(s)? Os registros atuais serão substituídos.')) return;
        persist(imported, 'Backup restaurado: ' + imported.length + ' lote(s).');
      }
      setSearch(''); setSector('all'); setFilter('all');
    } catch (error) {
      setFeedback('Não foi possível restaurar: ' + (error instanceof Error ? error.message : 'arquivo inválido.'));
    } finally {
      setCloudBusy(false);
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
          <div><strong>{cloud ? 'Nuvem protegida' : 'Modo local'}</strong><p>{cloud ? 'Dados vinculados à sua conta.' : 'Dados salvos somente neste navegador.'}</p></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="breadcrumbs"><span>Operação</span><Icon name="chevron" size={15}/><strong>Controle de validade</strong></div>
          <div className="topbar__right">
            <span className="topbar__pill"><span className="online-dot"/> {cloud ? 'Nuvem / Supabase' : 'Teste local / sem login'}</span>
            {!cloud && onActivateCloud && <button type="button" className="btn btn--outline" onClick={onActivateCloud}>Entrar na nuvem</button>}
            {cloud && <button type="button" className="btn btn--outline" onClick={onSignOut} aria-label="Sair da conta">Sair</button>}
          </div>
        </header>
        <main id="conteudo" className="main" tabIndex={-1}>
          {!cloud && onActivateCloud && <section className="demo-banner no-print" aria-label="Modo de demonstração local">
            <div className="demo-banner__copy">
              <span className="demo-banner__eyebrow"><Icon name="check" size={15}/> ACESSO LIVRE, SEM CADASTRO</span>
              <h2>Teste o Validade Zero antes de criar uma conta.</h2>
              <p>Cadastre lotes, importe um catálogo CSV, experimente o EAN pela câmera e leia a validade por OCR. Tudo começa aqui, sem login.</p>
              <p className="demo-banner__disclaimer"><Icon name="info" size={15}/> Os dados ficam apenas neste navegador. Se limpar os dados do navegador, você pode perdê-los. Faça backup. Fotos permanentes e sincronização exigem conta.</p>
            </div>
            <div className="demo-banner__actions">
              <button type="button" className="btn btn--light" onClick={onActivateCloud}><Icon name="shield" size={17}/> Salvar na nuvem</button>
              <span>Gostou? Crie uma conta e migre seus registros.</span>
            </div>
          </section>}
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
          <p className="privacy-hint"><Icon name="info" size={16}/> {cloud ? 'Dados salvos na nuvem e privados por usuário. Contas diferentes ainda não compartilham o mesmo estoque. O sistema não substitui procedimentos oficiais de segurança alimentar.' : 'Versão de demonstração local: sem sincronização entre funcionários e sem substituição dos procedimentos oficiais de segurança alimentar.'}</p>
          {cloud && (localLots.length > 0 || localProducts.length > 0) && <section className="legacy-transfer" aria-label="Migrar dados do teste local">
            <span><strong>Recupere seu teste local:</strong> {localLots.length.toLocaleString('pt-BR')} lote(s) e {localProducts.length.toLocaleString('pt-BR')} produto(s) encontrados neste navegador. Sua cópia local será mantida.</span>
            <button className="btn btn--outline" type="button" disabled={cloudBusy} onClick={migrateLocalData}>Migrar dados locais para a nuvem</button>
          </section>}
          {cloudBusy && <p role="status" className="cloud-loading">Sincronizando dados com o Supabase…</p>}

          <section className="catalog-panel no-print" aria-labelledby="catalog-title">
            <div className="catalog-panel__head">
              <div>
                <span className="eyebrow">CADASTRO INTELIGENTE / EAN</span>
                <h2 id="catalog-title">Identificação rápida do produto</h2>
                <p>Digite ou escaneie o EAN. Se não estiver no seu catálogo, consultaremos a base central no Supabase, mesmo sem login.</p>
              </div>
              <div className="catalog-panel__actions">
                <span className="catalog-counter">{(cloud ? cloudCount : catalog.length).toLocaleString('pt-BR')} produto(s) {cloud ? 'na nuvem' : 'na base local'}</span>
                <button type="button" className="btn btn--outline" disabled={cloudBusy} onClick={() => catalogInputRef.current?.click()}><Icon name="upload" size={17}/>Importar catálogo CSV</button>
                <input type="file" ref={catalogInputRef} className="sr-only" tabIndex={-1}
                  aria-label="Arquivo CSV do catálogo" accept=".csv,text/csv" onChange={importCatalog}/>
              </div>
            </div>
            <p className="catalog-server-label"><Icon name="check" size={15}/> {canSearchCentralCatalog() ? 'Busca no catálogo central online disponível sem login' : 'Busca local — servidor não configurado neste ambiente'}</p>
            <form className="catalog-search" onSubmit={searchCatalog}>
              <label htmlFor="catalog-code">Código EAN / código interno</label>
              <div className="catalog-search__controls">
                <div className="ean-input-wrap ean-input-wrap--search">
                  <input id="catalog-code" type="text" inputMode="numeric" autoComplete="off"
                    placeholder="Ex.: 7898276970072" value={catalogCode} maxLength={14}
                    onChange={event => { setCatalogCode(event.target.value); setCatalogFound(null); setCatalogNotice(''); }}/>
                  <button type="button" className="ean-input-camera"
                    onClick={() => setScannerOpen(true)} title="Escanear EAN com a câmera"
                    aria-label="Escanear EAN com a câmera" aria-expanded={scannerOpen}>
                    <Icon name="camera" size={20}/>
                  </button>
                </div>
                <button className="btn btn--primary" type="submit" disabled={catalogSearching}><Icon name="search" size={17}/>{catalogSearching ? 'Pesquisando…' : 'Buscar produto'}</button>
              </div>
            </form>
            {scannerOpen && <BarcodeCamera onDetected={onBarcodeDetected} onClose={() => setScannerOpen(false)}/>}
            {catalogNotice && <p className="catalog-notice" role="status" aria-live="polite">{catalogNotice}</p>}
            {catalogFound && <div className="catalog-match" aria-label="Produto encontrado">
              <div><strong>{catalogFound.name}</strong><small>Código: {catalogFound.code} · Setor: {catalogFound.sector || 'não informado'}</small>
                <small>{catalogFound.source === 'central' ? 'Fonte: catálogo central do servidor' : 'Fonte: seu catálogo'}</small>
                {(catalogFound.review || !catalogFound.sector) && <small className="catalog-match__warning">Confira {catalogFound.review ? 'o nome, código e ' : ''}o setor antes de salvar.</small>}
              </div>
              <button type="button" className="btn btn--primary" onClick={createLotFromCatalog}><Icon name="plus" size={17}/>Cadastrar lote deste produto</button>
            </div>}
            {catalogFound && cloud && catalogFound.source === 'central' && <div className="catalog-central-photo">
              <span>Para salvar uma foto privada deste produto, adicione-o primeiro à sua conta.</span>
              <button type="button" className="btn btn--outline" disabled={catalogSearching}
                onClick={saveCentralToMyCatalog}>Adicionar ao meu catálogo e habilitar foto</button>
            </div>}
            {catalogFound && cloud && catalogFound.source === 'private' && user?.id && <ProductPhoto key={catalogFound.code} product={catalogFound}
              cloud={cloud} userId={user.id} onPhotoSaved={photoSaved}/>}
            
            <p className="catalog-privacy"><Icon name="shield" size={15}/> {cloud
              ? 'O catálogo central só disponibiliza nome, EAN e setor. Seus lotes e fotos continuam privados na sua conta Supabase.'
              : 'A pesquisa de EAN pode consultar o catálogo público central pela internet. Seus lotes e o CSV importado continuam somente neste navegador e não são enviados ao servidor.'}</p>
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
                <button type="button" className="btn btn--outline" onClick={downloadBackup} disabled={cloudBusy || !entries.length}><Icon name="download" size={17}/>Backup</button>
                <button type="button" className="btn btn--outline" onClick={() => backupInputRef.current?.click()}><Icon name="upload" size={17}/>Restaurar</button>
                <input className="sr-only" type="file" accept=".json,application/json" ref={backupInputRef} onChange={restoreBackup} aria-label="Selecionar backup JSON" tabIndex={-1}/>
                <button type="button" className="btn btn--outline" onClick={exportCsv} disabled={cloudBusy || !entries.length}><Icon name="file" size={17}/>CSV</button>
                <button type="button" className="btn btn--outline" onClick={() => window.print()} disabled={cloudBusy || !entries.length}><Icon name="printer" size={17}/>Imprimir</button>
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


function CloudEntry({ onTryLocal, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(''); setWorking(true);
    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password);
        if (result.confirmed) setUser(result.user);
        else { setMode('login'); setPassword(''); setError('Confira seu e-mail e confirme sua conta antes de entrar.'); }
      } else setUser(await signIn(email.trim(), password));
    } catch (cause) {
      setError(cause.message || 'Falha de autenticação.');
    } finally { setWorking(false); }
  }
  async function logout() {
    try { await signOut(); } catch { /* sessão local será apagada mesmo se a rede falhar */ }
    setUser(null); setPassword('');
    onTryLocal();
  }
  if (user) return <InventoryApp key={user.id} cloud={cloudApi} user={user} onSignOut={logout}/>;
  return <main className="auth-screen">
    <section className="auth-card" aria-labelledby="auth-title">
      <span className="auth-mark"><Icon name="shield" size={25}/></span>
      <p className="eyebrow">VALIDADE ZERO / NUVEM SEGURA</p>
      <h1 id="auth-title">{mode === 'signup' ? 'Criar conta' : 'Entrar no Validade Zero'}</h1>
      <p>Entre para sincronizar seus produtos e lotes. O teste sem login continua disponível e seus dados locais não serão apagados.</p>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="cloud-email">E-mail</label>
        <input id="cloud-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}/>
        <label htmlFor="cloud-password">Senha</label>
        <input id="cloud-password" type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)}/>
        {error && <p className="auth-error" role="status">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={working}>{working ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
        {mode === 'signup' ? 'Já possui conta? Entrar' : 'Não possui conta? Criar conta'}
      </button>
      <button type="button" className="btn btn--outline auth-local" onClick={onTryLocal}><Icon name="arrow" size={17}/> Continuar sem login</button>
      <small>A conta usa o Supabase Auth. Cada usuário vê somente seus registros; os dados locais ficam separados até a migração voluntária.</small>
    </section>
  </main>;
}

export default function App() {
  const [screen, setScreen] = useState(() => CLOUD_ENABLED && hasStoredCloudSession() ? 'checking' : 'local');
  const [restoredUser, setRestoredUser] = useState(null);

  useEffect(() => {
    if (screen !== 'checking') return undefined;
    let active = true;
    restoreSession().then(user => {
      if (!active) return;
      setRestoredUser(user);
      setScreen(user ? 'cloud' : 'local');
    }).catch(() => { if (active) setScreen('local'); });
    return () => { active = false; };
  }, [screen]);

  if (screen === 'checking') return <main className="auth-screen"><p role="status">Verificando sua sessão…</p></main>;
  if (screen === 'cloud' || screen === 'login') return <CloudEntry key={screen} initialUser={restoredUser}
    onTryLocal={() => { setRestoredUser(null); setScreen('local'); }}/>;
  return <InventoryApp key="local" onActivateCloud={CLOUD_ENABLED
    ? () => { setRestoredUser(null); setScreen('login'); }
    : null}/>;
}
