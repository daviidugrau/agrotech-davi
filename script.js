/**
 * AgroVerde — Pecuária Sustentável Inteligente
 * script.js — Lógica completa de cálculos, UI e persistência
 */

// =====================================================
// 1. UTILITÁRIOS
// =====================================================

/**
 * Lê valor numérico de um input por ID
 * @param {string} id - ID do elemento
 * @param {number} def - Valor padrão se vazio
 * @returns {number}
 */
function v(id, def = 0) {
  const el = document.getElementById(id);
  if (!el) return def;
  const n = parseFloat(el.value);
  return isNaN(n) ? def : n;
}

/**
 * Lê valor de string de um select/input
 */
function s(id, def = '') {
  const el = document.getElementById(id);
  return el ? el.value || def : def;
}

/** Formata moeda brasileira */
function brl(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formata número com unidade */
function fmt(n, unit = '', dec = 1) {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (unit ? ' ' + unit : '');
}

/** Clamp de valor */
function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

/** Define texto de elemento por ID */
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

/** Define largura de barra de progresso (0–100) */
function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = clamp(pct, 0, 100) + '%';
}

/** Exibe toast */
function showToast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

// =====================================================
// 2. TEMA CLARO / ESCURO
// =====================================================
const btnTheme = document.getElementById('btnTheme');
const html = document.documentElement;

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('agroverde_theme', theme);
}

btnTheme.addEventListener('click', () => {
  const cur = html.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

// Carrega tema salvo
const savedTheme = localStorage.getItem('agroverde_theme') || 'light';
applyTheme(savedTheme);

// =====================================================
// 3. MENU MOBILE
// =====================================================
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navMobile').classList.toggle('open');
});

// Fecha menu ao clicar em link
document.querySelectorAll('#navMobile .nav-link').forEach(a => {
  a.addEventListener('click', () => document.getElementById('navMobile').classList.remove('open'));
});

// =====================================================
// 4. NAVEGAÇÃO POR ABAS
// =====================================================
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  const tab = btn.dataset.tab;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  btn.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
});

// =====================================================
// 5. CÁLCULOS PRINCIPAIS
// =====================================================

/**
 * Coleta todos os dados dos formulários
 */
function coletarDados() {
  return {
    // Rebanho
    cabecas: v('qtdCabecas', 100),
    pesoMedio: v('pesoMedio', 380),
    idadeMedia: v('idadeMedia', 18),
    ganhoPeso: v('ganhoPeso', 0.8),
    mortalidade: v('mortalidade', 2),
    lotes: v('qtdLotes', 4),

    // Alimentação
    consumoDiario: v('consumoDiario', 9.5),
    tipoRacao: s('tipoRacao', 'misto'),
    precoRacao: v('precoRacao', 1.8),
    salMineral: v('salMineral', 80),
    silagem: v('silagem', 10),
    pastagem: v('pastagem', 12),
    desperdicio: v('desperdicio', 15),
    eficienciaAlvo: v('eficienciaAlvo', 0.12),

    // Água
    consumoAgua: v('consumoAgua', 50),
    fonteAgua: s('fonteAgua', 'poco'),
    custoAgua: v('custoAgua', 3.5),
    perdaAgua: v('perdaAgua', 10),

    // Pastagem
    areaTotal: v('areaTotal', 500),
    areaPasto: v('areaPasto', 400),
    lotacaoAtual: v('lotacaoAtual', 1.2),
    lotacaoSuportada: v('lotacaoSuportada', 1.5),
    rotacaoPiquetes: v('rotacaoPiquetes', 8),
    degradacaoPasto: v('degradacaoPasto', 20),

    // Financeiro
    valorCabeca: v('valorCabeca', 3500),
    custoOperacional: v('custoOperacional', 5000),
    custoVeterinario: v('custoVeterinario', 800),
    custoTransporte: v('custoTransporte', 600),
    custoSuplementacao: v('custoSuplementacao', 1200),
    precoArroba: v('precoArroba', 280),
    receitaMensal: v('receitaMensal', 20000),

    // Ambiental
    praticaManejo: s('praticaManejo', 'convencional'),
    energiaRenovavel: s('energiaRenovavel', 'nao'),
    reservaLegal: v('reservaLegal', 20),
    tratamentoResiduos: s('tratamentoResiduos', 'nenhum'),
  };
}

