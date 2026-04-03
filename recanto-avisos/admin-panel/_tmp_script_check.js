
// ── Config ─────────────────────────────────────────────────────────────────
const API_BASE = window.location.protocol === 'file:'
  ? 'http://localhost:3001/api'
  : '/api'

let TOKEN     = localStorage.getItem('admin_jwt')
let adminInfo = JSON.parse(localStorage.getItem('admin_info') || '{}')

// ── API ─────────────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN
  const res = await fetch(API_BASE + path, { ...options, headers: { ...headers, ...(options.headers||{}) } })
  // 401 durante login deve lançar erro com a mensagem do servidor, não chamar logout
  if (res.status === 401 && TOKEN) { logout(); return null }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault()
  const btn = document.getElementById('btn-login')
  btn.disabled = true; btn.textContent = 'Entrando...'
  document.getElementById('login-erro').style.display = 'none'
  try {
    const res = await fetch(API_BASE + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: document.getElementById('login-usuario').value.trim().toLowerCase(), senha: document.getElementById('login-senha').value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
    TOKEN = data.token; adminInfo = data.admin
    localStorage.setItem('admin_jwt', TOKEN)
    localStorage.setItem('admin_info', JSON.stringify(adminInfo))
    showApp()
  } catch (err) {
    document.getElementById('login-erro-msg').textContent = err.message
    document.getElementById('login-erro').style.display = 'block'
  } finally { btn.disabled = false; btn.textContent = 'Entrar' }
}

function logout() {
  TOKEN = null; adminInfo = {}
  localStorage.removeItem('admin_jwt'); localStorage.removeItem('admin_info')
  document.getElementById('app').style.display = 'none'
  document.getElementById('login-screen').style.display = 'flex'
}

// ── Nav ──────────────────────────────────────────────────────────────────────
const PAGES = ['dashboard','avisos','solicitacoes','importar','turmas','alunos','responsaveis','historico','admins']
const TITLES = { dashboard:'Dashboard', avisos:'Enviar Aviso', solicitacoes:'Solicitações dos Pais', importar:'Importar CSV', turmas:'Turmas & QR Codes', alunos:'Alunos', responsaveis:'Responsáveis', historico:'Histórico de Avisos', admins:'Gerenciar Administradores' }
const LOADERS = { dashboard:loadDashboard, avisos:loadFormAvisos, solicitacoes:carregarSolicitacoes, turmas:loadTurmas, alunos:()=>loadAlunos(), responsaveis:loadResponsaveis, historico:loadHistorico, admins:loadAdmins }

const PERFIL_LABELS = { master:'Master', coordenacao:'Coordenação', secretaria:'Secretaria Escolar', administrativo:'Administrativo' }
const PERFIL_COLORS = { master:'#2d6197', coordenacao:'#2e7d52', secretaria:'#596065', administrativo:'#b45309' }

function showPage(name) {
  PAGES.forEach(p => {
    const sec = document.getElementById('page-'+p)
    const nav = document.getElementById('nav-'+p)
    if (sec) sec.style.display = 'none'
    if (nav) nav.classList.remove('active')
  })
  const sec = document.getElementById('page-'+name)
  const nav = document.getElementById('nav-'+name)
  if (sec) sec.style.display = ''
  if (nav) nav.classList.add('active')
  document.getElementById('page-title').textContent = TITLES[name] || ''
  if (LOADERS[name]) LOADERS[name]()
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none'
  document.getElementById('app').style.display = 'flex'
  document.getElementById('admin-email').textContent = adminInfo.nome || adminInfo.usuario || 'Admin'
  const perfil = adminInfo.perfil || ''
  const perfilBadge = document.getElementById('admin-perfil-badge')
  perfilBadge.textContent = PERFIL_LABELS[perfil] || perfil
  perfilBadge.style.color = PERFIL_COLORS[perfil] || '#596065'
  // Mostrar botão de gerenciar admins só para master
  document.getElementById('nav-admins').style.display = perfil === 'master' ? '' : 'none'
  showPage('dashboard')
}

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.style.background = type === 'error' ? '#a83836' : '#2e7d52'
  el.style.display = 'block'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.display = 'none' }, 4000)
}

// ── Modal ────────────────────────────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html
  document.getElementById('modal').style.display = 'flex'
}
function closeModal() { document.getElementById('modal').style.display = 'none' }
document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) closeModal() })

// ── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const s = await api('/admin/stats'); if (!s) return
    document.getElementById('stat-alunos').textContent       = s.total_alunos
    document.getElementById('stat-responsaveis').textContent = s.total_responsaveis
    document.getElementById('stat-com-app').textContent      = s.total_com_app
    document.getElementById('stat-avisos-hoje').textContent  = s.avisos_hoje
    document.getElementById('turmas-stats-body').innerHTML = (s.por_turma||[]).map(t => `
      <tr>
        <td style="font-weight:700;color:#2d6197;">${t.turma_codigo}</td>
        <td style="color:#596065;">${t.turma_nome}</td>
        <td style="text-align:center;font-weight:600;">${t.total_alunos}</td>
        <td style="text-align:center;"><span class="badge ${t.com_app===t.total_alunos&&t.total_alunos>0?'badge-green':'badge-gray'}">${t.com_app} / ${t.total_alunos}</span></td>
      </tr>`).join('')
  } catch(err) { toast(err.message,'error') }
}

// ── Enviar Aviso — Estado ─────────────────────────────────────────────────────
let _turmasList    = []
let _templatesList = []
let _templateAtivo = null
let _destinatario  = { tipo: null, ids: [], turmasNomes: [], alunosNomes: [] }
let _alunosSelecionados = [] // [{ id, nome, turma_nome }]

async function loadFormAvisos() {
  try {
    const [turmas, porCategoria] = await Promise.all([
      api('/admin/turmas').catch(()=>[]),
      api('/templates?agrupado=1').catch(()=>({}))
    ])
    _turmasList = turmas || []

    // Popula dropdowns de turma da busca de alunos
    const optTurmas = _turmasList.map(t => `<option value="${t.id}">${t.nome} (${t.codigo})</option>`).join('')
    document.getElementById('busca-turma-id').innerHTML = '<option value="">Todas as turmas</option>' + optTurmas
    document.getElementById('turmas-checkboxes').innerHTML = _turmasList.map(t => `
      <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border-radius:0.75rem;cursor:pointer;font-size:0.875rem;font-weight:700;color:#2c3338;" onmouseover="this.style.background='#f0f4f8'" onmouseout="this.style.background=''">
        <input type="checkbox" value="${t.id}" class="turma-check" style="accent-color:#2d6197;width:1rem;height:1rem;" /> ${t.codigo}
      </label>`).join('')

    // Monta lista de templates
    _templatesList = []
    const categoriaIcons = {
      'Aulas':'school','Infraestrutura':'handyman','Frequência':'event_busy',
      'Saúde':'health_and_safety','Comportamento':'psychology','Reuniões':'groups',
      'Administrativo':'admin_panel_settings','Uniforme':'checkroom','Merenda':'lunch_dining'
    }
    const html = Object.entries(porCategoria).map(([cat, templates]) => {
      const icon = categoriaIcons[cat] || 'folder'
      const rows = templates.map(t => {
        const idx = _templatesList.length
        _templatesList.push(t)
        return `<button type="button" onclick="aplicarTemplate(${idx})"
          style="text-align:left;padding:0.875rem 1rem;border-radius:1rem;border:1.5px solid #e3e9ee;background:white;cursor:pointer;transition:all 0.15s;font-family:'Manrope',system-ui,sans-serif;display:flex;align-items:flex-start;gap:0.625rem;width:100%;"
          onmouseover="this.style.borderColor='#2d6197';this.style.background='#f0f4f8'"
          onmouseout="this.style.borderColor='#e3e9ee';this.style.background='white'">
          <span class="material-symbols-outlined" style="font-size:1rem;color:#2d6197;margin-top:0.1rem;flex-shrink:0;">${t.urgente?'warning':'campaign'}</span>
          <div style="min-width:0;">
            <p style="font-size:0.8125rem;font-weight:700;color:#2c3338;margin:0 0 0.2rem;">${t.titulo}</p>
            <p style="font-size:0.7rem;color:#596065;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4;">${t.mensagem}</p>
            ${t.urgente?'<span class="badge badge-red" style="margin-top:0.375rem;display:inline-block;font-size:9px;">Urgente</span>':''}
          </div></button>`
      }).join('')
      return `<div style="margin-bottom:0.25rem;">
        <button type="button" onclick="toggleCategoria('cat-${cat.replace(/\s/g,'-')}')"
          style="width:100%;display:flex;align-items:center;gap:0.5rem;padding:0.625rem 0.75rem;border-radius:0.75rem;border:none;background:none;cursor:pointer;font-family:'Manrope',system-ui,sans-serif;text-align:left;"
          onmouseover="this.style.background='#f0f4f8'" onmouseout="this.style.background=''">
          <span class="material-symbols-outlined" style="font-size:1rem;color:#2d6197;">${icon}</span>
          <span style="font-size:0.8125rem;font-weight:800;color:#2c3338;flex:1;">${cat}</span>
          <span style="font-size:0.75rem;color:#abb3b9;">${templates.length}</span>
          <span class="material-symbols-outlined" style="font-size:1rem;color:#abb3b9;">expand_more</span>
        </button>
        <div id="cat-${cat.replace(/\s/g,'-')}" style="display:none;padding:0.25rem 0 0.5rem;display:flex;flex-direction:column;gap:0.375rem;">${rows}</div>
      </div>`
    }).join('')
    document.getElementById('templates-list').innerHTML = `<div class="card" style="margin-bottom:0;">${html}</div>`

    // Reset etapa 1
    resetarFormulario()
  } catch(err) { toast(err.message,'error') }
}

