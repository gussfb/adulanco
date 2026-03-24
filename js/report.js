/**
 * Adulanco 3.5 — Geração de Relatório PDF
 * Abre uma janela formatada para impressão/PDF via window.print()
 */

const AdulancoReport = (() => {

  function generate(state) {
    if (!state.results || !state.medias.length) {
      alert('Calcule a distribuição primeiro antes de gerar o relatório.');
      return;
    }

    const optima = AdulancoEngine.findOptimalWidths(state.results);

    // Captura os canvas como imagens
    const chartCVImg = captureCanvas('chartCV');
    const chartHistImg = captureCanvas('chartHist');
    const canvasAltImg = captureCanvas('canvasAlternado');
    const canvasContImg = captureCanvas('canvasContinuo');

    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Adulanco 3.5</title>
<style>
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    color: #222;
    line-height: 1.4;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #2d5016;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .header h1 { font-size: 20px; color: #2d5016; }
  .header .sub { font-size: 10px; color: #666; }
  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .section h2 {
    font-size: 13px;
    color: #2d5016;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 6px;
  }
  .params-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .params-table td {
    padding: 3px 8px;
    border: 1px solid #ddd;
    font-size: 11px;
  }
  .params-table td:first-child {
    font-weight: 600;
    background: #f0f7e8;
    width: 40%;
  }
  .optimal-grid { display: flex; gap: 12px; margin-bottom: 8px; }
  .optimal-box {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
  }
  .optimal-box h3 { font-size: 10px; color: #666; margin-bottom: 4px; }
  .optimal-box .vals { font-size: 12px; font-weight: 700; }
  .optimal-box.ad { border-left: 3px solid #c0392b; }
  .optimal-box.ad .vals { color: #c0392b; }
  .optimal-box.ae { border-left: 3px solid #2980b9; }
  .optimal-box.ae .vals { color: #2980b9; }
  .optimal-box.ct { border-left: 3px solid #e67e22; }
  .optimal-box.ct .vals { color: #e67e22; }
  .chart-img { width: 100%; max-height: 280px; object-fit: contain; }
  .chart-img.wide { max-height: 180px; }
  table.results {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  table.results th {
    background: #2d5016;
    color: white;
    padding: 3px 4px;
    text-align: center;
    font-size: 9px;
  }
  table.results td {
    padding: 2px 4px;
    border: 1px solid #ddd;
    text-align: center;
  }
  table.results tr:nth-child(even) { background: #f5f5f5; }
  .footer {
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1px solid #ccc;
    font-size: 9px;
    color: #999;
    text-align: center;
  }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<div class="header">
  <h1>Adulanco 3.5 — Relatório de Distribuição</h1>
  <div class="sub">Gerado em ${dataStr}</div>
</div>

<div class="section">
  <h2>Parâmetros do Ensaio</h2>
  <table class="params-table">
    ${state.produto ? `<tr><td>Produto</td><td>${state.produto}</td></tr>` : ''}
    ${state.fornecedor ? `<tr><td>Fornecedor</td><td>${state.fornecedor}</td></tr>` : ''}
    <tr><td>Nº de bandejas (reais)</td><td>${state.coletoresReais}</td></tr>
    <tr><td>Largura da bandeja</td><td>${state.larguraBandeja} cm</td></tr>
    <tr><td>Espaçamento entre bandejas</td><td>${state.espacamento} cm</td></tr>
    <tr><td>Total de posições (interpoladas)</td><td>${state.numColetores}</td></tr>
    <tr><td>Nº de repetições</td><td>${state.numRepeticoes}</td></tr>
    <tr><td>Nº de passadas</td><td>${state.numPassadas}</td></tr>
    <tr><td>Bandeja central</td><td>${state.coletorCentralReal} (posição ${state.coletorCentral})</td></tr>
    <tr><td>Coletores centrais</td><td>${state.parImpar ? 'Par' : 'Ímpar'}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Sugestões de Largura Ótima</h2>
  <div class="optimal-grid">
    <div class="optimal-box ad">
      <h3>Alternado Direito</h3>
      <div class="vals">${formatOptima(optima.altDir)}</div>
    </div>
    <div class="optimal-box ae">
      <h3>Alternado Esquerdo</h3>
      <div class="vals">${formatOptima(optima.altEsq)}</div>
    </div>
    <div class="optimal-box ct">
      <h3>Contínuo</h3>
      <div class="vals">${formatOptima(optima.continuo)}</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Gráfico CV × Largura de Trabalho</h2>
  ${chartCVImg ? `<img class="chart-img" src="${chartCVImg}">` : '<p>Não disponível</p>'}
</div>

<div class="section">
  <h2>Perfil de Distribuição</h2>
  ${chartHistImg ? `<img class="chart-img" src="${chartHistImg}">` : '<p>Não disponível</p>'}
</div>

${(canvasAltImg || canvasContImg) ? `
<div class="page-break"></div>

${canvasAltImg ? `
<div class="section">
  <h2>Simulação — Sistema Alternado</h2>
  <img class="chart-img wide" src="${canvasAltImg}">
</div>` : ''}

${canvasContImg ? `
<div class="section">
  <h2>Simulação — Sistema Contínuo</h2>
  <img class="chart-img wide" src="${canvasContImg}">
</div>` : ''}
` : ''}

<div class="page-break"></div>
<div class="section">
  <h2>Tabela de Resultados — CV (%)</h2>
  ${buildResultsTable(state.results)}
</div>

<div class="footer">
  Adulanco 3.5 — Simulador de faixa de aplicação de fertilizante sólido
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  }

  function captureCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas || !canvas.getContext) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch(e) {
      return null;
    }
  }

  function formatOptima(values) {
    if (!values || values.length === 0) return '—';
    return values.map((v, i) => `${i + 1}ª: ${v.toFixed(1)} m`).join(' &nbsp;|&nbsp; ');
  }

  function buildResultsTable(results) {
    let html = '<table class="results"><thead><tr>';
    html += '<th>Col.</th><th>Largura (m)</th>';
    html += '<th>CV Alt.Dir. (%)</th><th>CV Alt.Esq. (%)</th><th>CV Cont. (%)</th>';
    html += '<th>Peso (g)</th></tr></thead><tbody>';
    for (const r of results) {
      html += `<tr>`;
      html += `<td>${r.coletor}</td>`;
      html += `<td>${r.largura.toFixed(1)}</td>`;
      html += `<td>${r.cvAD.toFixed(2)}</td>`;
      html += `<td>${r.cvAE.toFixed(2)}</td>`;
      html += `<td>${r.cvC.toFixed(2)}</td>`;
      html += `<td>${r.peso.toFixed(4)}</td>`;
      html += `</tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  return { generate };

})();
