import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, query, where,
  onSnapshot, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// ── Estado global ────────────────────────────────────
let todasTransacoes = [];
let filtroAtivo     = 'todos';
let categoriaAtiva  = '';
let graficoInstance = null;
let editandoId      = null;
let termoBusca      = '';

// ── Formatação de moeda (pt-BR) ───────────────────────
const moeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Toast ────────────────────────────────────────────
function showToast(mensagem, tipo = 'sucesso') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visivel'));
  setTimeout(() => {
    toast.classList.remove('visivel');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

// ── Guarda de rota ───────────────────────────────────
onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = 'index.html';
  } else {
    carregarTransacoes(usuario.uid);
  }
});

// ── Botão sair ───────────────────────────────────────
document.getElementById('botao-sair').addEventListener('click', () => {
  signOut(auth).then(() => { window.location.href = 'index.html'; });
});

// ── Data de hoje por padrão ───────────────────────────
document.getElementById('data-transacao').value = new Date().toISOString().split('T')[0];

// ── Toggle Renda / Despesa ────────────────────────────
const inputTipo       = document.getElementById('tipo-transacao');
const areaPagamento   = document.getElementById('area-pagamento');
const botaoAdicionar  = document.getElementById('botao-adicionar');
const selectPagamento = document.getElementById('tipo-pagamento');

document.querySelectorAll('#formulario-transacao .btn-tipo').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#formulario-transacao .btn-tipo').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    inputTipo.value = btn.dataset.tipo;
    if (btn.dataset.tipo === 'renda') {
      areaPagamento.style.display = 'none';
      selectPagamento.removeAttribute('required');
      botaoAdicionar.textContent  = '+ Adicionar renda';
    } else {
      areaPagamento.style.display = 'block';
      selectPagamento.setAttribute('required', '');
      botaoAdicionar.textContent  = '+ Adicionar despesa';
    }
  });
});

selectPagamento.addEventListener('change', (e) => {
  const areaParcelas = document.getElementById('area-parcelas');
  if (e.target.value === 'credito') {
    areaParcelas.style.display = 'block';
  } else {
    areaParcelas.style.display = 'none';
    document.getElementById('parcelas').value = 1;
  }
});

// ── Submissão do formulário ──────────────────────────
document.getElementById('formulario-transacao').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!auth.currentUser) {
    showToast('Sessão inválida. Faça login novamente.', 'erro');
    return;
  }

  const valor = parseFloat(document.getElementById('valor').value);
  if (!valor || valor <= 0) {
    showToast('O valor deve ser maior que zero.', 'erro');
    return;
  }

  const botao = document.getElementById('botao-adicionar');
  const labelOriginal = botao.textContent;
  botao.textContent = 'Salvando...';
  botao.disabled = true;

  const tipo       = inputTipo.value;
  const descricao  = document.getElementById('descricao').value.trim();
  const dataStr    = document.getElementById('data-transacao').value;
  const tipoPag    = tipo === 'despesa' ? selectPagamento.value : null;
  const parcelas   = parseInt(document.getElementById('parcelas').value) || 1;
  const observacao = document.getElementById('observacao').value.trim();
  const categoria  = document.getElementById('categoria').value;

  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);

  try {
    await addDoc(collection(db, 'transacoes'), {
      usuarioId:       auth.currentUser.uid,
      tipo,
      descricao,
      valor,
      data:            dataObj,
      dataHora:        serverTimestamp(),
      metodoPagamento: tipoPag,
      numeroParcelas:  tipoPag === 'credito' ? parcelas : 1,
      observacao,
      categoria,
    });

    evento.target.reset();
    document.getElementById('area-parcelas').style.display = 'none';
    document.getElementById('data-transacao').value = new Date().toISOString().split('T')[0];
    // Restaura o toggle para despesa
    document.querySelectorAll('#formulario-transacao .btn-tipo').forEach(b => b.classList.remove('ativo'));
    document.querySelector('#formulario-transacao .btn-tipo[data-tipo="despesa"]').classList.add('ativo');
    inputTipo.value = 'despesa';
    areaPagamento.style.display = 'block';
    selectPagamento.setAttribute('required', '');
    botaoAdicionar.textContent = '+ Adicionar despesa';

    showToast('Transação adicionada com sucesso!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao gravar dados:', erro);
    showToast('Falha ao salvar. Tente novamente.', 'erro');
  } finally {
    botao.textContent = labelOriginal;
    botao.disabled    = false;
  }
});