function toggleCategoria(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.display = el.style.display === 'none' ? 'flex' : 'none'
}

// ── Etapa 1: Destinatários ────────────────────────────────────────────────────
function selecionarTipoDestinatario(tipo) {
  const cards = ['todos','turmas','alunos']
  cards.forEach(c => {
    const card = document.getElementById('dest-card-' + c)
    card.style.borderColor = c === tipo ? '#2d6197' : 'transparent'
    card.style.background  = c === tipo ? '#f0f8ff' : ''
  })
  document.getElementById('dest-turmas-lista').style.display  = tipo === 'turmas'  ? '' : 'none'
  document.getElementById('dest-alunos-busca').style.display  = tipo === 'alunos'  ? '' : 'none'
  _destinatario.tipo = tipo
}

async function buscarAlunos() {
  const turma_id = document.getElementById('busca-turma-id').value
  const busca    = document.getElementById('busca-aluno-nome').value.trim()
  if (!turma_id && busca.length < 2) {
    document.getElementById('busca-alunos-resultado').innerHTML = '<p style="padding:0.75rem 1rem;font-size:0.8125rem;color:#abb3b9;">Digite ao menos 2 letras ou selecione uma turma.</p>'
    return
  }
  const params = new URLSearchParams()
  if (turma_id) params.set('turma_id', turma_id)
  if (busca)    params.set('busca', busca)
  const alunos = await api('/admin/alunos?' + params).catch(()=>[])
  const jaSelecionados = new Set(_alunosSelecionados.map(a => a.id))
  document.getElementById('busca-alunos-resultado').innerHTML = (alunos||[]).length === 0
    ? '<p style="padding:0.75rem 1rem;font-size:0.8125rem;color:#abb3b9;">Nenhum aluno encontrado.</p>'
    : alunos.map(a => `
      <button type="button" onclick="toggleAluno(${a.id},'${a.nome.replace(/'/g,"\\'")}','${(a.turma_nome||'').replace(/'/g,"\\'")}', this)"
        style="width:100%;text-align:left;padding:0.625rem 1rem;border:none;background:${jaSelecionados.has(a.id)?'#e8f4ff':'white'};cursor:pointer;font-family:'Manrope',system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;"
        onmouseover="this.style.background='#f0f4f8'" onmouseout="this.style.background='${jaSelecionados.has(a.id)?'#e8f4ff':'white'}'" id="aluno-btn-${a.id}">
        <div>
          <p style="font-size:0.8125rem;font-weight:700;color:#2c3338;margin:0;">${a.nome}</p>
          <p style="font-size:0.7rem;color:#596065;margin:0;">${a.turma_nome||'Sem turma'}</p>
        </div>
        <span class="material-symbols-outlined" style="font-size:1.125rem;color:${jaSelecionados.has(a.id)?'#2d6197':'#abb3b9'};">${jaSelecionados.has(a.id)?'check_circle':'add_circle'}</span>
      </button>`).join('')
}

function toggleAluno(id, nome, turma_nome) {
  const idx = _alunosSelecionados.findIndex(a => a.id === id)
  if (idx >= 0) {
    _alunosSelecionados.splice(idx, 1)
  } else {
    _alunosSelecionados.push({ id, nome, turma_nome })
  }
  atualizarListaAlunosSelecionados()
  buscarAlunos() // refresca estado dos botões
}

function removerAluno(id) {
  _alunosSelecionados = _alunosSelecionados.filter(a => a.id !== id)
  atualizarListaAlunosSelecionados()
  buscarAlunos()
}

function atualizarListaAlunosSelecionados() {
  const container = document.getElementById('alunos-selecionados')
  const lista     = document.getElementById('alunos-selecionados-lista')
  if (_alunosSelecionados.length === 0) { container.style.display = 'none'; return }
  container.style.display = ''
  lista.innerHTML = _alunosSelecionados.map(a => `
    <span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.25rem 0.625rem;background:#2d6197;color:white;border-radius:999px;font-size:0.75rem;font-weight:700;">
      ${a.nome}
      <button type="button" onclick="removerAluno(${a.id})" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.8);padding:0;line-height:1;font-size:0.875rem;">✕</button>
    </span>`).join('')
}

function irParaEtapa2() {
  const tipo = _destinatario.tipo
  if (!tipo) { toast('Selecione para quem é o aviso','error'); return }
  if (tipo === 'turmas') {
    const ids = [...document.querySelectorAll('.turma-check:checked')].map(el => Number(el.value))
    if (!ids.length) { toast('Selecione ao menos uma turma','error'); return }
    _destinatario.ids = ids
    _destinatario.turmasNomes = _turmasList.filter(t => ids.includes(t.id)).map(t => t.nome)
  }
  if (tipo === 'alunos') {
    if (!_alunosSelecionados.length) { toast('Adicione ao menos um aluno','error'); return }
    _destinatario.ids = _alunosSelecionados.map(a => a.id)
    _destinatario.alunosNomes = _alunosSelecionados.map(a => a.nome)
  }

  // Atualiza indicadores de etapa
  ativarStep(2)
  const resumoTexto = tipo === 'todos' ? 'Toda a escola'
    : tipo === 'turmas' ? _destinatario.turmasNomes.join(', ')
    : _alunosSelecionados.map(a => a.nome).join(', ')
  document.getElementById('step2-resumo-dest').textContent = '→ ' + resumoTexto

  document.getElementById('aviso-step1').style.display = 'none'
  document.getElementById('aviso-step2').style.display = ''
  renderizarTemplatesCustom()
}

function voltarEtapa1() {
  ativarStep(1)
  document.getElementById('aviso-step2').style.display = 'none'
  document.getElementById('aviso-step1').style.display = ''
}

function voltarEtapa2() {
  ativarStep(2)
  document.getElementById('form-aviso').style.display = 'none'
  document.getElementById('aviso-step2').style.display = ''
}

function ativarStep(n) {
  [1,2,3].forEach(i => {
    const circle = document.getElementById('step-circle-' + i)
    const label  = document.getElementById('step-label-' + i)
    if (!circle) return
    const ativo = i <= n
    circle.style.background = ativo ? '#2d6197' : '#e3e9ee'
    circle.style.color      = ativo ? 'white'   : '#abb3b9'
    label.style.color       = ativo ? '#2d6197' : '#abb3b9'
  })
}

