/**
 * Adulanco 3.5 — Módulo de Gráficos e Visualização
 */

const AdulancoCharts = (() => {

  let cvChart = null;

  /**
   * Renderiza o gráfico CV × Largura de trabalho.
   */
  function renderCVChart(results) {
    const ctx = document.getElementById('chartCV');
    document.getElementById('chartCVContainer').style.display = 'block';

    if (cvChart) cvChart.destroy();

    const labels = results.map(r => r.largura.toFixed(1));
    cvChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Alternado Direito',
            data: results.map(r => r.cvAD),
            borderColor: '#c0392b',
            backgroundColor: 'rgba(192,57,43,0.1)',
            borderWidth: 2,
            pointRadius: 1,
            tension: 0.3
          },
          {
            label: 'Alternado Esquerdo',
            data: results.map(r => r.cvAE),
            borderColor: '#2980b9',
            backgroundColor: 'rgba(41,128,185,0.1)',
            borderWidth: 2,
            pointRadius: 1,
            tension: 0.3
          },
          {
            label: 'Contínuo',
            data: results.map(r => r.cvC),
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230,126,34,0.1)',
            borderWidth: 2,
            pointRadius: 1,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: 'Coeficiente de Variação (%) × Largura de Trabalho (m)',
            font: { size: 14 }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + '%';
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Largura (m)' } },
          y: { title: { display: true, text: 'CV (%)' }, min: 0 }
        }
      }
    });
  }

  /**
   * Renderiza o histograma do perfil de distribuição (peso × posição).
   */
  let histChart = null;
  function renderHistogram(medias, numColetores, tamanhoColeta, step) {
    const ctx = document.getElementById('chartHist');
    document.getElementById('chartHistContainer').style.display = 'block';
    document.getElementById('perfilEmpty').style.display = 'none';

    if (histChart) histChart.destroy();

    const labels = [];
    const data = [];
    const bgColors = [];
    const bdColors = [];
    for (let i = 1; i <= numColetores; i++) {
      labels.push((i * tamanhoColeta / 100).toFixed(1));
      data.push(medias[i] || 0);
      const real = !step || step <= 1 || ((i - 1) % step) === 0;
      bgColors.push(real ? 'rgba(74, 124, 46, 0.8)' : 'rgba(74, 124, 46, 0.3)');
      bdColors.push(real ? '#2d5016' : 'rgba(45, 80, 22, 0.4)');
    }

    histChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peso médio (g)',
          data: data,
          backgroundColor: bgColors,
          borderColor: bdColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Perfil de Distribuição — Peso por Posição (barras claras = interpolado)',
            font: { size: 14 }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Distância (m)' } },
          y: { title: { display: true, text: 'Peso (g)' }, min: 0 }
        }
      }
    });
  }

  // =====================================================================
  // VISUALIZAÇÃO CANVAS — Simulação de sobreposição (estilo Excel)
  // =====================================================================

  const COLORS = {
    profile: 'rgba(30, 80, 160, 0.75)',    // azul (perfis individuais)
    profileStroke: 'rgba(20, 60, 130, 1)',
    soil: 'rgba(140, 40, 30, 0.8)',         // vermelho/marrom (perfil no solo)
    soilStroke: 'rgba(100, 20, 10, 1)',
    tractor: '#222',
    tractorWheel: '#444',
    ground: '#8B7355',
    bg: '#ffffff'
  };

  /**
   * Desenha um trator simplificado no canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - centro X
   * @param {number} cy - centro Y (base das rodas)
   * @param {number} scale - escala
   * @param {boolean} flip - true = espelhado (indo pra esquerda)
   */
  function drawTractor(ctx, cx, cy, scale, flip) {
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);
    const s = scale;

    // Rodas traseiras (grandes)
    ctx.fillStyle = COLORS.tractor;
    ctx.beginPath();
    ctx.arc(-6*s, -2*s, 5*s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.tractorWheel;
    ctx.beginPath();
    ctx.arc(-6*s, -2*s, 3*s, 0, Math.PI * 2);
    ctx.fill();

    // Rodas dianteiras (pequenas)
    ctx.fillStyle = COLORS.tractor;
    ctx.beginPath();
    ctx.arc(8*s, -1.5*s, 3*s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.tractorWheel;
    ctx.beginPath();
    ctx.arc(8*s, -1.5*s, 1.8*s, 0, Math.PI * 2);
    ctx.fill();

    // Chassi
    ctx.fillStyle = COLORS.tractor;
    ctx.fillRect(-10*s, -9*s, 20*s, 5*s);

    // Cabine
    ctx.fillStyle = '#555';
    ctx.fillRect(-2*s, -16*s, 8*s, 7*s);
    // Janela
    ctx.fillStyle = '#9cc';
    ctx.fillRect(0*s, -15*s, 5*s, 4*s);

    // Capô
    ctx.fillStyle = COLORS.tractor;
    ctx.fillRect(-10*s, -12*s, 8*s, 3*s);

    // Escapamento
    ctx.fillStyle = '#666';
    ctx.fillRect(-9*s, -20*s, 2*s, 8*s);

    // Distribuidor (atrás)
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-14*s, -8*s, 5*s, 3*s);
    // Bocal de distribuição
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(-14*s, -5*s);
    ctx.lineTo(-16*s, -2*s);
    ctx.lineTo(-12*s, -2*s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Desenha um perfil de distribuição (área preenchida) pendurado pra baixo.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number[]} profile - valores do perfil (0-indexed, posições contínuas)
   * @param {number} startX - X do primeiro ponto
   * @param {number} baseY - Y da linha de base (topo do perfil)
   * @param {number} pxPerCol - pixels por coletor
   * @param {number} maxH - altura máxima em pixels
   * @param {number} maxVal - valor máximo para normalização
   * @param {string} fillColor
   * @param {string} strokeColor
   * @param {boolean} invertido - true = perfil vai para cima (solo)
   */
  function drawProfile(ctx, profile, startX, baseY, pxPerCol, maxH, maxVal, fillColor, strokeColor, invertido) {
    if (maxVal <= 0) return;
    const dir = invertido ? -1 : 1;

    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    for (let i = 0; i < profile.length; i++) {
      const x = startX + i * pxPerCol;
      const h = (profile[i] / maxVal) * maxH;
      ctx.lineTo(x, baseY + h * dir);
    }
    ctx.lineTo(startX + (profile.length - 1) * pxPerCol, baseY);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Renderiza a visualização do sistema ALTERNADO (3 passadas: vai, vem, vai).
   * Usa larguras diferentes: LD_dir (deslocamento da passada 2) e LD_esq (deslocamento da passada 3).
   */
  function renderAlternado(medias, NC, CC, LD_dir, LD_esq, PI, TC) {
    const canvas = document.getElementById('canvasAlternado');
    const container = document.getElementById('vizAltContainer');
    container.style.display = 'block';

    const profileH = 110;
    const soilH = 90;
    const tractorH = 45;
    const gap = 25;
    const totalSpan = NC + LD_dir + LD_esq; // passada1=0, passada2=LD_dir, passada3=LD_dir+LD_esq
    const totalWidth = Math.max(900, totalSpan * 5 + 100);
    const totalH = tractorH + profileH + gap + soilH + 50;

    canvas.width = totalWidth;
    canvas.height = totalH;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, totalWidth, totalH);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, totalWidth, totalH);

    const usableWidth = totalWidth - 80;
    const pxPerCol = usableWidth / totalSpan;
    const offsetX = 40;

    const perfil = [];
    for (let i = 1; i <= NC; i++) perfil.push(medias[i] || 0);
    const perfilInv = [...perfil].reverse();
    const maxVal = Math.max(...perfil);

    const corrPI = PI ? -1 : 0;
    const profileY = tractorH + 5;

    const passColors = [
      { fill: 'rgba(30, 80, 180, 0.55)', stroke: 'rgba(20, 60, 140, 0.8)' },
      { fill: 'rgba(180, 50, 30, 0.55)', stroke: 'rgba(140, 30, 15, 0.8)' },
      { fill: 'rgba(30, 150, 80, 0.55)', stroke: 'rgba(15, 110, 50, 0.8)' },
    ];

    // Passada 1: vai (direita), posição 0
    const p1Start = offsetX;
    const p1Center = offsetX + CC * pxPerCol;
    drawTractor(ctx, p1Center, profileY - 5, 1.3, false);
    drawProfile(ctx, perfil, p1Start, profileY, pxPerCol, profileH, maxVal, passColors[0].fill, passColors[0].stroke, false);

    // Passada 2: vem (esquerda, espelhada), deslocada LD_dir
    const p2Start = offsetX + LD_dir * pxPerCol;
    const p2Center = offsetX + (LD_dir + (NC - CC)) * pxPerCol;
    drawTractor(ctx, p2Center, profileY - 5, 1.3, true);
    drawProfile(ctx, perfilInv, p2Start + corrPI * pxPerCol, profileY, pxPerCol, profileH, maxVal, passColors[1].fill, passColors[1].stroke, false);

    // Passada 3: vai (direita), deslocada LD_dir + LD_esq
    const p3Start = offsetX + (LD_dir + LD_esq) * pxPerCol;
    const p3Center = offsetX + (LD_dir + LD_esq + CC) * pxPerCol;
    drawTractor(ctx, p3Center, profileY - 5, 1.3, false);
    drawProfile(ctx, perfil, p3Start, profileY, pxPerCol, profileH, maxVal, passColors[2].fill, passColors[2].stroke, false);

    // === Perfil no solo (soma das 3 passadas) ===
    const soilY = profileY + profileH + gap + soilH;
    const soma = new Float64Array(totalSpan + NC + 10);
    for (let i = 0; i < NC; i++) {
      soma[i] += perfil[i];                                        // passada 1
      const idx2 = LD_dir + i + corrPI;
      if (idx2 >= 0) soma[idx2] += perfilInv[i];                   // passada 2
      soma[LD_dir + LD_esq + i] += perfil[i];                      // passada 3
    }

    const soilLen = totalSpan;
    const soilProfile = [];
    for (let i = 0; i < soilLen; i++) soilProfile.push(soma[i] || 0);
    const maxSoil = Math.max(...soilProfile);

    ctx.strokeStyle = COLORS.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX, soilY);
    ctx.lineTo(offsetX + soilLen * pxPerCol, soilY);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PERFIL DE DISTRIBUIÇÃO NO SOLO', offsetX, soilY + 15);

    drawProfile(ctx, soilProfile, offsetX, soilY, pxPerCol, soilH, maxSoil, COLORS.soil, COLORS.soilStroke, true);

    // Legenda
    const legY = soilY + soilH + 30;
    const dirM = (LD_dir * TC / 100).toFixed(1);
    const esqM = (LD_esq * TC / 100).toFixed(1);
    const legs = [
      { label: '1ª passada (vai)', color: passColors[0].fill },
      { label: '2ª passada (vem) — ' + dirM + 'm', color: passColors[1].fill },
      { label: '3ª passada (vai) — ' + esqM + 'm', color: passColors[2].fill },
    ];
    let legX = offsetX;
    ctx.font = '11px sans-serif';
    for (const l of legs) {
      ctx.fillStyle = l.color;
      ctx.fillRect(legX, legY, 14, 14);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(legX, legY, 14, 14);
      ctx.fillStyle = '#333';
      ctx.fillText(l.label, legX + 18, legY + 11);
      legX += ctx.measureText(l.label).width + 40;
    }
  }

  /**
   * Renderiza a visualização do sistema CONTÍNUO (3 passadas: vai, vai, vai).
   */
  function renderContinuo(medias, NC, CC, LD, PI, TC) {
    const canvas = document.getElementById('canvasContinuo');
    const container = document.getElementById('vizContContainer');
    container.style.display = 'block';

    const profileH = 110;
    const soilH = 90;
    const tractorH = 45;
    const gap = 25;
    const totalSpan = NC + 2 * LD;
    const totalWidth = Math.max(900, totalSpan * 5 + 100);
    const totalH = tractorH + profileH + gap + soilH + 50;

    canvas.width = totalWidth;
    canvas.height = totalH;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, totalWidth, totalH);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, totalWidth, totalH);

    const usableWidth = totalWidth - 80;
    const pxPerCol = usableWidth / totalSpan;
    const offsetX = 40;

    const perfil = [];
    for (let i = 1; i <= NC; i++) perfil.push(medias[i] || 0);
    const maxVal = Math.max(...perfil);

    const profileY = tractorH + 5;

    const passColors = [
      { fill: 'rgba(30, 80, 180, 0.55)', stroke: 'rgba(20, 60, 140, 0.8)' },
      { fill: 'rgba(180, 50, 30, 0.55)', stroke: 'rgba(140, 30, 15, 0.8)' },
      { fill: 'rgba(30, 150, 80, 0.55)', stroke: 'rgba(15, 110, 50, 0.8)' },
    ];

    // 3 passadas na mesma direção, cada uma deslocada LD
    for (let p = 0; p < 3; p++) {
      const pStart = offsetX + p * LD * pxPerCol;
      const pCenter = offsetX + (p * LD + CC) * pxPerCol;
      drawTractor(ctx, pCenter, profileY - 5, 1.3, false);
      drawProfile(ctx, perfil, pStart, profileY, pxPerCol, profileH, maxVal, passColors[p].fill, passColors[p].stroke, false);
    }

    // === Perfil no solo ===
    const soilY = profileY + profileH + gap + soilH;
    const soma = new Float64Array(totalSpan + 10);
    for (let i = 0; i < NC; i++) {
      soma[i] += perfil[i];
      soma[LD + i] += perfil[i];
      soma[2 * LD + i] += perfil[i];
    }

    const soilProfile = [];
    for (let i = 0; i < totalSpan; i++) soilProfile.push(soma[i] || 0);
    const maxSoil = Math.max(...soilProfile);

    ctx.strokeStyle = COLORS.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX, soilY);
    ctx.lineTo(offsetX + totalSpan * pxPerCol, soilY);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PERFIL DE DISTRIBUIÇÃO NO SOLO', offsetX, soilY + 15);

    drawProfile(ctx, soilProfile, offsetX, soilY, pxPerCol, soilH, maxSoil, COLORS.soil, COLORS.soilStroke, true);

    // Legenda
    const legY = soilY + soilH + 30;
    const legs = [
      { label: '1ª passada', color: passColors[0].fill },
      { label: '2ª passada', color: passColors[1].fill },
      { label: '3ª passada', color: passColors[2].fill },
    ];
    let legX = offsetX;
    ctx.font = '11px sans-serif';
    for (const l of legs) {
      ctx.fillStyle = l.color;
      ctx.fillRect(legX, legY, 14, 14);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(legX, legY, 14, 14);
      ctx.fillStyle = '#333';
      ctx.fillText(l.label, legX + 18, legY + 11);
      legX += ctx.measureText(l.label).width + 40;
    }
  }

  return {
    renderCVChart,
    renderHistogram,
    renderAlternado,
    renderContinuo
  };

})();