// ── Modal de confirmação de exclusão ─────────────────
const modalConfirmar = document.getElementById('modal-confirmar-exclusao');
let excluirIdPendente = null;

function abrirConfirmarExclusao(id, descricao) {
  excluirIdPendente = id;
  document.getElementById('modal-confirmar-desc').textContent =
    `"${descricao}" será removida permanentemente.`;
  modalConfirmar.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharConfirmarExclusao() {
  modalConfirmar.style.display = 'none';
  document.body.style.overflow = '';
  excluirIdPendente = null;
}

document.getElementById('confirmar-cancelar').addEventListener('click', fecharConfirmarExclusao);
modalConfirmar.addEventListener('click', (e) => { if (e.target === modalConfirmar) fecharConfirmarExclusao(); });

document.getElementById('confirmar-excluir').addEventListener('click', async () => {
  if (!excluirIdPendente) return;
  const id = excluirIdPendente;
  fecharConfirmarExclusao();
  try {
    await deleteDoc(doc(db, 'transacoes', id));
    showToast('Transação removida.', 'info');
  } catch (erro) {
    console.error('Erro ao excluir:', erro);
    showToast('Não foi possível remover a transação.', 'erro');
  }
});

// ── Busca por descrição ───────────────────────────────
document.getElementById('campo-busca').addEventListener('input', (e) => {
  termoBusca = e.target.value.trim().toLowerCase();
  renderizarLista();
});
document.querySelectorAll('.botao-filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.botao-filtro').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = btn.dataset.filtro;
    renderizarLista();
  });
});

// ── Carregar dados em tempo real ─────────────────────
function carregarTransacoes(idUsuario) {
  const q = query(collection(db, 'transacoes'), where('usuarioId', '==', idUsuario));
  onSnapshot(q, (snapshot) => {
    todasTransacoes = [];
    snapshot.forEach(d => todasTransacoes.push({ id: d.id, ...d.data() }));
    renderizarLista();
  });
}

// ── Helper: Timestamp → Date ──────────────────────────
function toDate(d) {
  if (!d) return new Date(0);
  if (d.toDate) return d.toDate();
  if (d instanceof Date) return d;
  return new Date(d);
}

// ── Mapa de categorias ────────────────────────────────
const categoriaInfo = {
  alimentacao:  { emoji: '🍔', label: 'Alimentação' },
  transporte:   { emoji: '🚗', label: 'Transporte' },
  moradia:      { emoji: '🏠', label: 'Moradia' },
  saude:        { emoji: '❤️', label: 'Saúde' },
  lazer:        { emoji: '🎉', label: 'Lazer' },
  educacao:     { emoji: '📚', label: 'Educação' },
  vestuario:    { emoji: '👕', label: 'Vestuário' },
  salario:      { emoji: '💼', label: 'Salário' },
  investimento: { emoji: '📈', label: 'Investimento' },
  outro:        { emoji: '📦', label: 'Outro' },
};

// ── Renderizar barra de categorias ────────────────────
function renderizarCategorias(lista) {
  const barra = document.getElementById('barra-categorias');
  const categoriasPresentes = [...new Set(lista.map(t => t.categoria).filter(Boolean))];

  if (categoriasPresentes.length === 0) {
    barra.innerHTML = '';
    return;
  }

  barra.innerHTML = '';
  const btnTodos = document.createElement('button');
  btnTodos.className = 'botao-categoria' + (categoriaAtiva === '' ? ' ativo' : '');
  btnTodos.textContent = 'Todas';
  btnTodos.addEventListener('click', () => { categoriaAtiva = ''; renderizarLista(); });
  barra.appendChild(btnTodos);

  categoriasPresentes.forEach(cat => {
    const info = categoriaInfo[cat] || { emoji: '📦', label: cat };
    const btn  = document.createElement('button');
    btn.className   = 'botao-categoria' + (categoriaAtiva === cat ? ' ativo' : '');
    btn.textContent = `${info.emoji} ${info.label}`;
    btn.addEventListener('click', () => { categoriaAtiva = cat; renderizarLista(); });
    barra.appendChild(btn);
  });
}