// ── Etapa 2 → 3: Templates ────────────────────────────────────────────────────
const PLACEHOLDER_CONFIG = {
  'DATA':          { label: 'Data',               type: 'date'   },
  'DATA INÍCIO':   { label: 'Data de início',     type: 'date'   },
  'DATA FIM':      { label: 'Data de término',    type: 'date'   },
  'DATA RETORNO':  { label: 'Data de retorno',    type: 'date'   },
  'DATA LIMITE':   { label: 'Data limite',        type: 'date'   },
  'HORÁRIO':       { label: 'Horário',            type: 'time'   },
  'HORÁRIO INÍCIO':{ label: 'Horário de início',  type: 'time'   },
  'HORÁRIO FIM':   { label: 'Horário de término', type: 'time'   },
  'MÊS':           { label: 'Mês', type: 'select', options: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'] },
  'NÚMERO':        { label: 'Número de faltas',   type: 'number' },
  'TELEFONE':      { label: 'Telefone da escola', type: 'tel', placeholder: '(00) 0000-0000' },
}

function formatarValorPlaceholder(chave, valor) {
  if (!valor) return `[${chave}]`
  if (PLACEHOLDER_CONFIG[chave]?.type === 'date') {
    const [y,m,d] = valor.split('-'); return `${d}/${m}/${y}`
  }
  return valor
}

function autoFillSet() {
  // Placeholders preenchidos automaticamente pelo contexto — não viram campo manual
  const s = new Set()
  const tipo = _destinatario.tipo
  // TURMA e NOME DO ALUNO sempre auto-preenchidos (o valor varia por tipo)
  s.add('TURMA')
  s.add('NOME DO ALUNO')
  return s
}

function atualizarMensagemComCampos() {
  if (!_templateAtivo) return
  let msg = _templateAtivo.mensagem
  const tipo = _destinatario.tipo

  // Auto-fill [TURMA]
  if (tipo === 'todos') {
    msg = msg.replace(/\[TURMA\]/g, 'de sua turma')
  } else if (tipo === 'turmas') {
    const nomes = _destinatario.turmasNomes
    msg = msg.replace(/\[TURMA\]/g, nomes.length === 1 ? nomes[0] : nomes.join(', '))
  } else if (tipo === 'alunos' && _alunosSelecionados.length === 1) {
    if (_alunosSelecionados[0].turma_nome) msg = msg.replace(/\[TURMA\]/g, _alunosSelecionados[0].turma_nome)
    else msg = msg.replace(/\[TURMA\]/g, 'de sua turma')
  } else {
    msg = msg.replace(/\[TURMA\]/g, 'de sua turma')
  }

  // Auto-fill [NOME DO ALUNO]
  if (tipo === 'alunos' && _alunosSelecionados.length === 1) {
    msg = msg.replace(/\[NOME DO ALUNO\]/g, _alunosSelecionados[0].nome)
  } else if (tipo === 'alunos' && _alunosSelecionados.length > 1) {
    msg = msg.replace(/\[NOME DO ALUNO\]/g, 'seu(sua) filho(a)')
  } else {
    msg = msg.replace(/\[NOME DO ALUNO\]/g, 'seu(sua) filho(a)')
  }

  // Campos manuais preenchidos pelo usuário
  document.querySelectorAll('.campo-placeholder').forEach(el => {
    const chave = el.dataset.chave
    const valor = formatarValorPlaceholder(chave, el.value)
    msg = msg.replace(new RegExp(`\\[${chave}\\]`, 'g'), valor)
  })
  document.getElementById('aviso-mensagem').value = msg
}

function _mostrarEtapa3(t) {
  _templateAtivo = t || null
  ativarStep(3)
  const resumoTexto = _destinatario.tipo === 'todos' ? 'Toda a escola'
    : _destinatario.tipo === 'turmas' ? _destinatario.turmasNomes.join(', ')
    : _alunosSelecionados.map(a => a.nome).join(', ')
  document.getElementById('step3-resumo-dest').textContent = '→ ' + resumoTexto
  document.getElementById('aviso-step2').style.display = 'none'
  document.getElementById('form-aviso').style.display  = ''
}

function aplicarTemplate(i) {
  const t = _templatesList[i]
  _mostrarEtapa3(t)
  document.getElementById('aviso-titulo').value    = t.titulo
  document.getElementById('aviso-urgente').checked = !!t.urgente

  const fills = autoFillSet()
  const regex = /\[([^\]]+)\]/g
  const manuais = []
  let m
  while ((m = regex.exec(t.mensagem)) !== null) {
    if (!manuais.includes(m[1]) && !fills.has(m[1])) manuais.push(m[1])
  }

  const lista = document.getElementById('campos-template-lista')
  if (manuais.length === 0) {
    document.getElementById('campos-template').style.display = 'none'
    lista.innerHTML = ''
  } else {
    lista.innerHTML = manuais.map(chave => {
      const cfg = PLACEHOLDER_CONFIG[chave] || { label: chave.charAt(0)+chave.slice(1).toLowerCase(), type: 'text', placeholder: `Digite ${chave.toLowerCase()}...` }
      const id  = 'ph-' + chave.replace(/\s/g,'_')
      let input = ''
      if (cfg.type === 'select') {
        input = `<select id="${id}" class="campo-placeholder field-input" data-chave="${chave}" onchange="atualizarMensagemComCampos()" style="margin:0;"><option value="">Selecione...</option>${cfg.options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`
      } else {
        const ph = cfg.placeholder || ''
        input = `<input id="${id}" class="campo-placeholder field-input" type="${cfg.type||'text'}" data-chave="${chave}" oninput="atualizarMensagemComCampos()" placeholder="${ph}" style="margin:0;" />`
      }
      return `<div><label class="field-label">${cfg.label}</label>${input}</div>`
    }).join('')
    document.getElementById('campos-template').style.display = ''
  }
  atualizarMensagemComCampos()
}

// ── Templates personalizados (localStorage) ───────────────────────────────────
function carregarTemplatesPersonalizados() {
  try { return JSON.parse(localStorage.getItem('templates_custom') || '[]') } catch { return [] }
}
function salvarTemplatesPersonalizados(lista) {
  localStorage.setItem('templates_custom', JSON.stringify(lista))
}
function renderizarTemplatesCustom() {
  const lista = carregarTemplatesPersonalizados()
  const container = document.getElementById('templates-custom-section')
  if (!container) return
  if (lista.length === 0) { container.style.display = 'none'; return }
  container.style.display = ''
  document.getElementById('templates-custom-lista').innerHTML = lista.map((t, i) => `
    <div style="display:flex;align-items:flex-start;gap:0.5rem;">
      <button type="button" onclick="aplicarTemplateCustom(${i})"
        style="flex:1;text-align:left;padding:0.875rem 1rem;border-radius:1rem;border:1.5px solid #e3e9ee;background:white;cursor:pointer;transition:all 0.15s;font-family:'Manrope',system-ui,sans-serif;display:flex;align-items:flex-start;gap:0.625rem;"
        onmouseover="this.style.borderColor='#2d6197';this.style.background='#f0f4f8'"
        onmouseout="this.style.borderColor='#e3e9ee';this.style.background='white'">
        <span class="material-symbols-outlined" style="font-size:1rem;color:#2e7d52;margin-top:0.1rem;flex-shrink:0;">bookmark</span>
        <div style="min-width:0;">
          <p style="font-size:0.8125rem;font-weight:700;color:#2c3338;margin:0 0 0.2rem;">${t.titulo}</p>
          <p style="font-size:0.7rem;color:#596065;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4;">${t.mensagem}</p>
        </div>
      </button>
      <button type="button" onclick="excluirTemplateCustom(${i})" title="Excluir"
        style="padding:0.5rem;border-radius:0.75rem;border:1.5px solid #e3e9ee;background:white;cursor:pointer;color:#a83836;flex-shrink:0;"
        onmouseover="this.style.background='#fff2f2'" onmouseout="this.style.background='white'">
        <span class="material-symbols-outlined" style="font-size:1rem;display:block;">delete</span>
      </button>
    </div>`).join('')
}
function aplicarTemplateCustom(i) {
  const lista = carregarTemplatesPersonalizados()
  const t = { ...lista[i], urgente: lista[i].urgente || false }
  _mostrarEtapa3(t)
  document.getElementById('aviso-titulo').value    = t.titulo
  document.getElementById('aviso-urgente').checked = !!t.urgente
  document.getElementById('campos-template').style.display = 'none'
  document.getElementById('campos-template-lista').innerHTML = ''
  document.getElementById('aviso-mensagem').value = t.mensagem
}
function excluirTemplateCustom(i) {
  const lista = carregarTemplatesPersonalizados()
  lista.splice(i, 1)
  salvarTemplatesPersonalizados(lista)
  renderizarTemplatesCustom()
  toast('Template excluído')
}
function toggleCriarAviso() {
  const painel = document.getElementById('criar-aviso-painel')
  painel.style.display = painel.style.display === 'none' ? '' : 'none'
  if (painel.style.display !== 'none') {
    document.getElementById('novo-titulo').focus()
  }
}