/**
 * Executa todos os cálculos e retorna objeto de resultados
 */
function calcular(d) {
  const r = {};

  // ─── ALIMENTAÇÃO ──────────────────────────────────
  // Consumo total diário de MS (kg)
  r.consumoTotalDia = d.consumoDiario * d.cabecas;

  // Eficiência alimentar real = ganho / consumo MS
  r.eficienciaReal = d.consumoDiario > 0 ? d.ganhoPeso / d.consumoDiario : 0;

  // Desperdício diário (kg)
  r.desperdicioKgDia = r.consumoTotalDia * (d.desperdicio / 100);

  // Custo da ração por dia (sem desperdício e com desperdício)
  r.custoRacaoDia = d.consumoDiario * d.precoRacao * d.cabecas;
  r.custoRacaoComDesperdicio = r.custoRacaoDia / (1 - d.desperdicio / 100 * 0.5); // ajuste parcial

  // ─── ÁGUA ──────────────────────────────────────────
  // Consumo real com perda
  r.aguaConsumoRealDia = d.consumoAgua * d.cabecas; // litros/dia
  r.aguaPerdaDia = r.aguaConsumoRealDia * (d.perdaAgua / 100);
  r.aguaTotalDia = r.aguaConsumoRealDia + r.aguaPerdaDia;
  r.aguaMes = r.aguaTotalDia * 30;
  r.aguaM3Mes = r.aguaMes / 1000;
  r.custoAguaMes = r.aguaM3Mes * d.custoAgua;

  // ─── PASTAGEM ──────────────────────────────────────
  // Capacidade de suporte real (UA = unidade animal, 450 kg)
  const uaPorCabeca = d.pesoMedio / 450;
  r.capSuporteHA = d.areaPasto * d.lotacaoSuportada;
  r.totalUA = d.cabecas * uaPorCabeca;
  r.lotacaoCalc = d.areaPasto > 0 ? r.totalUA / d.areaPasto : 0;
  r.pressaoPastejo = d.lotacaoSuportada > 0 ? (r.lotacaoCalc / d.lotacaoSuportada) * 100 : 0;

  // Status do pasto
  if (r.pressaoPastejo <= 70) r.statusPasto = '✅ Subutilizado';
  else if (r.pressaoPastejo <= 90) r.statusPasto = '🟡 Adequado';
  else if (r.pressaoPastejo <= 110) r.statusPasto = '⚠️ Limite';
  else r.statusPasto = '🔴 Sobrepastejo';

  // ─── CUSTOS ────────────────────────────────────────
  // Custo diário ração
  const custoRacaoDia = r.custoRacaoDia;

  // Sal mineral (kg → g/1000, preço por kg = ~3 R$)
  const custoSalDia = (d.salMineral / 1000) * d.cabecas * 3.5;

  // Silagem: custo ~0,35 R$/kg
  const custoSilagemDia = d.silagem * d.cabecas * 0.35;

  r.custoDiarioTotal = custoRacaoDia + custoSalDia + custoSilagemDia;
  r.custoMensal = r.custoDiarioTotal * 30
    + d.custoOperacional
    + d.custoVeterinario
    + d.custoTransporte
    + d.custoSuplementacao
    + r.custoAguaMes;
  r.custoAnual = r.custoMensal * 12;
  r.custoCabecaDia = d.cabecas > 0 ? r.custoDiarioTotal / d.cabecas : 0;

  // Composição mensal (para gráfico)
  r.composicaoCustos = {
    'Ração': custoRacaoDia * 30,
    'Silagem': custoSilagemDia * 30,
    'Sal Mineral': custoSalDia * 30,
    'Operacional': d.custoOperacional,
    'Veterinário': d.custoVeterinario,
    'Transporte': d.custoTransporte,
    'Suplementação': d.custoSuplementacao,
    'Água': r.custoAguaMes,
  };

  // ─── LUCRATIVIDADE ─────────────────────────────────
  // Peso ganho por mês por animal
  const ganhoMensalKg = d.ganhoPeso * 30;
  // Arrobas ganhas por animal/mês (1 @ = 15 kg)
  const arrobasMes = ganhoMensalKg / 15;
  // Receita gerada por ganho de peso
  const receitaGanhoPeso = arrobasMes * d.cabecas * d.precoArroba;
  r.receitaMensalTotal = d.receitaMensal > 0 ? d.receitaMensal : receitaGanhoPeso;

  r.lucroMensal = r.receitaMensalTotal - r.custoMensal;
  r.lucroAnual = r.lucroMensal * 12;

  // Lucro por arroba produzida
  const arrobasTotalMes = arrobasMes * d.cabecas;
  r.lucroPorArroba = arrobasTotalMes > 0 ? r.lucroMensal / arrobasTotalMes : 0;
  r.margem = r.receitaMensalTotal > 0 ? (r.lucroMensal / r.receitaMensalTotal) * 100 : 0;

  // ─── AMBIENTAL ─────────────────────────────────────
  /**
   * Emissão de metano entérico:
   * Fator padrão IPCC: 56 kg CH₄/animal/ano para bovinos de corte melhorados
   * Ajustes por prática de manejo e dieta
   */
  const fatorManejo = {
    'convencional': 1.0,
    'semi-intensivo': 0.92,
    'intensivo': 0.85,
    'regenerativo': 0.75,
    'silvipastoril': 0.72,
  };
  const fatorDieta = d.tipoRacao === 'concentrado' ? 0.85 : d.tipoRacao === 'pasto' ? 1.1 : 0.95;
  const fatorManejoCH4 = fatorManejo[d.praticaManejo] || 1.0;
  r.ch4PorAnimalAno = 56 * fatorManejoCH4 * fatorDieta; // kg CH₄/animal/ano
  r.metanoTotal = r.ch4PorAnimalAno * d.cabecas; // kg CH₄/ano total

  // Equivalente CO₂ (GWP do CH₄ = 28 — AR6 IPCC)
  r.co2Equivalente = r.metanoTotal * 28;

  // Redução potencial com boas práticas (%)
  const fatorReducao = {
    'convencional': 20,
    'semi-intensivo': 12,
    'intensivo': 8,
    'regenerativo': 3,
    'silvipastoril': 2,
  };
  r.reducaoPotencialPct = fatorReducao[d.praticaManejo] || 15;
  r.reducaoEmissao = r.metanoTotal * (r.reducaoPotencialPct / 100);

  // Pegada hídrica: consumo + pegada de produção de ração
  // Fator: 1 kg de ração concentrada = ~1500L de água virtual
  const aguaRacao = d.consumoDiario * 0.3 * 1500; // 30% da MS é concentrado
  r.pegadaHidricaDia = (r.aguaTotalDia + aguaRacao * d.cabecas) / 1000; // m³/dia
  r.pegadaHidricaAnual = r.pegadaHidricaDia * 365; // m³/ano

  // Uso eficiente do solo (produção relativa à capacidade)
  r.usoSoloPct = d.areaPasto > 0
    ? clamp((r.totalUA / (d.areaPasto * d.lotacaoSuportada)) * 100, 0, 150)
    : 0;

  // ─── SCORE SUSTENTABILIDADE ─────────────────────────
  /**
   * Score de 0 a 100 baseado em múltiplos indicadores:
   * - Eficiência alimentar (20 pts)
   * - Desperdício alimentar (15 pts)
   * - Emissão de metano (20 pts)
   * - Uso de água (15 pts)
   * - Manejo do pasto (15 pts)
   * - Práticas ambientais (15 pts)
   */
  let score = 0;

  // Eficiência alimentar (ideal: 0.12 a 0.18 kg ganho/kg MS)
  const efPct = clamp((r.eficienciaReal / 0.18) * 100, 0, 100);
  score += efPct * 0.20;

  // Desperdício (ideal < 5%)
  const despScore = clamp(100 - d.desperdicio * 2, 0, 100);
  score += despScore * 0.15;

  // Metano (ideal < 56 kg/animal/ano)
  const ch4Score = clamp(100 - ((r.ch4PorAnimalAno - 30) / 70) * 100, 0, 100);
  score += ch4Score * 0.20;

  // Água (ideal < 60 L/animal/dia, perda < 5%)
  const aguaScore = clamp(100 - d.perdaAgua * 2.5, 0, 100);
  score += aguaScore * 0.15;

  // Pasto (pressão ideal 60–90%)
  const pastoScore = r.pressaoPastejo <= 90
    ? clamp(r.pressaoPastejo, 0, 100)
    : clamp(200 - r.pressaoPastejo, 0, 100);
  score += pastoScore * 0.15;

  // Práticas ambientais
  let ambScore = 50;
  if (d.praticaManejo === 'regenerativo' || d.praticaManejo === 'silvipastoril') ambScore += 20;
  if (d.energiaRenovavel === 'total') ambScore += 15;
  else if (d.energiaRenovavel === 'parcial') ambScore += 8;
  if (d.tratamentoResiduos === 'completo') ambScore += 15;
  else if (d.tratamentoResiduos !== 'nenhum') ambScore += 8;
  if (d.reservaLegal >= 20) ambScore += 10;
  score += clamp(ambScore, 0, 100) * 0.15;

  r.score = Math.round(clamp(score, 0, 100));

  // Nota
  if (r.score >= 80) { r.nota = 'A'; r.notaDesc = 'Excelente Sustentabilidade'; }
  else if (r.score >= 65) { r.nota = 'B'; r.notaDesc = 'Boa Sustentabilidade'; }
  else if (r.score >= 45) { r.nota = 'C'; r.notaDesc = 'Sustentabilidade Média'; }
  else { r.nota = 'D'; r.notaDesc = 'Atenção Necessária'; }

  return r;
}

