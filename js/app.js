/**
 * Adulanco 3.5 — Lógica Principal de UI
 */

(() => {
  // Estado global
  let state = {
    // Parâmetros de entrada (novos)
    coletoresReais: 0,
    larguraBandeja: 0,    // cm
    espacamento: 0,       // cm (vão entre bandejas)
    numRepeticoes: 0,
    numPassadas: 0,
    coletorCentralReal: 0, // índice do coletor central (1-indexed, dos reais)
    parImpar: false,

    // Calculados
    step: 0,              // posições entre coletores reais
    numColetores: 0,      // total de posições (incluindo interpoladas)
    tamanhoColeta: 0,     // = larguraBandeja (resolução em cm)
    coletorCentral: 0,    // posição central no array total

    // Metadados
    produto: '',
    fornecedor: '',

    data: [],             // [rep][coletor_real] (0-indexed, só reais)
    medias: [],           // 1-indexed (array total expandido)
    totais: [],           // 1-indexed (array total expandido)
    results: null
  };

  // === Tabs ===
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // === Parâmetros ===
  function getParams() {
    const coletoresReais = parseInt(document.getElementById('coletoresReais').value) || 0;
    const larguraBandeja = parseInt(document.getElementById('larguraBandeja').value) || 0;
    const espacamento = parseInt(document.getElementById('espacamento').value) || 0;
    const numRepeticoes = parseInt(document.getElementById('numRepeticoes').value) || 0;
    const numPassadas = parseInt(document.getElementById('numPassadas').value) || 0;
    const coletorCentralReal = parseInt(document.getElementById('coletorCentral').value) || 0;
    const parImpar = document.querySelector('input[name="parImpar"]:checked').value === 'par';

    // Calcula posições totais
    const step = larguraBandeja > 0 ? (espacamento / larguraBandeja) + 1 : 1;
    const numColetores = (coletoresReais - 1) * step + 1;
    const coletorCentral = (coletorCentralReal - 1) * step + 1;

    return {
      coletoresReais, larguraBandeja, espacamento,
      numRepeticoes, numPassadas, coletorCentralReal, parImpar,
      step, numColetores, tamanhoColeta: larguraBandeja, coletorCentral
    };
  }

  // === Criar Tabela ===
  document.getElementById('btnCriarTabela').addEventListener('click', () => {
    const p = getParams();
    if (p.coletoresReais < 3 || p.numRepeticoes < 1 || p.numPassadas < 1 ||
        p.larguraBandeja < 1 || p.coletorCentralReal < 1 || p.coletorCentralReal > p.coletoresReais) {
      alert('Verifique os parâmetros. Todos devem ser preenchidos corretamente.');
      return;
    }
    if (p.step !== Math.floor(p.step)) {
      alert('O espaçamento deve ser múltiplo da largura da bandeja.');
      return;
    }

    Object.assign(state, p);
    state.produto = document.getElementById('produto').value.trim();
    state.fornecedor = document.getElementById('fornecedor').value.trim();
    state.data = [];
    for (let r = 0; r < p.numRepeticoes; r++) {
      state.data.push(new Array(p.coletoresReais).fill(0));
    }

    // Mostra info calculada
    const infoEl = document.getElementById('infoCalculado');
    infoEl.style.display = 'block';
    infoEl.textContent = `Total: ${p.numColetores} posições (${p.coletoresReais} reais + ${p.numColetores - p.coletoresReais} interpoladas) | ` +
      `Coletor central = posição ${p.coletorCentral} | Step = ${p.step} | ` +
      `Faixa total = ${((p.numColetores * p.larguraBandeja) / 100).toFixed(1)} m`;

    renderDataTable();
    document.getElementById('btnsDados').style.display = 'flex';
    document.querySelector('[data-tab="dados"]').click();
  });

  // === Renderizar Tabela de Entrada (só coletores reais) ===
  function renderDataTable() {
    const { coletoresReais: NR_real, numRepeticoes: NRep, coletorCentralReal: CCR } = state;

    let html = '<table><thead><tr><th>Bandeja</th>';
    for (let r = 1; r <= NRep; r++) {
      html += `<th>Rep. ${r}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let c = 0; c < NR_real; c++) {
      const isCentral = (c + 1) === CCR;
      const rowClass = isCentral ? ' class="col-central"' : '';
      html += '<tr>';
      html += `<td class="col-label"${isCentral ? ' style="background:#fff3cd"' : ''}>Bandeja ${c + 1}</td>`;
      for (let r = 0; r < NRep; r++) {
        const val = state.data[r][c];
        html += `<td${rowClass}><input type="number" step="any" data-r="${r}" data-c="${c}" value="${val || ''}"></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    document.getElementById('tabelaDadosContainer').innerHTML = html;

    // Bind input events
    document.getElementById('tabelaDadosContainer').querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('change', onDataInput);
      input.addEventListener('input', onDataInput);
    });
  }

  function onDataInput(e) {
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    state.data[r][c] = parseFloat(e.target.value) || 0;
  }

  /**
   * Expande dados dos coletores reais para o array total (com zeros nos interpolados),
   * depois interpola linearmente.
   * Retorna array 2D [rep][posição_total] (0-indexed).
   */
  function expandAndInterpolate() {
    const { coletoresReais, numColetores, step, numRepeticoes } = state;
    const expanded = [];

    for (let r = 0; r < numRepeticoes; r++) {
      const row = new Array(numColetores).fill(0);
      for (let c = 0; c < coletoresReais; c++) {
        row[c * step] = state.data[r][c]; // posiciona nas posições reais
      }
      expanded.push(row);
    }

    // Interpola zeros entre valores reais
    return AdulancoEngine.interpolate(expanded, numColetores, numRepeticoes);
  }

  // === Calcular Distribuição ===
  document.getElementById('btnCalcular').addEventListener('click', () => {
    const expandedData = expandAndInterpolate();
    const { totais, medias } = AdulancoEngine.calcTotaisMedias(
      expandedData, state.numColetores, state.numRepeticoes, state.numPassadas
    );
    state.totais = totais;
    state.medias = medias;

    const results = AdulancoEngine.calculateAll({
      numColetores: state.numColetores,
      numRepeticoes: state.numRepeticoes,
      numPassadas: state.numPassadas,
      coletorCentral: state.coletorCentral,
      tamanhoColeta: state.tamanhoColeta,
      parImpar: state.parImpar,
      medias: state.medias
    });

    state.results = results;

    const optima = AdulancoEngine.findOptimalWidths(results);

    renderResultsTable(results);
    renderOptimalWidths(optima);
    AdulancoCharts.renderCVChart(results);
    AdulancoCharts.renderHistogram(state.medias, state.numColetores, state.tamanhoColeta, state.step);

    if (optima.altDir.length > 0) {
      document.getElementById('larguraSimularAltDir').value = optima.altDir[0].toFixed(1);
    }
    if (optima.altEsq.length > 0) {
      document.getElementById('larguraSimularAltEsq').value = optima.altEsq[0].toFixed(1);
    }
    if (optima.continuo.length > 0) {
      document.getElementById('larguraSimularCont').value = optima.continuo[0].toFixed(1);
    }

    document.querySelector('[data-tab="resultados"]').click();
  });

  /** Verifica se a posição (1-indexed) é um coletor real */
  function isReal(pos) {
    return state.step <= 1 || ((pos - 1) % state.step) === 0;
  }

  // === Renderizar Tabela de Resultados ===
  function renderResultsTable(results) {
    let html = '<table class="results-table"><thead><tr>';
    html += '<th>Coletor</th><th>Largura (m)</th>';
    html += '<th>CV Alt. Dir. (%)</th><th>CV Alt. Esq. (%)</th><th>CV Contínuo (%)</th>';
    html += '<th>Peso (g)</th></tr></thead><tbody>';

    for (const r of results) {
      const cls = isReal(r.coletor) ? ' class="row-real"' : ' class="row-interp"';
      html += `<tr${cls}>`;
      html += `<td>${r.coletor}${isReal(r.coletor) ? '' : ' *'}</td>`;
      html += `<td>${r.largura.toFixed(1)}</td>`;
      html += `<td>${r.cvAD.toFixed(2)}</td>`;
      html += `<td>${r.cvAE.toFixed(2)}</td>`;
      html += `<td>${r.cvC.toFixed(2)}</td>`;
      html += `<td>${r.peso.toFixed(4)}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    html += '<p style="font-size:0.8rem;color:#888;margin-top:0.5rem">* = posição interpolada</p>';

    document.getElementById('tabelaResultadosContainer').innerHTML = html;
  }

  // === Renderizar Larguras Ótimas ===
  function renderOptimalWidths(optima) {
    document.getElementById('optimalWidths').style.display = 'grid';

    const render = (elId, values) => {
      const el = document.getElementById(elId);
      if (values.length === 0) {
        el.innerHTML = '<span style="color:#999">Não encontrado</span>';
      } else {
        el.innerHTML = values.map((v, i) =>
          `<span class="value-tag">${i + 1}ª: ${v.toFixed(1)} m</span>`
        ).join('');
      }
    };

    render('optAltDir', optima.altDir);
    render('optAltEsq', optima.altEsq);
    render('optContinuo', optima.continuo);
  }

  // === Simular Visualização ===
  document.getElementById('btnSimular').addEventListener('click', () => {
    if (!state.medias.length) {
      alert('Calcule a distribuição primeiro.');
      return;
    }

    const ldAltDirM = parseFloat(document.getElementById('larguraSimularAltDir').value);
    const ldAltEsqM = parseFloat(document.getElementById('larguraSimularAltEsq').value);
    const ldContM = parseFloat(document.getElementById('larguraSimularCont').value);
    const ldAltDir = Math.round(ldAltDirM * 100 / state.tamanhoColeta);
    const ldAltEsq = Math.round(ldAltEsqM * 100 / state.tamanhoColeta);
    const ldCont = Math.round(ldContM * 100 / state.tamanhoColeta);

    if (ldAltDir < 1 || ldAltDir > state.numColetores ||
        ldAltEsq < 1 || ldAltEsq > state.numColetores ||
        ldCont < 1 || ldCont > state.numColetores) {
      alert('Largura fora do intervalo válido.');
      return;
    }

    AdulancoCharts.renderAlternado(
      state.medias, state.numColetores, state.coletorCentral,
      ldAltDir, ldAltEsq, state.parImpar, state.tamanhoColeta
    );
    AdulancoCharts.renderContinuo(
      state.medias, state.numColetores, state.coletorCentral,
      ldCont, state.parImpar, state.tamanhoColeta
    );
  });

  // === Carregar Exemplo ===
  document.getElementById('btnCarregarExemplo').addEventListener('click', () => {
    // 13 coletores reais da planilha (posições 1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61)
    const exemploReais = [0, 7, 8, 4.2, 6.1, 2.7, 10.3, 4.9, 5.8, 2.8, 1.0, 1.0, 0];

    // Configura parâmetros
    document.getElementById('coletoresReais').value = 13;
    document.getElementById('larguraBandeja').value = 50;
    document.getElementById('espacamento').value = 200;
    document.getElementById('numRepeticoes').value = 1;
    document.getElementById('numPassadas').value = 3;
    document.getElementById('coletorCentral').value = 7;
    document.querySelector('input[name="parImpar"][value="impar"]').checked = true;

    // Simula click em "Criar Tabela" para calcular state
    state.coletoresReais = 13;
    state.larguraBandeja = 50;
    state.espacamento = 200;
    state.numRepeticoes = 1;
    state.numPassadas = 3;
    state.coletorCentralReal = 7;
    state.parImpar = false;
    state.step = 5;
    state.numColetores = 61;
    state.tamanhoColeta = 50;
    state.coletorCentral = 31;
    state.data = [exemploReais.slice()];

    // Mostra info
    const infoEl = document.getElementById('infoCalculado');
    infoEl.style.display = 'block';
    infoEl.textContent = 'Total: 61 posições (13 reais + 48 interpoladas) | Coletor central = posição 31 | Step = 5 | Faixa total = 30.5 m';

    renderDataTable();
    document.getElementById('btnsDados').style.display = 'flex';

    // Preenche inputs com dados
    const container = document.getElementById('tabelaDadosContainer');
    container.querySelectorAll('input[type="number"]').forEach(input => {
      const r = parseInt(input.dataset.r);
      const c = parseInt(input.dataset.c);
      const val = state.data[r][c];
      input.value = val || '';
    });
  });

  // === Gerar Relatório PDF ===
  document.getElementById('btnRelatorio').addEventListener('click', () => {
    AdulancoReport.generate(state);
  });

  // === Nova Medição (reset) ===
  document.getElementById('btnNovaMedicao').addEventListener('click', () => {
    if (state.data.length > 0 && !confirm('Deseja iniciar uma nova medição? Os dados e resultados serão limpos.')) return;

    // Limpa dados e resultados, mantém parâmetros do ensaio
    state.produto = '';
    state.fornecedor = '';
    state.data = [];
    state.medias = [];
    state.totais = [];
    state.results = null;

    // Limpa campos de identificação
    document.getElementById('produto').value = '';
    document.getElementById('fornecedor').value = '';

    // Recria tabela de entrada zerada (se os parâmetros existem)
    if (state.coletoresReais > 0) {
      for (let r = 0; r < state.numRepeticoes; r++) {
        state.data.push(new Array(state.coletoresReais).fill(0));
      }
      renderDataTable();
    }

    // Limpa resultados e gráficos
    document.getElementById('tabelaResultadosContainer').innerHTML = '<p class="msg-empty">Insira os dados e clique em "Calcular Distribuição".</p>';
    document.getElementById('optimalWidths').style.display = 'none';
    document.getElementById('chartCVContainer').style.display = 'none';
    document.getElementById('chartHistContainer').style.display = 'none';
    document.getElementById('perfilEmpty').style.display = '';
    document.getElementById('vizAltContainer').style.display = 'none';
    document.getElementById('vizContContainer').style.display = 'none';

    // Volta pra aba de dados (parâmetros já estão ok)
    document.querySelector('[data-tab="dados"]').click();
  });

})();