function salvarNovoTemplate() {
  const titulo   = document.getElementById('novo-titulo').value.trim()
  const mensagem = document.getElementById('novo-mensagem').value.trim()
  if (!titulo || !mensagem) { toast('Preencha título e mensagem antes de salvar','error'); return }
  const lista = carregarTemplatesPersonalizados()
  if (lista.find(t => t.titulo === titulo)) { toast('Já existe um template com este título','error'); return }
  lista.push({ titulo, mensagem, urgente: document.getElementById('novo-urgente').checked })
  salvarTemplatesPersonalizados(lista)
  renderizarTemplatesCustom()
  toast('Template salvo! Aparece em "Meus templates".')
}

function usarNovoAviso() {
  const titulo   = document.getElementById('novo-titulo').value.trim()
  const mensagem = document.getElementById('novo-mensagem').value.trim()
  if (!titulo || !mensagem) { toast('Preencha título e mensagem','error'); return }
  _templateAtivo = { titulo, mensagem, urgente: document.getElementById('novo-urgente').checked }
  _mostrarEtapa3(_templateAtivo)
  document.getElementById('aviso-titulo').value    = titulo
  document.getElementById('aviso-mensagem').value  = mensagem
  document.getElementById('aviso-urgente').checked = !!_templateAtivo.urgente
  document.getElementById('campos-template').style.display = 'none'
  document.getElementById('campos-template-lista').innerHTML = ''
}

function usarAvisoPersonalizado() {
  // mantida por compatibilidade — não usada mais na UI
  _templateAtivo = null
  _mostrarEtapa3(null)
  document.getElementById('campos-template').style.display = 'none'
  document.getElementById('campos-template-lista').innerHTML = ''
  document.getElementById('aviso-titulo').value    = ''
  document.getElementById('aviso-mensagem').value  = ''
  document.getElementById('aviso-urgente').checked = false
}

// ── Etapa 3: Enviar ───────────────────────────────────────────────────────────
async function enviarAviso(e) {
  e.preventDefault()
  const { tipo, ids } = _destinatario
  const destinatarios = { tipo }
  if (tipo === 'turmas' || tipo === 'alunos') destinatarios.ids = ids

  const btn = document.getElementById('btn-enviar-aviso')
  btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Enviando...'
  try {
    const enviado_por = document.getElementById('aviso-enviado-por').value.trim()
    if (!enviado_por) { toast('Informe seu nome antes de enviar','error'); btn.disabled=false; btn.innerHTML='<span class="material-symbols-outlined">send</span> Enviar Aviso'; return }
    const r = await api('/admin/avisos', { method:'POST', body:JSON.stringify({
      titulo: document.getElementById('aviso-titulo').value.trim(),
      mensagem: document.getElementById('aviso-mensagem').value.trim(),
      urgente: document.getElementById('aviso-urgente').checked,
      destinatarios,
      enviado_por
    })})
    toast('Aviso enviado! ' + r.push_enviados + ' notificações disparadas')
    resetarFormulario()
  } catch(err) { toast(err.message,'error') }
  finally { btn.disabled=false; btn.innerHTML='<span class="material-symbols-outlined">send</span> Enviar Aviso' }
}

function resetarFormulario() {
  _destinatario      = { tipo: null, ids: [], turmasNomes: [], alunosNomes: [] }
  _alunosSelecionados = []
  _templateAtivo     = null
  ativarStep(1)
  // Mostra etapa 1, esconde as outras
  document.getElementById('aviso-step1').style.display = ''
  document.getElementById('aviso-step2').style.display = 'none'
  document.getElementById('form-aviso').style.display  = 'none'
  // Limpa seleções
  document.querySelectorAll('.turma-check').forEach(c => c.checked = false)
  document.getElementById('dest-turmas-lista').style.display  = 'none'
  document.getElementById('dest-alunos-busca').style.display  = 'none'
  ;['dest-card-todos','dest-card-turmas','dest-card-alunos'].forEach(id => {
    const el = document.getElementById(id)
    el.style.borderColor = 'transparent'; el.style.background = ''
  })
  document.getElementById('busca-aluno-nome').value = ''
  document.getElementById('busca-turma-id').value   = ''
  document.getElementById('busca-alunos-resultado').innerHTML = ''
  document.getElementById('alunos-selecionados').style.display = 'none'
  document.getElementById('alunos-selecionados-lista').innerHTML = ''
  document.getElementById('campos-template-lista').innerHTML = ''
  document.getElementById('campos-template').style.display = 'none'
  document.getElementById('criar-aviso-painel').style.display = 'none'
  document.getElementById('novo-titulo').value    = ''
  document.getElementById('novo-mensagem').value  = ''
  document.getElementById('novo-urgente').checked = false
  if (document.getElementById('form-aviso')) document.getElementById('form-aviso').reset()
}