// =====================================================
// 6. ALERTAS INTELIGENTES
// =====================================================
function gerarAlertas(d, r) {
  const alertas = [];

  // Desperdício alimentar
  if (d.desperdicio > 20) {
    alertas.push({ tipo: 'danger', icon: '🚨', msg: `Desperdício alimentar elevado (${d.desperdicio}%). Revise o manejo dos cochos e o tamanho das porções. Reduza gradualmente para menos de 5%.` });
  } else if (d.desperdicio > 10) {
    alertas.push({ tipo: 'warn', icon: '⚠️', msg: `Desperdício de ${d.desperdicio}% está acima do ideal. Considere ajustar as rações e treinar a equipe.` });
  } else {
    alertas.push({ tipo: 'ok', icon: '✅', msg: `Desperdício alimentar de ${d.desperdicio}% está em bom nível. Mantenha o controle!` });
  }

  // Lotação do pasto
  if (r.pressaoPastejo > 110) {
    alertas.push({ tipo: 'danger', icon: '🌿', msg: `Lotação do pasto ${fmt(r.pressaoPastejo, '%', 0)} acima da capacidade suportada. Risco alto de degradação do solo e compactação.` });
  } else if (r.pressaoPastejo > 90) {
    alertas.push({ tipo: 'warn', icon: '🌿', msg: `Pressão de pastejo em ${fmt(r.pressaoPastejo, '%', 0)}. Monitore a condição do pasto e evite sobrepastejo.` });
  }

  // Consumo hídrico
  if (d.consumoAgua > 80) {
    alertas.push({ tipo: 'warn', icon: '💧', msg: `Consumo de ${d.consumoAgua}L/animal/dia está acima da média. Verifique se há vazamentos ou desperdício nos bebedouros.` });
  }
  if (d.perdaAgua > 15) {
    alertas.push({ tipo: 'danger', icon: '💧', msg: `Perda hídrica de ${d.perdaAgua}% é elevada. Instale bebedouros com boia e repare sistemas de abastecimento.` });
  }

  // Eficiência alimentar
  if (r.eficienciaReal > 0.15) {
    alertas.push({ tipo: 'ok', icon: '⚡', msg: `Eficiência alimentar excelente: ${fmt(r.eficienciaReal, 'kg ganho/kg MS', 3)}. Continue com a dieta atual!` });
  } else if (r.eficienciaReal < 0.06 && r.eficienciaReal > 0) {
    alertas.push({ tipo: 'danger', icon: '🌾', msg: `Eficiência alimentar baixa (${fmt(r.eficienciaReal, '', 3)}). Considere reformular a dieta com auxílio de nutricionista.` });
  }

  // Lucratividade
  if (r.lucroMensal < 0) {
    alertas.push({ tipo: 'danger', icon: '💰', msg: `Operação com prejuízo mensal estimado de ${brl(Math.abs(r.lucroMensal))}. Revise custos e estratégia comercial urgentemente.` });
  } else if (r.margem < 10) {
    alertas.push({ tipo: 'warn', icon: '💰', msg: `Margem de lucro baixa (${fmt(r.margem, '%', 1)}). Busque reduzir custos ou aumentar receita.` });
  }

  // Emissão de metano
  if (r.ch4PorAnimalAno > 90) {
    alertas.push({ tipo: 'danger', icon: '🌍', msg: `Emissão de metano acima de 90 kg/animal/ano. Melhore a qualidade da dieta e considere práticas regenerativas.` });
  } else if (d.praticaManejo === 'regenerativo' || d.praticaManejo === 'silvipastoril') {
    alertas.push({ tipo: 'ok', icon: '🌱', msg: `Excelente! O manejo ${d.praticaManejo} reduz emissões e aumenta o sequestro de carbono no solo.` });
  }

  // Reserva legal
  if (d.reservaLegal < 20) {
    alertas.push({ tipo: 'warn', icon: '🌳', msg: `Reserva legal de ${d.reservaLegal}% pode estar abaixo do exigido pelo Código Florestal (mín. 20% no Cerrado). Consulte um engenheiro ambiental.` });
  }

  // Degradação do pasto
  if (d.degradacaoPasto > 40) {
    alertas.push({ tipo: 'danger', icon: '🌾', msg: `Índice de degradação do pasto em ${d.degradacaoPasto}%. Planeje um programa de recuperação com reforma ou revitalização.` });
  }

  return alertas;
}