// ── Gráfico de categorias ─────────────────────────────
function atualizarGrafico(lista) {
  const despesas = lista.filter(t => (t.tipo || 'despesa') === 'despesa');
  const secao = document.getElementById('secao-grafico');

  if (despesas.length === 0) {
    secao.style.display = 'none';
    return;
  }
  secao.style.display = 'block';

  const totais = {};
  despesas.forEach(t => {
    const cat = t.categoria || 'outro';
    totais[cat] = (totais[cat] || 0) + t.valor;
  });

  const labels = Object.keys(totais).map(k => {
    const info = categoriaInfo[k] || { emoji: '📦', label: k };
    return `${info.emoji} ${info.label}`;
  });
  const valores = Object.values(totais);

  const coresBase = [
    '#4ade80','#f87171','#fbbf24','#60a5fa','#a78bfa',
    '#fb923c','#34d399','#f472b6','#38bdf8','#a3e635'
  ];

  const ctx = document.getElementById('grafico-categorias').getContext('2d');
  if (graficoInstance) graficoInstance.destroy();

  graficoInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: coresBase.slice(0, valores.length).map(c => c + 'cc'),
        borderColor:     coresBase.slice(0, valores.length),
        borderWidth: 1.5,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:    '#8b92a0',
            font:     { size: 12 },
            padding:  14,
            boxWidth: 12,
            boxHeight: 12,
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${moeda(ctx.raw)}`
          }
        }
      }
    }
  });
}

// ── Renderizar lista ─────────────────────────────────
function renderizarLista() {
  const areaLista  = document.getElementById('lista-transacoes');
  const elTotal    = document.getElementById('valor-total');
  const elRendas   = document.getElementById('valor-rendas');
  const elDespesas = document.getElementById('valor-despesas');
  const contador   = document.getElementById('contador-filtro');

  const agora    = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();
  const proxAno  = mesAtual === 11 ? anoAtual + 1 : anoAtual;
  const proxMes  = mesAtual === 11 ? 0 : mesAtual + 1;

  if (todasTransacoes.length === 0) {
    areaLista.innerHTML = '<p class="estado-vazio">Nenhuma transação registrada ainda.</p>';
    elTotal.innerText = moeda(0);
    elRendas.innerText = moeda(0);
    elDespesas.innerText = moeda(0);
    elTotal.className = 'resumo-valor';
    contador.innerText = '';
    document.getElementById('barra-categorias').innerHTML = '';
    document.getElementById('secao-grafico').style.display = 'none';
    return;
  }

  let lista = [...todasTransacoes];

  // Filtro período
  if (filtroAtivo === 'este-mes') {
    lista = lista.filter(t => {
      const dt = toDate(t.data);
      return dt.getFullYear() === anoAtual && dt.getMonth() === mesAtual;
    });
  } else if (filtroAtivo === 'proximo-mes') {
    lista = lista.filter(t => {
      const dt = toDate(t.data);
      return dt.getFullYear() === proxAno && dt.getMonth() === proxMes;
    });
  }

  // Renderizar filtros de categoria (baseado na lista após filtro de período)
  renderizarCategorias(lista);

  // Filtro categoria
  if (categoriaAtiva) {
    lista = lista.filter(t => t.categoria === categoriaAtiva);
  }

  // Filtro busca
  if (termoBusca) {
    lista = lista.filter(t =>
      (t.descricao || '').toLowerCase().includes(termoBusca)
    );
  }

  // Ordenação
  if (filtroAtivo === 'mais-antigos') {
    lista.sort((a, b) => toDate(a.data) - toDate(b.data));
  } else {
    lista.sort((a, b) => toDate(b.data) - toDate(a.data));
  }

  // Gráfico sempre baseado no período (sem filtro de categoria)
  let listaGrafico = [...todasTransacoes];
  if (filtroAtivo === 'este-mes') {
    listaGrafico = listaGrafico.filter(t => {
      const dt = toDate(t.data);
      return dt.getFullYear() === anoAtual && dt.getMonth() === mesAtual;
    });
  } else if (filtroAtivo === 'proximo-mes') {
    listaGrafico = listaGrafico.filter(t => {
      const dt = toDate(t.data);
      return dt.getFullYear() === proxAno && dt.getMonth() === proxMes;
    });
  }
  atualizarGrafico(listaGrafico);

  areaLista.innerHTML = '';

  if (lista.length === 0) {
    areaLista.innerHTML = '<p class="estado-vazio">Nenhuma transação neste período.</p>';
    elTotal.innerText = moeda(0);
    elRendas.innerText = moeda(0);
    elDespesas.innerText = moeda(0);
    elTotal.className = 'resumo-valor';
    contador.innerText = '';
    return;
  }

  let totalRendas = 0, totalDespesas = 0;

  lista.forEach((dados) => {
    const tipo = dados.tipo || 'despesa';
    if (tipo === 'renda') totalRendas   += dados.valor;
    else                  totalDespesas += dados.valor;

    const caixaItem = document.createElement('div');
    caixaItem.className = `item-transacao item-${tipo}`;

    const badgeTipo = tipo === 'renda' ? `<span class="pill-renda">renda</span>` : '';
    let badgePag = '';
    if (tipo === 'despesa' && dados.metodoPagamento) {
      if (dados.metodoPagamento === 'credito') {
        const xLabel = dados.numeroParcelas > 1 ? `${dados.numeroParcelas}x crédito` : 'crédito';
        badgePag = `<span class="pill-credito">${xLabel}</span>`;
      } else if (dados.metodoPagamento === 'debito') {
        badgePag = `<span class="pill-debito">débito</span>`;
      }
    }

    let badgeCat = '';
    if (dados.categoria && categoriaInfo[dados.categoria]) {
      const info = categoriaInfo[dados.categoria];
      badgeCat = `<span class="pill-categoria">${info.emoji} ${info.label}</span>`;
    }

    const dtObj = toDate(dados.data);
    const dataFormatada = dtObj.getTime() > 0
      ? dtObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    const eProxMes  = dtObj.getFullYear() === proxAno && dtObj.getMonth() === proxMes;
    const badgeProx = eProxMes ? `<span class="pill-proximo">próx. mês</span> ` : '';
    const obsHtml   = dados.observacao ? `<span class="observacao">${dados.observacao}</span>` : '';

    const sinal      = tipo === 'renda' ? '+' : '-';
    const classeValor = tipo === 'renda' ? 'valor valor-positivo' : 'valor valor-negativo';

    caixaItem.innerHTML = `
      <div class="detalhes">
        <span class="descricao">${dados.descricao}</span>
        <span class="metodo">${badgeProx}${badgeTipo}${badgePag}${badgeCat}</span>
        <span class="data-transacao">${dataFormatada}</span>
        ${obsHtml}
      </div>
      <div class="acoes">
        <span class="${classeValor}">${sinal} ${moeda(dados.valor)}</span>
        <button class="botao-editar" title="Editar" aria-label="Editar transação">✎</button>
        <button class="botao-excluir" title="Excluir" aria-label="Excluir transação">×</button>
      </div>
    `;

    // Editar
    caixaItem.querySelector('.botao-editar').addEventListener('click', () => {
      abrirModalEdicao(dados);
    });

    // Excluir
    caixaItem.querySelector('.botao-excluir').addEventListener('click', () => {
      abrirConfirmarExclusao(dados.id, dados.descricao);
    });

    areaLista.appendChild(caixaItem);
  });

  const saldo = totalRendas - totalDespesas;
  elRendas.innerText   = moeda(totalRendas);
  elDespesas.innerText = moeda(totalDespesas);
  elTotal.innerText    = moeda(Math.abs(saldo));
  elTotal.className    = `resumo-valor ${saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}`;

  const labelFiltro = {
    'todos':        'todas as transações',
    'este-mes':     'este mês',
    'proximo-mes':  'próximo mês',
    'mais-recentes':'todas as transações',
    'mais-antigos': 'todas as transações',
  };
  const labelCat = categoriaAtiva && categoriaInfo[categoriaAtiva]
    ? ` · ${categoriaInfo[categoriaAtiva].emoji} ${categoriaInfo[categoriaAtiva].label}`
    : '';
  contador.innerText = `${lista.length} transaç${lista.length !== 1 ? 'ões' : 'ão'} — ${labelFiltro[filtroAtivo]}${labelCat}`;
}

// ── Modal de Edição ──────────────────────────────────
const modalOverlay  = document.getElementById('modal-overlay');
const formEdicao    = document.getElementById('formulario-edicao');
const editSelectPag = document.getElementById('edit-pagamento');

function abrirModalEdicao(dados) {
  editandoId = dados.id;
  const tipo = dados.tipo || 'despesa';

  document.getElementById('edit-tipo').value       = tipo;
  document.getElementById('edit-descricao').value  = dados.descricao || '';
  document.getElementById('edit-valor').value      = dados.valor     || '';
  document.getElementById('edit-observacao').value = dados.observacao || '';
  document.getElementById('edit-categoria').value  = dados.categoria  || '';

  // Data
  const dt = toDate(dados.data);
  if (dt.getTime() > 0) {
    const iso = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    document.getElementById('edit-data').value = iso;
  }

  // Toggle tipo no modal
  document.querySelectorAll('#formulario-edicao .btn-tipo').forEach(b => b.classList.remove('ativo'));
  document.querySelector(`#formulario-edicao .btn-tipo[data-tipo="${tipo}"]`).classList.add('ativo');
  const editAreaPag = document.getElementById('edit-area-pagamento');
  if (tipo === 'renda') {
    editAreaPag.style.display = 'none';
    editSelectPag.removeAttribute('required');
  } else {
    editAreaPag.style.display = 'block';
    editSelectPag.setAttribute('required', '');
  }

  editSelectPag.value = dados.metodoPagamento || '';
  const editAreaParcelas = document.getElementById('edit-area-parcelas');
  if (dados.metodoPagamento === 'credito') {
    editAreaParcelas.style.display = 'block';
    document.getElementById('edit-parcelas').value = dados.numeroParcelas || 1;
  } else {
    editAreaParcelas.style.display = 'none';
  }

  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  modalOverlay.style.display = 'none';
  document.body.style.overflow = '';
  editandoId = null;
}