// ── Importar CSV ─────────────────────────────────────────────────────────────
function atualizarNomeArquivo(input) {
  const el = document.getElementById('csv-nome-arquivo')
  if (input.files[0]) { el.textContent = input.files[0].name; el.style.display = 'block' }
}
function handleDrop(e) {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (file && file.name.endsWith('.csv')) {
    const dt = new DataTransfer(); dt.items.add(file)
    const input = document.getElementById('csv-file'); input.files = dt.files; atualizarNomeArquivo(input)
  }
}
async function importarCsv() {
  const file = document.getElementById('csv-file').files[0]
  if (!file) { toast('Selecione um arquivo CSV','error'); return }
  const formData = new FormData(); formData.append('arquivo', file)
  const btn = document.getElementById('btn-importar')
  btn.disabled=true; btn.innerHTML='<span class="material-symbols-outlined animate-spin">progress_activity</span> Importando...'
  try {
    const res = await fetch(API_BASE+'/importar-csv', { method:'POST', headers:{'Authorization':'Bearer '+TOKEN}, body:formData })
    const data = await res.json(); if (!res.ok) throw new Error(data.error)
    document.getElementById('csv-resultado').innerHTML = `
      <div class="card">
        <p style="font-size:0.875rem;font-weight:700;color:#2c3338;margin:0 0 1rem;">Resultado da Importação</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem;text-align:center;">
          <div style="background:#f0faf4;border-radius:1rem;padding:1.25rem 0.5rem;">
            <p style="font-size:2rem;font-weight:800;color:#2e7d52;margin:0;">${data.vinculados}</p>
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#596065;margin:0.25rem 0 0;">Vinculados</p>
          </div>
          <div style="background:#eef4fb;border-radius:1rem;padding:1.25rem 0.5rem;">
            <p style="font-size:2rem;font-weight:800;color:#2d6197;margin:0;">${data.alunos_criados||0}</p>
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#596065;margin:0.25rem 0 0;">Alunos criados</p>
          </div>
          <div style="background:#fff3f2;border-radius:1rem;padding:1.25rem 0.5rem;">
            <p style="font-size:2rem;font-weight:800;color:#a83836;margin:0;">${data.nao_vinculados?.length||0}</p>
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#596065;margin:0.25rem 0 0;">Não encontrados</p>
          </div>
          <div style="background:#fff8e6;border-radius:1rem;padding:1.25rem 0.5rem;">
            <p style="font-size:2rem;font-weight:800;color:#b45309;margin:0;">${data.sem_turma}</p>
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#596065;margin:0.25rem 0 0;">Sem turma</p>
          </div>
        </div>
        ${data.nao_vinculados?.length?`<details style="margin-top:0.5rem;"><summary style="font-size:0.875rem;font-weight:700;color:#596065;cursor:pointer;">Ver não encontrados (${data.nao_vinculados.length})</summary><div style="margin-top:0.75rem;display:flex;flex-direction:column;gap:0.5rem;">${data.nao_vinculados.map(n=>`<div style="font-size:0.75rem;color:#596065;padding:0.625rem 1rem;background:#f7f9fc;border-radius:0.75rem;"><strong style="color:#2c3338;">${n.nome_aluno_csv}</strong> — Turma <strong>${n.turma_csv}</strong> — ${n.nome_responsavel}${n.telefone?' — '+n.telefone:''}</div>`).join('')}</div></details>`:''}
        ${data.sem_turma_lista?.length?`<details style="margin-top:0.5rem;" open><summary style="font-size:0.875rem;font-weight:700;color:#b45309;cursor:pointer;display:flex;align-items:center;gap:0.375rem;"><span class="material-symbols-outlined" style="font-size:1rem;">warning</span> Sem turma identificada — requerem correção (${data.sem_turma_lista.length})</summary><div style="margin-top:0.75rem;display:flex;flex-direction:column;gap:0.5rem;">${data.sem_turma_lista.map(n=>`<div style="font-size:0.75rem;color:#596065;padding:0.625rem 1rem;background:#fff8e6;border-left:3px solid #f59e0b;border-radius:0 0.75rem 0.75rem 0;"><strong style="color:#2c3338;">${n.nome_responsavel||'(sem nome responsável)'}</strong>${n.nome_csv&&n.nome_csv!=='(sem nome)'?' — aluno: '+n.nome_csv:''}<br><span style="color:#b45309;">Turma no CSV: <strong>${n.turma_csv||'—'}</strong></span>${n.telefone?'<br>Telefone: '+n.telefone:''}</div>`).join('')}</div><p style="font-size:0.75rem;color:#b45309;margin:0.75rem 0 0;padding:0.625rem 1rem;background:#fff8e6;border-radius:0.75rem;">Adicione estes alunos à turma correta manualmente na aba <strong>Alunos</strong> e reimporte o CSV.</p></details>`:''}
      </div>`
    toast(data.vinculados + ' responsáveis vinculados com sucesso')
  } catch(err) { toast(err.message,'error') }
  finally { btn.disabled=false; btn.innerHTML='<span class="material-symbols-outlined">cloud_upload</span> Importar CSV' }
}

// ── Turmas ───────────────────────────────────────────────────────────────────
async function loadTurmas() {
  try {
    const turmas = await api('/admin/turmas'); if (!turmas) return
    document.getElementById('turmas-grid').innerHTML = turmas.map(t => `
      <div class="card" style="display:flex;flex-direction:column;gap:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem;">
          <div>
            <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#2d6197;">${t.codigo}</span>
            <h3 style="font-size:1rem;font-weight:700;color:#2c3338;margin:0.2rem 0 0;">${t.nome}</h3>
          </div>
          <span class="badge ${t.ativa?'badge-green':'badge-gray'}">${t.ativa?'Ativa':'Inativa'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:1rem;text-align:center;">
          <div style="background:#f0f4f8;border-radius:0.75rem;padding:0.75rem 0.25rem;">
            <p style="font-size:1.25rem;font-weight:800;color:#2c3338;margin:0;">${t.total_alunos}</p>
            <p style="font-size:10px;font-weight:700;color:#596065;margin:0.2rem 0 0;">Alunos</p>
          </div>
          <div style="background:#f0faf4;border-radius:0.75rem;padding:0.75rem 0.25rem;">
            <p style="font-size:1.25rem;font-weight:800;color:#2e7d52;margin:0;">${t.com_app}</p>
            <p style="font-size:10px;font-weight:700;color:#596065;margin:0.2rem 0 0;">Com app</p>
          </div>
          <div style="background:#fff3f2;border-radius:0.75rem;padding:0.75rem 0.25rem;">
            <p style="font-size:1.25rem;font-weight:800;color:#a83836;margin:0;">${t.sem_app}</p>
            <p style="font-size:10px;font-weight:700;color:#596065;margin:0.2rem 0 0;">Sem app</p>
          </div>
        </div>
        <button onclick="verQrCode(${t.id},'${t.codigo}','${t.nome}')" class="btn-outline" style="width:100%;padding:0.625rem;font-size:0.875rem;">
          <span class="material-symbols-outlined" style="font-size:1rem;">qr_code</span> Ver QR Code
        </button>
      </div>`).join('')
  } catch(err) { toast(err.message,'error') }
}

async function verQrCode(id, codigo, nome) {
  try {
    const data = await api('/admin/turmas/'+id+'/qrcode'); if (!data) return
    const url = data.url
    showModal(`
      <div style="text-align:center;">
        <span class="badge badge-blue" style="margin-bottom:0.75rem;display:inline-block;">QR Code</span>
        <h3 style="font-size:1.25rem;font-weight:800;color:#2c3338;margin:0 0 0.25rem;">${codigo} — ${nome}</h3>
        <p style="font-size:0.875rem;color:#596065;margin:0 0 1.5rem;">Imprima e entregue para os responsáveis escanearem</p>
        <div id="qr-canvas" style="display:flex;justify-content:center;margin-bottom:1.25rem;"></div>
        <div style="background:#f0f4f8;border-radius:0.75rem;padding:0.75rem 1rem;font-size:0.75rem;color:#596065;word-break:break-all;text-align:left;margin-bottom:1.25rem;">${url}</div>
        <div style="display:flex;gap:0.75rem;">
          <button onclick="navigator.clipboard.writeText('${url}').then(()=>toast('Link copiado!'))" class="btn-outline" style="flex:1;padding:0.75rem;font-size:0.875rem;">Copiar link</button>
          <button onclick="window.print()" class="btn-primary" style="flex:1;padding:0.75rem;font-size:0.875rem;">Imprimir</button>
        </div>
      </div>`)
    new QRCode(document.getElementById('qr-canvas'), { text:url, width:200, height:200, colorDark:'#2c3338', colorLight:'#ffffff' })
  } catch(err) { toast(err.message,'error') }
}