// =====================================================
// 7. RENDERIZAR RESULTADOS
// =====================================================
function renderizarResultados(d, r) {

  // ── Custos ──
  setText('r-custoDiario', brl(r.custoDiarioTotal));
  setText('r-custoMensal', brl(r.custoMensal));
  setText('r-custoAnual', brl(r.custoAnual));
  setText('r-custoCabDia', brl(r.custoCabecaDia));

  // ── Lucro ──
  setText('r-lucroMensal', brl(r.lucroMensal));
  setText('r-lucroAnual', brl(r.lucroAnual));
  setText('r-lucroPorArroba', brl(r.lucroPorArroba));
  setText('r-margem', fmt(r.margem, '%', 1));

  // Colore lucro
  ['r-lucroMensal', 'r-lucroAnual'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.color = r.lucroMensal >= 0 ? 'var(--green-light)' : '#c84a4a';
  });

  // ── Alimentação ──
  setText('r-consumoTotal', fmt(r.consumoTotalDia, 'kg MS/dia'));
  setText('r-eficiencia', fmt(r.eficienciaReal, 'kg/kg', 3));
  setText('r-desperdicioKg', fmt(r.desperdicioKgDia, 'kg/dia'));
  setText('r-custoRacaoDia', brl(r.custoRacaoDia));
  setBar('pb-eficiencia', clamp((r.eficienciaReal / 0.18) * 100, 0, 100));

  // ── Água ──
  setText('r-aguaDia', fmt(r.aguaTotalDia, 'L/dia'));
  setText('r-aguaMes', fmt(r.aguaMes / 1000, 'm³/mês'));
  setText('r-aguaPerdaDia', fmt(r.aguaPerdaDia, 'L/dia'));
  setText('r-custoAguaMes', brl(r.custoAguaMes));
  setBar('pb-agua', clamp(d.perdaAgua * 3, 0, 100));

  // ── Pastagem ──
  setText('r-capSuporteHA', fmt(r.capSuporteHA, 'UA'));
  setText('r-pressaoPastejo', fmt(r.pressaoPastejo, '%'));
  setText('r-lotacaoCalc', fmt(r.lotacaoCalc, 'UA/ha'));
  setText('r-statusPasto', r.statusPasto);
  setBar('pb-pastagem', clamp(d.degradacaoPasto, 0, 100));

  // ── Ambiental ──
  setText('r-metano', fmt(r.metanoTotal, 'kg CH₄/ano', 0));
  setText('r-co2', fmt(r.co2Equivalente / 1000, 't CO₂eq/ano'));
  setText('r-pegadaHidrica', fmt(r.pegadaHidricaAnual, 'm³/ano', 0));
  setText('r-reducaoEmissao', fmt(r.reducaoEmissao, 'kg CH₄/ano', 0) + ` (${r.reducaoPotencialPct}%)`);
  setText('r-usoSolo', fmt(r.usoSoloPct, '%'));
  setBar('pb-metano', clamp((r.ch4PorAnimalAno / 120) * 100, 0, 100));
  setBar('pb-pegada', clamp((r.pegadaHidricaAnual / 50000) * 100, 0, 100));
  setBar('pb-solo', clamp(r.usoSoloPct, 0, 100));

  // ── Score ──
  setText('scoreValue', r.score);
  setText('scoreGrade', r.nota);
  setText('scoreDesc', r.notaDesc);

  // Animação anel
  const circunferencia = 327; // 2 * π * 52
  const offset = circunferencia - (r.score / 100) * circunferencia;
  const circle = document.getElementById('scoreCircle');
  if (circle) circle.style.strokeDashoffset = offset;

  // Cor do anel por nota
  const coresNota = { A: '#6aaa7e', B: '#d4a847', C: '#e8a840', D: '#c84a4a' };
  if (circle) circle.style.stroke = coresNota[r.nota] || '#d4a847';

  // Badges
  const badgesEl = document.getElementById('scoreBadges');
  if (badgesEl) {
    const badges = [];
    if (d.praticaManejo === 'regenerativo') badges.push('🌱 Regenerativo');
    if (d.praticaManejo === 'silvipastoril') badges.push('🌳 Silvipastoril');
    if (d.energiaRenovavel === 'total') badges.push('☀️ Energia Limpa');
    if (d.tratamentoResiduos !== 'nenhum') badges.push('♻️ Trata Resíduos');
    if (d.reservaLegal >= 20) badges.push('🌿 Reserva Legal OK');
    if (r.eficienciaReal > 0.14) badges.push('⚡ Alta Eficiência');

    badgesEl.innerHTML = badges.map(b => `<span class="score-badge">${b}</span>`).join('');
  }

  // ── Alertas ──
  const alertas = gerarAlertas(d, r);
  const alertsEl = document.getElementById('alertsBox');
  if (alertsEl) {
    alertsEl.innerHTML = alertas.map(a =>
      `<div class="alert ${a.tipo}">
        <span class="alert-icon">${a.icon}</span>
        <span>${a.msg}</span>
      </div>`
    ).join('');
  }

  // ── Relatório ──
  const reportEl = document.getElementById('reportBody');
  if (reportEl) {
    const linhas = gerarRelatorio(d, r);
    reportEl.innerHTML = linhas;
  }

  // ── Gráfico ──
  renderizarGrafico(r.composicaoCustos);

  // Scroll suave para resultados
  document.getElementById('resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =====================================================
// 8. RELATÓRIO TEXTUAL
// =====================================================
function gerarRelatorio(d, r) {
  const data = new Date().toLocaleDateString('pt-BR');
  return `
    <div class="report-line"><strong>📅 Data:</strong> ${data}</div>
    <div class="report-line"><strong>🐄 Rebanho:</strong> ${d.cabecas} cabeças, peso médio ${d.pesoMedio} kg, GMD ${d.ganhoPeso} kg/dia</div>

    <div class="report-section">📊 Diagnóstico Geral</div>
    <div class="report-line">• Score de Sustentabilidade: <strong>${r.score}/100 — Nota ${r.nota} (${r.notaDesc})</strong></div>
    <div class="report-line">• Eficiência alimentar real: ${fmt(r.eficienciaReal, 'kg ganho/kg MS', 3)}</div>
    <div class="report-line">• Desperdício alimentar diário: ${fmt(r.desperdicioKgDia, 'kg/dia')} (${d.desperdicio}%)</div>

    <div class="report-section">💰 Análise Financeira</div>
    <div class="report-line">• Custo diário total: ${brl(r.custoDiarioTotal)}</div>
    <div class="report-line">• Custo mensal total: ${brl(r.custoMensal)}</div>
    <div class="report-line">• Receita mensal estimada: ${brl(r.receitaMensalTotal)}</div>
    <div class="report-line">• Lucro mensal estimado: ${brl(r.lucroMensal)}</div>
    <div class="report-line">• Margem líquida: ${fmt(r.margem, '%', 1)}</div>
    <div class="report-line">• Lucro por arroba: ${brl(r.lucroPorArroba)}</div>

    <div class="report-section">💧 Recursos Hídricos</div>
    <div class="report-line">• Consumo total diário: ${fmt(r.aguaTotalDia, 'L/dia')}</div>
    <div class="report-line">• Perda estimada: ${fmt(r.aguaPerdaDia, 'L/dia')} (${d.perdaAgua}%)</div>
    <div class="report-line">• Custo hídrico mensal: ${brl(r.custoAguaMes)}</div>
    <div class="report-line">• Pegada hídrica anual: ${fmt(r.pegadaHidricaAnual, 'm³/ano', 0)}</div>

    <div class="report-section">🌍 Impacto Ambiental</div>
    <div class="report-line">• Emissão de metano entérico: ${fmt(r.metanoTotal, 'kg CH₄/ano', 0)}</div>
    <div class="report-line">• Equivalente CO₂: ${fmt(r.co2Equivalente / 1000, 't CO₂eq/ano')}</div>
    <div class="report-line">• Redução potencial com boas práticas: ${fmt(r.reducaoEmissao, 'kg CH₄/ano', 0)} (${r.reducaoPotencialPct}%)</div>
    <div class="report-line">• Pressão de pastejo: ${fmt(r.pressaoPastejo, '%')} da capacidade suportada</div>
    <div class="report-line">• Status do pasto: ${r.statusPasto}</div>

    <div class="report-section">🌱 Recomendações Prioritárias</div>
    <div class="report-line">${gerarRecomendacoes(d, r).map(rec => `• ${rec}`).join('<br>')}</div>

    <div class="report-section" style="margin-top:16px;font-size:0.75rem;color:var(--text-muted)">
      ⚠️ Este relatório é uma estimativa baseada em médias zootécnicas (IPCC, Embrapa). Consulte especialistas para decisões definitivas.
    </div>
  `;
}

function gerarRecomendacoes(d, r) {
  const recs = [];
  if (d.desperdicio > 10) recs.push('Reduza o desperdício alimentar com cochos adequados e fornecimento fracionado');
  if (r.pressaoPastejo > 100) recs.push('Implante rotação de pastagem com mais piquetes para aliviar pressão');
  if (d.perdaAgua > 10) recs.push('Instale bebedouros com boia flutuante para reduzir perdas hídricas');
  if (d.tratamentoResiduos === 'nenhum') recs.push('Implante biodigestor ou compostagem para aproveitar dejetos');
  if (d.praticaManejo === 'convencional') recs.push('Migre para sistema semi-intensivo ou regenerativo para reduzir emissões');
  if (d.reservaLegal < 20) recs.push('Regularize a Reserva Legal conforme o Código Florestal Brasileiro');
  if (r.eficienciaReal < 0.10 && r.eficienciaReal > 0) recs.push('Contrate nutricionista para reformular a dieta e melhorar o GMD');
  if (d.degradacaoPasto > 30) recs.push('Inicie programa de recuperação de pastagens com adubação e ressemeadura');
  if (recs.length === 0) recs.push('Ótimo desempenho! Continue monitorando os indicadores regularmente');
  return recs;
}

// =====================================================
// 9. GRÁFICO DE BARRAS PURO CSS/JS
// =====================================================
function renderizarGrafico(composicao) {
  const canvas = document.getElementById('custoChart');
  const legendEl = document.getElementById('chartLegend');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const isDark = html.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#9abfa5' : '#4a6b52';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? '#162b1e' : '#ffffff';

  const entradas = Object.entries(composicao).filter(([, v]) => v > 0);
  if (entradas.length === 0) return;

  const maxVal = Math.max(...entradas.map(([, v]) => v));
  const cores = [
    '#3d7a52', '#6aaa7e', '#8a9a50', '#d4a847', '#c9a84c',
    '#5c6b30', '#2d5a3d', '#e8c873'
  ];

  // Limpar
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  const padLeft = 60, padRight = 20, padTop = 20, padBottom = 50;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const barW = (chartW / entradas.length) * 0.65;
  const barGap = (chartW / entradas.length) * 0.35;

  // Grid
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padTop + chartH - (i / gridLines) * chartH;
    ctx.beginPath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();

    const val = (maxVal * i / gridLines);
    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('R$' + (val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)), padLeft - 4, y + 4);
  }

  // Barras
  entradas.forEach(([nome, val], i) => {
    const x = padLeft + i * (barW + barGap) + barGap / 2;
    const barH = (val / maxVal) * chartH;
    const y = padTop + chartH - barH;

    // Gradiente
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, cores[i % cores.length]);
    grad.addColorStop(1, cores[i % cores.length] + '88');

    // Barra com cantos arredondados
    const r2 = 4;
    ctx.beginPath();
    ctx.moveTo(x + r2, y);
    ctx.lineTo(x + barW - r2, y);
    ctx.arcTo(x + barW, y, x + barW, y + r2, r2);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r2);
    ctx.arcTo(x, y, x + r2, y, r2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Label nome
    ctx.fillStyle = textColor;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const nomeAbrev = nome.length > 8 ? nome.substring(0, 7) + '…' : nome;
    ctx.fillText(nomeAbrev, x + barW / 2, padTop + chartH + 16);

    // Valor em cima da barra
    if (barH > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      const valStr = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0);
      ctx.fillText(valStr, x + barW / 2, y + 14);
    }
  });

  // Legenda
  if (legendEl) {
    legendEl.innerHTML = entradas.map(([nome, val], i) =>
      `<div class="legend-item">
        <span class="legend-dot" style="background:${cores[i % cores.length]}"></span>
        <span>${nome}: ${brl(val)}</span>
      </div>`
    ).join('');
  }
}