document.getElementById('modal-fechar').addEventListener('click', fecharModal);
document.getElementById('modal-cancelar').addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) fecharModal(); });

// Toggle no modal
document.querySelectorAll('#formulario-edicao .btn-tipo').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#formulario-edicao .btn-tipo').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    document.getElementById('edit-tipo').value = btn.dataset.tipo;
    const editAreaPag = document.getElementById('edit-area-pagamento');
    if (btn.dataset.tipo === 'renda') {
      editAreaPag.style.display = 'none';
      editSelectPag.removeAttribute('required');
    } else {
      editAreaPag.style.display = 'block';
      editSelectPag.setAttribute('required', '');
    }
  });
});

editSelectPag.addEventListener('change', (e) => {
  const ap = document.getElementById('edit-area-parcelas');
  ap.style.display = e.target.value === 'credito' ? 'block' : 'none';
  if (e.target.value !== 'credito') document.getElementById('edit-parcelas').value = 1;
});

formEdicao.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editandoId) return;

  const valor = parseFloat(document.getElementById('edit-valor').value);
  if (!valor || valor <= 0) {
    showToast('O valor deve ser maior que zero.', 'erro');
    return;
  }

  const botao = document.getElementById('modal-salvar');
  botao.disabled    = true;
  botao.textContent = 'Salvando...';

  const tipo       = document.getElementById('edit-tipo').value;
  const descricao  = document.getElementById('edit-descricao').value.trim();
  const dataStr    = document.getElementById('edit-data').value;
  const tipoPag    = tipo === 'despesa' ? editSelectPag.value : null;
  const parcelas   = parseInt(document.getElementById('edit-parcelas').value) || 1;
  const observacao = document.getElementById('edit-observacao').value.trim();
  const categoria  = document.getElementById('edit-categoria').value;

  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);

  try {
    await updateDoc(doc(db, 'transacoes', editandoId), {
      tipo, descricao, valor, data: dataObj,
      metodoPagamento: tipoPag,
      numeroParcelas:  tipoPag === 'credito' ? parcelas : 1,
      observacao, categoria,
    });
    fecharModal();
    showToast('Transação atualizada!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao atualizar:', erro);
    showToast('Erro ao salvar alterações.', 'erro');
  } finally {
    botao.disabled    = false;
    botao.textContent = 'Salvar alterações';
  }
});