// ── Alunos ───────────────────────────────────────────────────────────────────
async function loadAlunos() {
  const busca    = document.getElementById('busca-aluno')?.value || ''
  const turma_id = document.getElementById('filtro-turma-aluno')?.value || ''
  const params   = new URLSearchParams()
  if (busca)    params.set('busca', busca)
  if (turma_id) params.set('turma_id', turma_id)
  try {
    const alunos = await api('/admin/alunos?'+params); if (!alunos) return
    // Preencher select de turmas na primeira vez
    const sel = document.getElementById('filtro-turma-aluno')
    if (sel.options.length <= 1 && _turmasList.length) {
      _turmasList.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.codigo+' — '+t.nome; sel.appendChild(o) })
    } else if (sel.options.length <= 1) {
      api('/admin/turmas').then(turmas => { if(!turmas) return; _turmasList=turmas; turmas.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.codigo+' — '+t.nome; sel.appendChild(o) }) })
    }
    document.getElementById('alunos-tbody').innerHTML = alunos.length ? alunos.map(a => `
      <tr>
        <td style="font-weight:600;">${a.nome}</td>
        <td><span class="badge badge-blue">${a.turma_codigo||'—'}</span></td>
        <td style="color:#596065;">${a.responsavel_nome||'<span style="color:#abb3b9;font-style:italic;">Sem responsável</span>'}</td>
        <td style="text-align:center;">${a.tem_app?'<span class="badge badge-green">✓ Com app</span>':'<span class="badge badge-gray">Sem app</span>'}</td>
        <td style="text-align:center; white-space:nowrap;">
          <button onclick="vincularResponsavel(${a.id},'${a.nome.replace(/'/g,"\\'")}','${(a.responsavel_nome||'').replace(/'/g,"\\'")}')\"
            style="font-size:0.75rem;font-weight:700;color:#2d6197;background:none;border:none;cursor:pointer;margin-right:0.5rem;">Vincular</button>
          <button onclick="confirmarExcluirAluno(${a.id},'${a.nome.replace(/'/g,"\\'")}',${!!a.responsavel_nome})"
            style="font-size:0.75rem;font-weight:700;color:#a83836;background:none;border:none;cursor:pointer;">Excluir</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:#596065;">Nenhum aluno encontrado</td></tr>'
  } catch(err) { toast(err.message,'error') }
}

function abrirModalNovoAluno() {
  const opcoesTormas = (_turmasList.length ? _turmasList : []).map(t =>
    `<option value="${t.id}">${t.codigo} — ${t.nome}</option>`).join('')
  showModal(`
    <h3 style="font-size:1.125rem;font-weight:800;color:#2c3338;margin:0 0 1.25rem;">Adicionar Aluno</h3>
    <div style="display:flex;flex-direction:column;gap:0.875rem;">
      <div>
        <label class="field-label">Nome do Aluno *</label>
        <input id="novo-aluno-nome" class="field-input" type="text" placeholder="Nome completo do aluno" style="margin:0;" />
      </div>
      <div>
        <label class="field-label">Turma *</label>
        <select id="novo-aluno-turma" class="field-input" style="margin:0;">
          <option value="">Selecione a turma...</option>
          ${opcoesTormas}
        </select>
      </div>
      <div>
        <label class="field-label">Matrícula (opcional)</label>
        <input id="novo-aluno-matricula" class="field-input" type="text" placeholder="Número de matrícula" style="margin:0;" />
      </div>
      <div style="margin-top:0.5rem; padding-top:0.875rem; border-top:1.5px solid #e3e9ee;">
        <p style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#2d6197;margin:0 0 0.875rem;">Responsável *</p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <div>
            <label class="field-label">Nome do Responsável *</label>
            <input id="novo-resp-nome" class="field-input" type="text" placeholder="Nome completo" style="margin:0;" />
          </div>
          <div>
            <label class="field-label">Telefone (opcional)</label>
            <input id="novo-resp-tel" class="field-input" type="text" placeholder="(00) 00000-0000" style="margin:0;" />
          </div>
        </div>
      </div>
      <button onclick="salvarNovoAluno()" class="btn-primary" style="width:100%;padding:0.875rem;font-size:0.875rem;min-height:3rem;margin-top:0.25rem;">
        <span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">person_add</span> Salvar Aluno
      </button>
    </div>`)
}

async function salvarNovoAluno() {
  const nome      = document.getElementById('novo-aluno-nome').value.trim()
  const turma_id  = document.getElementById('novo-aluno-turma').value
  const matricula = document.getElementById('novo-aluno-matricula').value.trim()
  const respNome  = document.getElementById('novo-resp-nome').value.trim()
  const respTel   = document.getElementById('novo-resp-tel').value.trim()
  if (!nome)     { toast('Informe o nome do aluno','error'); return }
  if (!turma_id) { toast('Selecione a turma','error'); return }
  if (!respNome) { toast('Informe o nome do responsável','error'); return }
  try {
    const aluno = await api('/admin/alunos', { method:'POST', body:JSON.stringify({ nome, turma_id: Number(turma_id), matricula: matricula||null }) })
    if (!aluno) return
    await api('/admin/vincular-manual', { method:'POST', body:JSON.stringify({ aluno_id: aluno.id, nome_responsavel: respNome, telefone: respTel||null }) })
    toast('Aluno adicionado com sucesso')
    closeModal()
    loadAlunos()
  } catch(err) { toast(err.message,'error') }
}

function confirmarExcluirAluno(alunoId, alunoNome, temResponsavel) {
  showModal(`
    <div style="text-align:center;">
      <span class="material-symbols-outlined" style="font-size:3rem;color:#a83836;font-variation-settings:'FILL' 1;">warning</span>
      <h3 style="font-size:1.125rem;font-weight:800;color:#2c3338;margin:0.75rem 0 0.5rem;">Excluir aluno?</h3>
      <p style="font-size:0.875rem;color:#596065;margin:0 0 0.5rem;"><strong>${alunoNome}</strong></p>
      ${temResponsavel ? '<p style="font-size:0.8125rem;color:#a83836;margin:0 0 1.5rem;font-weight:600;">O responsável vinculado também será excluído.</p>' : '<p style="font-size:0.8125rem;color:#596065;margin:0 0 1.5rem;">Esta ação não pode ser desfeita.</p>'}
      <div style="display:flex;gap:0.625rem;">
        <button onclick="closeModal()" class="btn-outline" style="flex:1;padding:0.875rem;font-size:0.875rem;">Cancelar</button>
        <button onclick="excluirAluno(${alunoId})" style="flex:1;padding:0.875rem;font-size:0.875rem;font-weight:700;background:#a83836;color:white;border:none;border-radius:1rem;cursor:pointer;">Excluir</button>
      </div>
    </div>`)
}

async function excluirAluno(alunoId) {
  try {
    await api('/admin/alunos/' + alunoId, { method:'DELETE' })
    toast('Aluno excluído')
    closeModal()
    loadAlunos()
  } catch(err) { toast(err.message,'error') }
}

function vincularResponsavel(alunoId, alunoNome) {
  showModal(`
    <h3 style="font-size:1.125rem;font-weight:800;color:#2c3338;margin:0 0 0.25rem;">Vincular Responsável</h3>
    <p style="font-size:0.875rem;color:#596065;margin:0 0 1.5rem;">Aluno: <strong>${alunoNome}</strong></p>
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <div><label class="field-label">Nome do Responsável</label><input id="resp-nome" class="field-input" type="text" placeholder="Nome completo" /></div>
      <div><label class="field-label">Telefone (opcional)</label><input id="resp-tel" class="field-input" type="text" placeholder="(11) 99999-9999" /></div>
      <button onclick="salvarVinculo(${alunoId})" class="btn-primary" style="width:100%;padding:0.875rem;font-size:0.875rem;min-height:3rem;">Salvar</button>
    </div>`)
}

async function salvarVinculo(alunoId) {
  const nome = document.getElementById('resp-nome').value.trim()
  const tel  = document.getElementById('resp-tel').value.trim()
  if (!nome) { toast('Informe o nome do responsável','error'); return }
  try {
    await api('/admin/vincular-manual', { method:'POST', body:JSON.stringify({ aluno_id:alunoId, nome_responsavel:nome, telefone:tel||null }) })
    toast('Responsável vinculado com sucesso'); closeModal(); loadAlunos()
  } catch(err) { toast(err.message,'error') }
}

// ── Responsáveis ─────────────────────────────────────────────────────────────
async function loadResponsaveis() {
  try {
    const resp = await api('/admin/responsaveis'); if (!resp) return
    document.getElementById('resp-tbody').innerHTML = resp.length ? resp.map(r => `
      <tr>
        <td style="font-weight:600;">${r.nome}</td>
        <td style="color:#596065;">${r.aluno_nome||'—'}</td>
        <td><span class="badge badge-blue">${r.turma_codigo||'—'}</span></td>
        <td style="color:#596065;">${r.telefone||'—'}</td>
        <td style="text-align:center;">${r.tem_app?'<span class="badge badge-green">✓ Com app</span>':'<span class="badge badge-gray">Sem app</span>'}</td>
        <td style="font-size:0.75rem;color:#abb3b9;">${r.ultimo_acesso?new Date(r.ultimo_acesso).toLocaleDateString('pt-BR'):'—'}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:#596065;">Nenhum responsável cadastrado</td></tr>'
  } catch(err) { toast(err.message,'error') }
}