// =====================================================
// 10. EVENTOS PRINCIPAIS
// =====================================================
document.getElementById('btnCalcular').addEventListener('click', () => {
  const d = coletarDados();

  // Validação básica
  if (d.cabecas <= 0) {
    showToast('⚠️ Informe a quantidade de cabeças no Rebanho');
    return;
  }

  const r = calcular(d);
  renderizarResultados(d, r);
  showToast('✅ Cálculo realizado com sucesso!');
});

// Limpar formulário
document.getElementById('btnLimpar').addEventListener('click', () => {
  if (!confirm('Limpar todos os campos preenchidos?')) return;
  document.querySelectorAll('input[type="number"]').forEach(el => el.value = '');
  document.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
  showToast('🗑️ Dados apagados');
});

// Salvar no LocalStorage
document.getElementById('btnSalvar').addEventListener('click', () => {
  const inputs = {};
  document.querySelectorAll('input, select').forEach(el => {
    if (el.id) inputs[el.id] = el.value;
  });
  localStorage.setItem('agroverde_dados', JSON.stringify(inputs));
  showToast('💾 Dados salvos localmente!');
});

// Exportar relatório
document.getElementById('btnExport').addEventListener('click', () => {
  const reportEl = document.getElementById('reportBody');
  if (!reportEl) return;
  const texto = reportEl.innerText || reportEl.textContent;
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio-agroverde.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📄 Relatório exportado!');
});

// =====================================================
// 11. CARREGAR DADOS SALVOS
// =====================================================
function carregarDadosSalvos() {
  const saved = localStorage.getItem('agroverde_dados');
  if (!saved) return;
  try {
    const inputs = JSON.parse(saved);
    Object.entries(inputs).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    showToast('📂 Dados anteriores carregados');
  } catch (e) {
    // ignora erros de parse
  }
}

// =====================================================
// 12. RESIZE: REDESENHAR GRÁFICO
// =====================================================
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const canvas = document.getElementById('custoChart');
    if (canvas) {
      canvas.width = canvas.parentElement.offsetWidth - 48;
    }
  }, 200);
});

// =====================================================
// 13. INICIALIZAÇÃO
// =====================================================
window.addEventListener('DOMContentLoaded', () => {
  carregarDadosSalvos();

  // Ajusta canvas ao container
  const canvas = document.getElementById('custoChart');
  if (canvas && canvas.parentElement) {
    canvas.width = canvas.parentElement.offsetWidth - 48;
  }

  // Scroll ativo no menu
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => observer.observe(s));
});