// ── Histórico ─────────────────────────────────────────────────────────────────
async function loadHistorico() {
  try {
    const avisos = await api('/admin/avisos'); if (!avisos) return
    document.getElementById('hist-tbody').innerHTML = avisos.length ? avisos.map(a => `
      <tr>
        <td style="cursor:pointer;" onclick="verEntregas(${a.id},'${a.titulo.replace(/'/g,"\\'")}')">
          <div style="display:flex;align-items:center;gap:0.5rem;">${a.urgente?'<span class="badge badge-red">Urgente</span>':''}<span style="font-weight:600;">${a.titulo}</span></div>
          ${a.enviado_por?`<div style="font-size:0.7rem;color:#596065;margin-top:0.2rem;"><span class="material-symbols-outlined" style="font-size:0.75rem;vertical-align:middle;">person</span> ${a.enviado_por} <span style="color:#abb3b9;">— ${a.admin_nome||''}</span></div>`:''}
        </td>
        <td style="text-align:center;color:#596065;">${a.total_entregas||0}</td>
        <td style="text-align:center;"><span class="badge badge-blue">${a.push_enviados||0}</span></td>
        <td style="text-align:center;"><span class="badge badge-green">${a.abertos||0}</span></td>
        <td style="font-size:0.75rem;color:#abb3b9;">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</td>
        <td style="text-align:center;">
          <button onclick="excluirAviso(${a.id}, event)" title="Excluir aviso" style="background:none;border:none;cursor:pointer;padding:0.25rem;color:#abb3b9;border-radius:0.5rem;" onmouseover="this.style.color='#a83836';this.style.background='#fff3f2'" onmouseout="this.style.color='#abb3b9';this.style.background='none'">
            <span class="material-symbols-outlined" style="font-size:1.125rem;">delete</span>
          </button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:#596065;">Nenhum aviso enviado ainda</td></tr>'
  } catch(err) { toast(err.message,'error') }
}

async function excluirAviso(id, e) {
  e.stopPropagation()
  if (!confirm('Excluir este aviso e todas as suas entregas?')) return
  try {
    await api('/admin/avisos/'+id, { method:'DELETE' }); if (TOKEN===null) return
    toast('Aviso excluído')
    loadHistorico()
  } catch(err) { toast(err.message,'error') }
}

async function limparHistorico() {
  if (!confirm('Excluir TODO o histórico de avisos? Esta ação não pode ser desfeita.')) return
  try {
    await api('/admin/avisos', { method:'DELETE' }); if (TOKEN===null) return
    toast('Histórico apagado')
    loadHistorico()
  } catch(err) { toast(err.message,'error') }
}

async function exportarHistorico() {
  try {
    const res = await fetch(API_BASE + '/avisos/exportar', {
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    })
    if (!res.ok) { toast('Erro ao exportar', 'error'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-avisos-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch(err) { toast(err.message, 'error') }
}

async function verEntregas(avisoId, titulo) {
  try {
    const data = await api('/admin/avisos/'+avisoId+'/entregas'); if (!data) return
    showModal(`
      <h3 style="font-size:1.125rem;font-weight:800;color:#2c3338;margin:0 0 0.25rem;">${titulo}</h3>
      <p style="font-size:0.875rem;color:#596065;margin:0 0 1rem;">${data.entregas.length} destinatário(s)</p>
      <div style="display:flex;flex-direction:column;gap:0.5rem;max-height:60vh;overflow-y:auto;">
        ${data.entregas.map(e=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:#f7f9fc;border-radius:1rem;">
            <div>
              <p style="font-size:0.875rem;font-weight:600;color:#2c3338;margin:0;">${e.responsavel_nome}</p>
              <p style="font-size:0.75rem;color:#596065;margin:0.1rem 0 0;">${e.aluno_nome} — ${e.turma_codigo||''}</p>
            </div>
            <div style="display:flex;gap:0.375rem;">
              ${e.push_enviado?'<span class="badge badge-blue">Enviado</span>':'<span class="badge badge-gray">Não enviado</span>'}
              ${e.aberto?'<span class="badge badge-green">Aberto</span>':''}
            </div>
          </div>`).join('')}
      </div>`)
  } catch(err) { toast(err.message,'error') }
}

// ── Solicitações dos Pais ────────────────────────────────────────────────────
const TIPOS_SOLICITACAO_LABELS = {
  falta_sem_atestado: 'Falta (sem atestado)',
  falta_com_atestado: 'Falta (com atestado)',
  vai_ter_aula: 'Vai ter aula hoje?',
  quem_vai_buscar: 'Quem vai buscar',
  atestado_frequencia: 'Atestado de Frequência',
  atestado_matricula: 'Atestado de Matrícula',
  historico_escolar: 'Histórico Escolar',
  atualizar_contato: 'Atualizar contato',
}

async function carregarSolicitacoes() {
  try {
    const filtroUrgentes = document.getElementById('filtro-urgentes-sol').checked
    const solicitacoes = await api('/solicitacoes/admin'); if (!solicitacoes) return

    const filtradas = filtroUrgentes ? solicitacoes.filter(s => s.urgente) : solicitacoes

    document.getElementById('sol-tbody').innerHTML = filtradas.length ? filtradas.map(s => `
      <tr style="${s.urgente?'background:#fff3f2;':''}" onclick="verSolicitacao(${s.id})">
        <td onclick="event.stopPropagation();" style="width:40px;">
          <input type="checkbox" class="sol-checkbox" data-id="${s.id}" onchange="updateBotaoApagar()" style="width:1rem;height:1rem;cursor:pointer;" />
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            ${s.urgente?'<span class="badge badge-red" style="font-size:9px;">URGENTE</span>':''}
            <span style="font-weight:600;${s.urgente?'color:#a83836;':''}">${TIPOS_SOLICITACAO_LABELS[s.tipo]||s.tipo}</span>
          </div>
        </td>
        <td style="color:#596065;">${s.aluno_nome||'—'}</td>
        <td style="color:#596065;">${s.responsavel_nome||'—'}</td>
        <td style="max-width:300px;"><div class="line-clamp-2" style="font-size:0.8rem;color:#596065;">${s.mensagem||'—'}</div></td>
        <td style="font-size:0.75rem;color:#abb3b9;">${new Date(s.criada_em).toLocaleDateString('pt-BR')} ${new Date(s.criada_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
        <td style="text-align:center;">
          ${s.respondida ? '<span class="badge badge-green">Respondida</span>' : (s.lida ? '<span class="badge badge-blue">Lida</span>' : '<span class="badge badge-gray">Nova</span>')}
        </td>
        <td style="text-align:center;">
          <button onclick="event.stopPropagation();verSolicitacao(${s.id})" style="background:none;border:none;cursor:pointer;color:#2d6197;padding:0.25rem;" title="Ver detalhes">
            <span class="material-symbols-outlined" style="font-size:1.125rem;">visibility</span>
          </button>
          <button onclick="event.stopPropagation();apagarSolicitacao(${s.id})" style="background:none;border:none;cursor:pointer;color:#a83836;padding:0.25rem;" title="Apagar">
            <span class="material-symbols-outlined" style="font-size:1.125rem;">delete</span>
          </button>
        </td>
      </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#596065;">${filtroUrgentes?'Nenhuma solicitação urgente':'Nenhuma solicitação ainda'}</td></tr>`
  } catch(err) { toast(err.message,'error') }
}

async function verSolicitacao(id) {
  try {
    const sol = await api('/solicitacoes/admin/'+id); if (!sol) return

    // Marca como lida automaticamente
    if (!sol.lida) {
      await api('/solicitacoes/admin/'+id+'/lida', { method:'POST' })
    }

    showModal(`
      <div style="margin-bottom:1.25rem;">
        ${sol.urgente?'<div style="background:#fff3f2;color:#a83836;padding:0.75rem 1rem;border-radius:1rem;margin-bottom:1rem;font-weight:700;font-size:0.875rem;display:flex;align-items:center;gap:0.5rem;"><span class="material-symbols-outlined">warning</span> Solicitação Urgente</div>':''}
        <h3 style="font-size:1.125rem;font-weight:800;color:#2c3338;margin:0 0 0.25rem;">${TIPOS_SOLICITACAO_LABELS[sol.tipo]||sol.tipo}</h3>
        <p style="font-size:0.75rem;color:#596065;margin:0;">${new Date(sol.criada_em).toLocaleString('pt-BR')}</p>
      </div>

      <div style="background:#f7f9fc;padding:1rem;border-radius:1rem;margin-bottom:1rem;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#596065;margin:0 0 0.375rem;">Aluno</p>
        <p style="font-size:0.875rem;font-weight:600;color:#2c3338;margin:0;">${sol.aluno_nome||'—'}</p>
      </div>

      <div style="background:#f7f9fc;padding:1rem;border-radius:1rem;margin-bottom:1rem;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#596065;margin:0 0 0.375rem;">Responsável</p>
        <p style="font-size:0.875rem;font-weight:600;color:#2c3338;margin:0;">${sol.responsavel_nome||'—'}</p>
      </div>

      <div style="background:#f7f9fc;padding:1rem;border-radius:1rem;margin-bottom:1rem;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#596065;margin:0 0 0.375rem;">Mensagem</p>
        <p style="font-size:0.875rem;color:#2c3338;margin:0;white-space:pre-wrap;">${sol.mensagem||'—'}</p>
      </div>

      ${sol.respondida?`
      <div style="background:#f0faf4;padding:1rem;border-radius:1rem;margin-bottom:1rem;border:1.5px solid rgba(46,125,82,0.2);">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#2e7d52;margin:0 0 0.375rem;">Resposta enviada</p>
        <p style="font-size:0.875rem;color:#2c3338;margin:0;white-space:pre-wrap;">${sol.resposta}</p>
        <p style="font-size:0.75rem;color:#596065;margin:0.5rem 0 0;">${new Date(sol.respondida_em).toLocaleString('pt-BR')}</p>
      </div>
      `:`
      <div style="margin-top:1.25rem;">
        <label class="field-label">Responder solicitação (opcional)</label>
        <textarea id="resposta-sol" class="field-input" rows="3" placeholder="Digite sua resposta aqui..." style="margin-bottom:0.75rem;"></textarea>
        <button onclick="responderSolicitacao(${id})" class="btn-primary" style="width:100%;padding:0.75rem;font-size:0.875rem;">Enviar resposta</button>
      </div>
      `}

      <button onclick="closeModal();carregarSolicitacoes()" class="btn-outline" style="width:100%;padding:0.75rem;font-size:0.875rem;margin-top:0.75rem;">Fechar</button>
    `)
  } catch(err) { toast(err.message,'error') }
}

async function responderSolicitacao(id) {
  const resposta = document.getElementById('resposta-sol').value.trim()
  if (!resposta) { toast('Digite uma resposta','error'); return }
  try {
    await api('/solicitacoes/admin/'+id+'/responder', { method:'POST', body:JSON.stringify({ resposta }) })
    toast('Resposta enviada')
    closeModal()
    carregarSolicitacoes()
  } catch(err) { toast(err.message,'error') }
}

function toggleSelectAll() {
  const selectAll = document.getElementById('select-all-sol')
  const checkboxes = document.querySelectorAll('.sol-checkbox')
  checkboxes.forEach(cb => cb.checked = selectAll.checked)
  updateBotaoApagar()
}

function updateBotaoApagar() {
  const checkboxes = document.querySelectorAll('.sol-checkbox:checked')
  const btn = document.getElementById('btn-apagar-selecionadas')
  btn.style.display = checkboxes.length > 0 ? 'flex' : 'none'
}

async function apagarSolicitacao(id) {
  if (!confirm('Tem certeza que deseja apagar esta solicitação?')) return
  try {
    await api('/solicitacoes/admin/'+id, { method:'DELETE' })
    toast('Solicitação apagada')
    carregarSolicitacoes()
  } catch(err) { toast(err.message,'error') }
}

async function apagarSolicitacoesSelecionadas() {
  const checkboxes = document.querySelectorAll('.sol-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id))
  if (ids.length === 0) { toast('Selecione ao menos uma solicitação','error'); return }
  if (!confirm(`Tem certeza que deseja apagar ${ids.length} solicitação(ões)?`)) return

  try {
    await Promise.all(ids.map(id => api('/solicitacoes/admin/'+id, { method:'DELETE' })))
    toast(`${ids.length} solicitação(ões) apagada(s)`)
    document.getElementById('select-all-sol').checked = false
    carregarSolicitacoes()
  } catch(err) { toast(err.message,'error') }
}

// ── Gerenciar Admins ──────────────────────────────────────────────────────────
async function loadAdmins() {
  try {
    const admins = await api('/admin/admins'); if (!admins) return
    document.getElementById('admins-lista').innerHTML = admins.map(a => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;background:#f7f9fc;border-radius:1rem;gap:0.75rem;">
        <div>
          <p style="font-size:0.875rem;font-weight:700;color:#2c3338;margin:0;">${a.nome}</p>
          <p style="font-size:0.75rem;color:#596065;margin:0.1rem 0 0;font-family:monospace;">${a.usuario}</p>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:${PERFIL_COLORS[a.perfil]||'#596065'};">${PERFIL_LABELS[a.perfil]||a.perfil}</span>
        </div>
        ${adminInfo.perfil==='master'&&a.id!==adminInfo.id?`
        <button onclick="abrirTrocarSenha(${a.id},'${a.nome.replace(/'/g,"\\'")}')" class="btn-outline" style="padding:0.5rem 0.875rem;font-size:0.75rem;white-space:nowrap;">
          <span class="material-symbols-outlined" style="font-size:0.875rem;">key</span> Trocar senha
        </button>`:''}
      </div>`).join('')
  } catch(err) { toast(err.message,'error') }
}

function abrirTrocarSenha(id, nome) {
  showModal(`
    <h3 style="font-size:1rem;font-weight:800;color:#2c3338;margin:0 0 0.25rem;">Trocar senha</h3>
    <p style="font-size:0.875rem;color:#596065;margin:0 0 1.25rem;">${nome}</p>
    <input id="nova-senha-admin" class="field-input" type="password" placeholder="Nova senha (mín. 6 caracteres)" style="margin-bottom:0.75rem;" />
    <div style="display:flex;gap:0.75rem;">
      <button onclick="closeModal()" class="btn-outline" style="flex:1;padding:0.75rem;font-size:0.875rem;">Cancelar</button>
      <button onclick="confirmarTrocarSenha(${id})" class="btn-primary" style="flex:1;padding:0.75rem;font-size:0.875rem;">Confirmar</button>
    </div>`)
}

async function confirmarTrocarSenha(id) {
  const nova = document.getElementById('nova-senha-admin').value
  if (!nova || nova.length < 6) { toast('Senha deve ter pelo menos 6 caracteres','error'); return }
  try {
    await api('/admin/admins/'+id+'/senha', { method:'PUT', body:JSON.stringify({ nova_senha: nova }) })
    toast('Senha alterada com sucesso'); closeModal()
  } catch(err) { toast(err.message,'error') }
}

async function alterarMinhaSenha() {
  const atual = document.getElementById('minha-senha-atual').value
  const nova  = document.getElementById('minha-senha-nova').value
  if (!atual || !nova) { toast('Preencha a senha atual e a nova','error'); return }
  try {
    await api('/admin/minha-senha', { method:'PUT', body:JSON.stringify({ senha_atual: atual, nova_senha: nova }) })
    toast('Senha alterada! Faça login novamente.')
    document.getElementById('minha-senha-atual').value = ''
    document.getElementById('minha-senha-nova').value = ''
    setTimeout(logout, 2000)
  } catch(err) { toast(err.message,'error') }
}

// ── Init ──────────────────────────────────────────────────────────────────────
if (TOKEN) { showApp() }

